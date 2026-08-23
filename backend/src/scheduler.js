import { runCollector, healCollector } from './cli/bdata.js';
import { normalizeResults, upsertProducts, insertHealthEvent, getProducts } from './db/index.js';
import { validate } from './validate/index.js';

// ── helpers ────────────────────────────────────────────────────────────────

function previousCount(collectorId) {
  // getProducts already filters by collector_id when one is passed
  return getProducts(collectorId).length;
}

// Tracks collectors with a run currently in progress to prevent overlapping runs
const activeCollectors = new Set();

// ── monitorCollector ───────────────────────────────────────────────────────

export async function monitorCollector(collectorId, url) {
  if (activeCollectors.has(collectorId)) {
    console.log('skipping run for ' + collectorId + ', already in progress');
    return { status: 'skipped' };
  }
  activeCollectors.add(collectorId);

  try {

  // ── Step 1: initial run ──────────────────────────────────────────────────
  let rawResult;
  try {
    rawResult = await runCollector(collectorId, url);
  } catch (runErr) {
    insertHealthEvent(collectorId, 'detected', 'run failed: ' + runErr.message);

    // One heal attempt after run failure
    const healResult = await healCollector(
      collectorId,
      'the scraper run failed to return data, the page structure may have changed',
    );
    insertHealthEvent(collectorId, 'healing', 'attempting recovery after run failure');

    try {
      rawResult = await runCollector(collectorId, url);
    } catch (runErr2) {
      insertHealthEvent(
        collectorId,
        'escalated',
        'run still failing after heal attempt: ' + runErr2.message,
      );
      return { status: 'escalated' };
    }
  }

  // ── Step 2: normalise ────────────────────────────────────────────────────
  const products = normalizeResults(rawResult, collectorId);

  // ── Step 3: previous count ───────────────────────────────────────────────
  const prevCount = previousCount(collectorId);

  // ── Step 4: validate ─────────────────────────────────────────────────────
  const result = validate(products, prevCount);

  // ── Step 5: healthy path ─────────────────────────────────────────────────
  if (result.healthy) {
    upsertProducts(products);
    insertHealthEvent(collectorId, 'healthy', 'collected ' + products.length + ' products');
    return { status: 'healthy', count: products.length };
  }

  // ── Step 6: unhealthy path ───────────────────────────────────────────────
  insertHealthEvent(collectorId, 'detected', result.reason);

  const healResult = await healCollector(
    collectorId,
    'validation failed: ' + result.reason +
      ' — the page structure may have changed, please re-check the extraction logic',
  );

  if (!healResult.success) {
    insertHealthEvent(collectorId, 'escalated', 'heal failed: ' + healResult.output);
    return { status: 'escalated' };
  }

  // Heal succeeded — re-run to verify
  insertHealthEvent(collectorId, 'healing', 'heal succeeded, re-running to verify');

  let rawResult2;
  try {
    rawResult2 = await runCollector(collectorId, url);
  } catch (runErr3) {
    insertHealthEvent(
      collectorId,
      'escalated',
      'run still failing after heal attempt: ' + runErr3.message,
    );
    return { status: 'escalated' };
  }

  const products2 = normalizeResults(rawResult2, collectorId);
  const result2   = validate(products2, prevCount);

  if (result2.healthy) {
    upsertProducts(products2);
    insertHealthEvent(collectorId, 'verified',  'post-heal run passed validation');
    insertHealthEvent(collectorId, 'recovered', 'collector fully recovered, ' + products2.length + ' products');
    return { status: 'recovered', count: products2.length };
  }

  insertHealthEvent(collectorId, 'escalated', 'still unhealthy after heal: ' + result2.reason);
  return { status: 'escalated' };

  } finally {
    activeCollectors.delete(collectorId);
  }
}

// ── runAllMonitors ─────────────────────────────────────────────────────────

export async function runAllMonitors() {
  const danube = monitorCollector(
    process.env.DANUBE_COLLECTOR_ID,
    process.env.DANUBE_URL,
  );
  const mock = monitorCollector(
    process.env.MOCK_COLLECTOR_ID,
    process.env.MOCK_URL,
  );

  // Run both concurrently; collect results even if one fails
  return Promise.all([danube, mock]);
}
