"use client";

import React from "react";

interface ParsedBlock {
  type: "text" | "table" | "chart";
  content: string;
  headers?: string[];
  rows?: string[][];
  chartData?: { label: string; value: number }[];
}

function parseTables(text: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  const lines = text.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    if (line.startsWith("|") && line.endsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const parseRow = (row: string) =>
          row
            .replace(/^\|/, "")
            .replace(/\|$/, "")
            .split("|")
            .map((cell) => cell.trim());

        const headers = parseRow(tableLines[0]);
        const separatorIdx = tableLines.findIndex((l) =>
          /^\|[\s\-:|]+\|$/.test(l)
        );

        const dataStart = separatorIdx >= 0 ? separatorIdx + 1 : 1;
        const rows = tableLines.slice(dataStart).map(parseRow);

        blocks.push({ type: "table", content: "", headers, rows });

        const numericCols = headers.map((_, ci) =>
          rows.every((r) => {
            const val = r[ci]?.replace(/[%,"]/g, "").trim();
            return val && !isNaN(Number(val));
          })
        );

        const hasNumeric = numericCols.some(Boolean);
        if (hasNumeric && rows.length <= 20) {
          const chartData = rows.map((row) => {
            const labelIdx = numericCols.findIndex((n) => !n);
            const valIdx = numericCols.findIndex((n) => n);
            const label =
              labelIdx >= 0
                ? row[labelIdx]
                : row[0];
            const rawVal = row[valIdx >= 0 ? valIdx : 1] || "0";
            const value = parseFloat(rawVal.replace(/[%,"]/g, ""));
            return { label, value: isNaN(value) ? 0 : value };
          });
          blocks.push({ type: "chart", content: "", chartData });
        }
        continue;
      }
    }

    blocks.push({ type: "text", content: line });
    i++;
  }

  return blocks;
}

function renderInlineFormatting(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|`(.+?)`|_(.+?)_)/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[2]) {
      parts.push(
        <strong key={key++} className="font-semibold text-white">
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
      parts.push(
        <code
          key={key++}
          className="rounded bg-dark-500/80 px-1.5 py-0.5 text-xs text-purple-light"
        >
          {match[3]}
        </code>
      );
    } else if (match[4]) {
      parts.push(
        <em key={key++} className="italic text-white/70">
          {match[4]}
        </em>
      );
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

function renderTable(headers: string[], rows: string[][]) {
  return (
    <div className="my-3 overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-purple-accent/10">
            {headers.map((h, i) => (
              <th
                key={i}
                className="px-4 py-2.5 text-left text-xs font-semibold text-purple-light"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={ri}
              className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]"
            >
              {row.map((cell, ci) => (
                <td key={ci} className="px-4 py-2 text-xs text-white/80">
                  {renderInlineFormatting(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderChart(data: { label: string; value: number }[]) {
  const maxVal = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="my-3 rounded-xl border border-white/10 bg-dark-700/50 p-4">
      <div className="mb-3 text-xs font-medium text-white/60">Chart</div>
      <div className="space-y-2.5">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="w-28 shrink-0 truncate text-right text-xs text-white/60">
              {d.label}
            </span>
            <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-dark-500/50">
              <div
                className="absolute inset-y-0 left-0 rounded-md bg-gradient-to-r from-purple-accent to-purple-light transition-all duration-700 ease-out"
                style={{ width: `${(d.value / maxVal) * 100}%` }}
              />
              <span className="relative z-10 flex h-full items-center px-2 text-[11px] font-medium text-white">
                {d.value.toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MessageContent({ content }: { content: string }) {
  const blocks = parseTables(content);

  return (
    <div className="space-y-1 text-sm leading-relaxed">
      {blocks.map((block, i) => {
        if (block.type === "table" && block.headers && block.rows) {
          return (
            <React.Fragment key={i}>
              {renderTable(block.headers, block.rows)}
            </React.Fragment>
          );
        }
        if (block.type === "chart" && block.chartData) {
          return <React.Fragment key={i}>{renderChart(block.chartData)}</React.Fragment>;
        }
        if (block.content === "") return null;
        return (
          <p key={i} className="whitespace-pre-wrap text-white/90">
            {renderInlineFormatting(block.content)}
          </p>
        );
      })}
    </div>
  );
}
