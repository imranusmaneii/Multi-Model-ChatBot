"use client";

import React from "react";

function isPipeTable(line: string): boolean {
  return line.startsWith("|") && line.includes("|", 1);
}

function isSeparatorLine(line: string): boolean {
  return /^\|[\s\-:|]+\|$/.test(line) || (/^[\s\-:|\t]+$/.test(line.replace(/\|/g, "").trim()) && line.includes("-"));
}

function isDiagramLine(line: string): boolean {
  return /\[.+?\]\s*->\s*\[.+?\]/.test(line) || /\[.+?\]\s*→\s*\[.+?\]/.test(line);
}

function isTabSeparatedTable(lines: string[], idx: number): boolean {
  const line = lines[idx];
  if (line.includes("\t") && line.split("\t").length >= 2) {
    const next = lines[idx + 1];
    if (next && (next.includes("\t") || isSeparatorLine(next))) return true;
  }
  return false;
}

function parseContent(content: string): React.ReactNode[] {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines
    if (trimmed === "") {
      i++;
      continue;
    }

    // Pipe table detection
    if (isPipeTable(trimmed)) {
      const tableLines: string[] = [];
      while (i < lines.length && isPipeTable(lines[i].trim())) {
        tableLines.push(lines[i].trim());
        i++;
      }
      if (tableLines.length >= 2) {
        const parsePipeRow = (row: string) =>
          row.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
        const headers = parsePipeRow(tableLines[0]);
        const sepIdx = tableLines.findIndex((l) => isSeparatorLine(l));
        const dataStart = sepIdx >= 0 ? sepIdx + 1 : 1;
        const rows = tableLines.slice(dataStart).map(parsePipeRow);
        elements.push(renderTable(headers, rows, key++));
        checkAndPushChart(elements, headers, rows, key++);
        continue;
      }
    }

    // Tab-separated table detection
    if (isTabSeparatedTable(lines, i)) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim() !== "" && (lines[i].includes("\t") || isSeparatorLine(lines[i].trim()))) {
        tableLines.push(lines[i].trim());
        i++;
      }
      if (tableLines.length >= 2) {
        const parsedRows = tableLines
          .filter((l) => !isSeparatorLine(l))
          .map((l) => l.split("\t").map((c) => c.trim()));
        if (parsedRows.length >= 2) {
          const headers = parsedRows[0];
          const rows = parsedRows.slice(1);
          elements.push(renderTable(headers, rows, key++));
          checkAndPushChart(elements, headers, rows, key++);
          continue;
        }
      }
    }

    // Headings
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      elements.push(renderHeading(text, level, key++));
      i++;
      continue;
    }

    // Diagram lines - [Component] -> [Component]
    if (isDiagramLine(trimmed)) {
      const diagramLines: string[] = [];
      while (i < lines.length && (isDiagramLine(lines[i].trim()) || lines[i].trim() === "")) {
        if (lines[i].trim() !== "") diagramLines.push(lines[i].trim());
        i++;
      }
      elements.push(renderDiagram(diagramLines, key++));
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      elements.push(<hr key={key++} className="my-3 border-white/10" />);
      i++;
      continue;
    }

    // Bullet points (- or * prefix)
    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ""));
        i++;
      }
      elements.push(
        <ul key={key++} className="my-2 space-y-1 pl-1">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-white/90">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-accent" />
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i++;
      }
      elements.push(
        <ol key={key++} className="my-2 space-y-1 pl-1">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-white/90">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-accent/20 text-[10px] font-semibold text-purple-light">
                {idx + 1}
              </span>
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Regular text - collect consecutive non-empty lines
    const textLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !isPipeTable(lines[i].trim()) &&
      !/^(#{1,6})\s+/.test(lines[i].trim()) &&
      !/^[-*]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !/^(-{3,}|\*{3,}|_{3,})$/.test(lines[i].trim())
    ) {
      textLines.push(lines[i]);
      i++;
    }
    if (textLines.length > 0) {
      elements.push(
        <p key={key++} className="whitespace-pre-wrap text-sm leading-relaxed text-white/90">
          {renderInline(textLines.join("\n"))}
        </p>
      );
    }
  }

  return elements;
}

