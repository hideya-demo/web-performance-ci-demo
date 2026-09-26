const fs = require("fs");

const summary = JSON.parse(
  fs.readFileSync("./results/summary.json", "utf8")
);

console.log("## Lighthouse Performance");
console.log("");
console.log("5回測定した中央値です。");
console.log("");
console.log("| Metric | Median |");
console.log("|---|---:|");
console.log(`| Performance | ${Math.round(summary.performance)} / 100 |`);
console.log(`| FCP | ${Math.round(summary.fcp)} ms |`);
console.log(`| LCP | ${Math.round(summary.lcp)} ms |`);
console.log(`| Speed Index | ${Math.round(summary.speedIndex)} ms |`);
console.log(`| TBT | ${Math.round(summary.tbt)} ms |`);
console.log(`| CLS | ${summary.cls.toFixed(3)} |`);
console.log(`| TTFB | ${Math.round(summary.ttfb)} ms |`);
