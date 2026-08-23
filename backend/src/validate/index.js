/**
 * Validates a flat array of normalised product objects from a scraper run.
 *
 * @param {Array}  products      - Output of normalizeResults()
 * @param {number} previousCount - Record count from the last healthy run (0 if none)
 * @returns {{ healthy: boolean, reason?: string }}
 */
export function validate(products, previousCount) {
  // 1. Empty result
  if (products.length === 0) {
    return { healthy: false, reason: 'zero products extracted' };
  }

  // 2. High null-field rate
  const nullCount = products.filter(p =>
    !p.title || p.current_price == null
  ).length;
  const nullPct = (nullCount / products.length) * 100;
  if (nullPct > 30) {
    return {
      healthy: false,
      reason: `high null-field rate: ${Math.round(nullPct)}% of products missing title or price`,
    };
  }

  // 3. Sharp row-count drop vs previous run
  if (previousCount > 0 && products.length < previousCount * 0.5) {
    return {
      healthy: false,
      reason: `row count dropped sharply: ${products.length} vs previous ${previousCount}`,
    };
  }

  return { healthy: true };
}
