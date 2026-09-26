const fs = require("fs");

const [baselinePath, candidatePath] = process.argv.slice(2);

if (!baselinePath || !candidatePath) {
  console.error(
    "Usage: node compare.js baseline.json candidate.json"
  );
  process.exit(1);
}

const baseline = JSON.parse(
  fs.readFileSync(baselinePath, "utf8")
);

const candidate = JSON.parse(
  fs.readFileSync(candidatePath, "utf8")
);

// Performance Budget
const LCP_BUDGET_PERCENT =
  Number(process.env.LCP_BUDGET_PERCENT ?? 20);

function percentChange(before, after) {
  if (before === 0) {
    return null;
  }

  return ((after - before) / before) * 100;
}

function formatChange(before, after, lowerIsBetter = true) {
  const diff = after - before;

  if (before === 0) {
    if (diff === 0) {
      return "0";
    }

    return `${diff > 0 ? "+" : ""}${diff.toFixed(0)}`;
  }

  const percent = percentChange(before, after);

  if (Math.abs(percent) < 0.1) {
    return "0.0%";
  }

  let icon;

  if (lowerIsBetter) {
    icon = percent > 0 ? "🔴" : "🟢";
  } else {
    icon = percent > 0 ? "🟢" : "🔴";
  }

  return `${icon} ${percent > 0 ? "+" : ""}${percent.toFixed(1)}%`;
}

console.log("## Lighthouse Performance Comparison");
console.log("");
console.log("各バージョンを5回測定した中央値です。");
console.log("");
console.log("| Metric | main | PR | Change |");
console.log("|---|---:|---:|---:|");

console.log(
  `| Performance | ${baseline.performance.toFixed(0)} | ${candidate.performance.toFixed(0)} | ${formatChange(baseline.performance, candidate.performance, false)} |`
);

console.log(
  `| FCP | ${baseline.fcp.toFixed(0)} ms | ${candidate.fcp.toFixed(0)} ms | ${formatChange(baseline.fcp, candidate.fcp)} |`
);

console.log(
  `| LCP | ${baseline.lcp.toFixed(0)} ms | ${candidate.lcp.toFixed(0)} ms | ${formatChange(baseline.lcp, candidate.lcp)} |`
);

console.log(
  `| Speed Index | ${baseline.speedIndex.toFixed(0)} ms | ${candidate.speedIndex.toFixed(0)} ms | ${formatChange(baseline.speedIndex, candidate.speedIndex)} |`
);

console.log(
  `| TBT | ${baseline.tbt.toFixed(0)} ms | ${candidate.tbt.toFixed(0)} ms | ${formatChange(baseline.tbt, candidate.tbt)} |`
);

console.log(
  `| CLS | ${baseline.cls.toFixed(3)} | ${candidate.cls.toFixed(3)} | ${formatChange(baseline.cls, candidate.cls)} |`
);

console.log(
  `| TTFB | ${baseline.ttfb.toFixed(0)} ms | ${candidate.ttfb.toFixed(0)} ms | ${formatChange(baseline.ttfb, candidate.ttfb)} |`
);

// ----------------------------------------
// Performance Budget
// ----------------------------------------

const lcpChange = percentChange(
  baseline.lcp,
  candidate.lcp
);

console.log("");
console.log("## Performance Budget");
console.log("");
console.log(
  `LCPの悪化を **${LCP_BUDGET_PERCENT}%未満** に抑えること。`
);
console.log("");

let budgetFailed = false;

if (
  lcpChange !== null &&
  lcpChange >= LCP_BUDGET_PERCENT
) {
  console.log(
    `❌ LCPが **${lcpChange.toFixed(1)}%** 悪化しました。`
  );

  console.log("");
  console.log(
    `Budget: ${LCP_BUDGET_PERCENT}%`
  );

  budgetFailed = true;
} else {
  console.log(
    `✅ LCPはPerformance Budget内です。`
  );

  if (lcpChange !== null) {
    console.log("");
    console.log(
      `Change: ${lcpChange >= 0 ? "+" : ""}${lcpChange.toFixed(1)}%`
    );
  }
}

if (budgetFailed) {
  process.exit(1);
}