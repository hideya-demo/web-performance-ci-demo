#!/usr/bin/env bash
set -euo pipefail

URL="${1:-http://127.0.0.1:8000}"
OUT_DIR="${2:-./results}"
RUNS="${3:-5}"

mkdir -p "$OUT_DIR"
rm -f "$OUT_DIR"/lighthouse-*.json

for i in $(seq 1 "$RUNS"); do
  echo "===== Lighthouse run $i/$RUNS ====="

  CHROME_PATH=/usr/bin/google-chrome \
  npx lighthouse "$URL" \
    --output=json \
    --output-path="$OUT_DIR/lighthouse-$i.json" \
    --chrome-flags="--headless --no-sandbox" \
    --no-enable-error-reporting \
    --quiet
done

node - "$OUT_DIR" "$RUNS" <<'NODE'
const fs = require('fs');

const dir = process.argv[2];
const runs = Number(process.argv[3]);

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2) {
    return sorted[middle];
  }

  return (sorted[middle - 1] + sorted[middle]) / 2;
}

const results = [];

for (let i = 1; i <= runs; i++) {
  const report = JSON.parse(
    fs.readFileSync(`${dir}/lighthouse-${i}.json`, 'utf8')
  );

  results.push({
    performance: report.categories.performance.score * 100,
    fcp: report.audits['first-contentful-paint'].numericValue,
    lcp: report.audits['largest-contentful-paint'].numericValue,
    speedIndex: report.audits['speed-index'].numericValue,
    tbt: report.audits['total-blocking-time'].numericValue,
    cls: report.audits['cumulative-layout-shift'].numericValue,
    ttfb: report.audits['server-response-time']?.numericValue ?? null
  });
}

const summary = {
  performance: median(results.map(r => r.performance)),
  fcp: median(results.map(r => r.fcp)),
  lcp: median(results.map(r => r.lcp)),
  speedIndex: median(results.map(r => r.speedIndex)),
  tbt: median(results.map(r => r.tbt)),
  cls: median(results.map(r => r.cls)),
  ttfb: median(results.map(r => r.ttfb).filter(v => v !== null))
};

fs.writeFileSync(
  `${dir}/summary.json`,
  JSON.stringify(summary, null, 2)
);

console.log('');
console.log('===== Median of runs =====');
console.log(`Performance : ${summary.performance.toFixed(0)}`);
console.log(`FCP         : ${summary.fcp.toFixed(0)} ms`);
console.log(`LCP         : ${summary.lcp.toFixed(0)} ms`);
console.log(`Speed Index : ${summary.speedIndex.toFixed(0)} ms`);
console.log(`TBT         : ${summary.tbt.toFixed(0)} ms`);
console.log(`CLS         : ${summary.cls.toFixed(3)}`);
console.log(`TTFB        : ${summary.ttfb.toFixed(0)} ms`);
NODE
