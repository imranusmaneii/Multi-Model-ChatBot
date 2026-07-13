"use client";

const HEADS_DATA = [
  { name: "Head 1 (positional)", weights: [
    [0.82, 0.03, 0.02, 0.05, 0.03, 0.05],
    [0.04, 0.78, 0.06, 0.04, 0.04, 0.04],
    [0.03, 0.05, 0.80, 0.04, 0.05, 0.03],
    [0.05, 0.04, 0.03, 0.79, 0.05, 0.04],
    [0.04, 0.03, 0.04, 0.05, 0.81, 0.03],
    [0.05, 0.04, 0.03, 0.04, 0.03, 0.81],
  ]},
  { name: "Head 2 (syntactic)", weights: [
    [0.15, 0.45, 0.12, 0.10, 0.10, 0.08],
    [0.42, 0.14, 0.18, 0.10, 0.08, 0.08],
    [0.10, 0.20, 0.13, 0.35, 0.12, 0.10],
    [0.12, 0.08, 0.38, 0.14, 0.16, 0.12],
    [0.10, 0.10, 0.14, 0.16, 0.30, 0.20],
    [0.08, 0.12, 0.10, 0.12, 0.18, 0.40],
  ]},
];

const TOKENS = ["The", "cat", "sat", "on", "the", "mat"];

function getHeatColor(value: number): string {
  const intensity = Math.round(value * 255);
  if (value > 0.5) return `rgba(124, 58, 237, ${0.4 + value * 0.6})`;
  if (value > 0.2) return `rgba(124, 58, 237, ${0.15 + value * 0.5})`;
  return `rgba(124, 58, 237, ${value * 0.4})`;
}

export default function AttentionVisualization() {
  return (
    <div className="my-4 rounded-xl border border-white/10 bg-dark-700/50 p-5">
      <div className="mb-4">
        <div className="text-xs font-medium text-white/60">Attention Visualization</div>
        <div className="mt-1 text-[10px] text-white/30">How the model learns to focus on different words</div>
      </div>

      <div className="space-y-5">
        {HEADS_DATA.map((head, hi) => (
          <div key={hi}>
            <div className="mb-2 text-xs font-medium text-purple-light/80">{head.name}</div>
            <div className="overflow-x-auto">
              <table className="border-collapse text-[10px]">
                <thead>
                  <tr>
                    <th className="px-1 py-1 text-right text-white/30">Query→</th>
                    {TOKENS.map((t, ti) => (
                      <th key={ti} className="px-2 py-1 text-center font-medium text-purple-light/60">
                        {t}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {head.weights.map((row, ri) => (
                    <tr key={ri}>
                      <td className="whitespace-nowrap pr-2 py-0.5 text-right font-medium text-purple-light/60">
                        {TOKENS[ri]}
                      </td>
                      {row.map((val, ci) => (
                        <td key={ci} className="px-0.5 py-0.5">
                          <div
                            className="flex h-8 w-10 items-center justify-center rounded text-[9px] font-medium transition-all"
                            style={{
                              backgroundColor: getHeatColor(val),
                              color: val > 0.3 ? "white" : "rgba(255,255,255,0.4)",
                            }}
                            title={`${TOKENS[ri]} → ${TOKENS[ci]}: ${(val * 100).toFixed(1)}%`}
                          >
                            {(val * 100).toFixed(0)}%
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-4 text-[10px] text-white/30">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: getHeatColor(0.8) }} />
          <span>High attention</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: getHeatColor(0.1) }} />
          <span>Low attention</span>
        </div>
      </div>
    </div>
  );
}
