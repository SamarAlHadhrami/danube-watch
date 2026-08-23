import { exec } from 'node:child_process';

const TIMEOUT_MS = 600_000; // 10 minutes — accommodates batch-mode runs

// ── helpers ────────────────────────────────────────────────────────────────

function extractJson(stdout) {
  // The CLI emits status/polling lines before the JSON array.
  // Find the first '[' and attempt to parse from there to the end.
  const start = stdout.indexOf('[');
  if (start === -1) throw new Error('No JSON array found in output');
  const candidate = stdout.slice(start).trim();
  return JSON.parse(candidate); // throws SyntaxError if malformed
}

function shell(command) {
  return new Promise((resolve, reject) => {
    exec(command, { timeout: TIMEOUT_MS, maxBuffer: 50 * 1024 * 1024 }, (err, stdout, stderr) => {
      resolve({ err, stdout: stdout ?? '', stderr: stderr ?? '' });
    });
  });
}

// ── runCollector ───────────────────────────────────────────────────────────
// Runs `bdata scraper run` and returns the parsed JSON array of results.

export async function runCollector(collectorId, url) {
  const cmd = `npx -p @brightdata/cli bdata scraper run ${collectorId} "${url}" --pretty`;
  console.log(`[bdata] runCollector started  ${new Date().toISOString()}`);
  console.log(`[bdata] command: ${cmd}`);

  const { err, stdout, stderr } = await shell(cmd);

  if (err) {
    const reason = err.killed || err.signal === 'SIGTERM'
      ? `timed out after ${TIMEOUT_MS / 1000}s`
      : `command failed (exit ${err.code}): ${stderr || err.message}`;
    console.error(`[bdata] runCollector failed: ${reason}`);
    throw new Error(`runCollector failed — ${reason}`);
  }

  let parsed;
  try {
    parsed = extractJson(stdout);
  } catch (parseErr) {
    const reason = `JSON parse error: ${parseErr.message}`;
    console.error(`[bdata] runCollector failed: ${reason}`);
    console.error('[bdata] raw stdout tail:', stdout.slice(-500));
    throw new Error(`runCollector failed — ${reason}`);
  }

  console.log(`[bdata] runCollector success  ${new Date().toISOString()} — ${parsed.length} record(s)`);
  return parsed;
}

// ── healCollector ──────────────────────────────────────────────────────────
// Runs `bdata scraper heal` and returns { success, output }.
// A non-zero exit is treated as a valid (expected) outcome, not a thrown error.

export async function healCollector(collectorId, description) {
  const cmd = `npx -p @brightdata/cli bdata scraper heal ${collectorId} "${description}" --auto-approve --auto-save`;
  console.log(`[bdata] healCollector started  ${new Date().toISOString()}`);
  console.log(`[bdata] command: ${cmd}`);

  const { err, stdout, stderr } = await shell(cmd);

  const output = stdout || stderr || err?.message || '';

  if (err && !(err.code !== 0)) {
    // Timed-out heals are also treated as failures, not thrown
    const timedOut = err.killed || err.signal === 'SIGTERM';
    if (timedOut) {
      console.warn(`[bdata] healCollector timed out after ${TIMEOUT_MS / 1000}s`);
      return { success: false, output: `timed out after ${TIMEOUT_MS / 1000}s\n${output}` };
    }
  }

  const success = !err || err.code === 0;
  console.log(`[bdata] healCollector ${success ? 'success' : 'failed'}  ${new Date().toISOString()}`);
  return { success, output };
}