function renderHeading(text: string, level: number, key: number): React.ReactNode {
  const cls: Record<number, string> = {
    1: "text-lg font-bold text-white mt-3 mb-1",
    2: "text-base font-bold text-white mt-3 mb-1",
    3: "text-sm font-bold text-white/95 mt-2 mb-1",
    4: "text-sm font-semibold text-white/90 mt-2 mb-1",
    5: "text-xs font-semibold text-white/85 mt-1 mb-1",
    6: "text-xs font-semibold text-white/80 mt-1 mb-1",
  };
  return (
    <div key={key} className={cls[level] || cls[3]}>
      {renderInline(text)}
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|`(.+?)`|_(.+?)_)/g;
  let lastIndex = 0;
  let match;
  let k = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[2]) {
      parts.push(
        <strong key={k++} className="font-semibold text-white">
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
      parts.push(
        <code key={k++} className="rounded bg-dark-500/80 px-1.5 py-0.5 text-xs text-purple-light">
          {match[3]}
        </code>
      );
    } else if (match[4]) {
      parts.push(
        <em key={k++} className="italic text-white/70">
          {match[4]}
        </em>
      );
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

function checkAndPushChart(
  elements: React.ReactNode[],
  headers: string[],
  rows: string[][],
  key: number
) {
  const numericCols = headers.map((_, ci) =>
    rows.every((r) => {
      const val = r[ci]?.replace(/[%,"]/g, "").trim();
      return val !== undefined && val !== "" && !isNaN(Number(val));
    })
  );
  const hasNumeric = numericCols.some(Boolean);
  if (hasNumeric && rows.length <= 20) {
    const chartData = rows.map((row) => {
      const labelIdx = numericCols.findIndex((n) => !n);
      const valIdx = numericCols.findIndex((n) => n);
      const label = labelIdx >= 0 ? row[labelIdx] : row[0];
      const rawVal = row[valIdx >= 0 ? valIdx : 1] || "0";
      const value = parseFloat(rawVal.replace(/[%,"]/g, ""));
      return { label, value: isNaN(value) ? 0 : value };
    });
    elements.push(renderChart(chartData, key));
  }
}

function renderTable(headers: string[], rows: string[][], key: number) {
  return (
    <div key={key} className="my-3 overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-purple-accent/10">
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-2.5 text-left text-xs font-semibold text-purple-light">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
              {row.map((cell, ci) => (
                <td key={ci} className="px-4 py-2 text-xs text-white/80">
                  {renderInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderChart(data: { label: string; value: number }[], key: number) {
  const maxVal = Math.max(...data.map((d) => d.value), 1);

  return (
    <div key={key} className="my-3 rounded-xl border border-white/10 bg-dark-700/50 p-4">
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

function parseDiagramSteps(line: string): string[] {
  const parts = line.split(/->|→/).map((s) => s.trim());
  return parts.map((p) => p.replace(/^\[|\]$/g, "").trim()).filter(Boolean);
}

function renderDiagram(lines: string[], key: number) {
  const allPaths = lines.map(parseDiagramSteps);
  const maxSteps = Math.max(...allPaths.map((p) => p.length));

  return (
    <div key={key} className="my-4 rounded-xl border border-white/10 bg-dark-700/50 p-5">
      <div className="mb-4 text-xs font-medium text-white/60">Architecture Diagram</div>
      <div className="flex flex-col items-center gap-3">
        {allPaths.map((steps, pi) => (
          <div key={pi} className="flex items-center gap-0 flex-wrap justify-center">
            {steps.map((step, si) => (
              <React.Fragment key={si}>
                {si > 0 && (
                  <div className="mx-1.5 flex items-center">
                    <div className="h-0.5 w-5 bg-purple-accent/60" />
                    <svg className="h-3 w-3 text-purple-accent/60 shrink-0" viewBox="0 0 12 12" fill="currentColor">
                      <path d="M2 1l8 5-8 5V1z" />
                    </svg>
                  </div>
                )}
                <div className="rounded-lg border border-purple-accent/30 bg-purple-accent/10 px-3 py-1.5 text-xs font-medium text-purple-light whitespace-nowrap">
                  {step}
                </div>
              </React.Fragment>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MessageContent({ content }: { content: string }) {
  const elements = parseContent(content);

  return <div className="space-y-1 text-sm leading-relaxed">{elements}</div>;
}
