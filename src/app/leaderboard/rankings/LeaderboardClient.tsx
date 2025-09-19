"use client";

import { useMemo, useState } from "react";

type LeaderRow = {
  id: string;
  address: string;
  refs: number;
  volumeDirectUsd: number;
  volumeTwoLevelUsd: number;
};

function shortAddr(a?: string | null) {
  if (!a) return "—";
  return a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

function btnChoice(active: boolean) {
  return active ? "btn" : "btn-outline";
}

function formatUsd(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

export default function LeaderboardClient({ initialRows, totalDirectUsd, totalTwoLevelUsd }: { initialRows: LeaderRow[]; totalDirectUsd: number; totalTwoLevelUsd: number }) {
  const [pageSizeChoice, setPageSizeChoice] = useState<10 | 25 | 50>(10);
  const [pageSize, setPageSize] = useState<10 | 25 | 50>(10);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [minRefs, setMinRefs] = useState<number>(0);
  const [includeL2, setIncludeL2] = useState<boolean>(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return initialRows.filter((r) => {
      const match = !q || r.address.toLowerCase().includes(q);
      const refsOk = !minRefs || r.refs >= minRefs;
      return match && refsOk;
    });
  }, [initialRows, query, minRefs]);

  const rows = filtered;
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const pageRows = useMemo(() => rows.slice((page - 1) * pageSize, page * pageSize), [rows, page, pageSize]);

  const apply = () => {
    setPageSize(pageSizeChoice);
    setPage(1);
  };
  const reset = () => {
    setPageSizeChoice(10);
    setPageSize(10);
    setPage(1);
    setQuery("");
    setMinRefs(0);
    setIncludeL2(false);
  };

  const total = includeL2 ? totalTwoLevelUsd : totalDirectUsd;

  const downloadCsv = () => {
    const all = rows.map((r, idx) => {
      const vol = includeL2 ? r.volumeTwoLevelUsd : r.volumeDirectUsd;
      const share = total ? (vol / total) * 100 : 0;
      const rank = idx + 1;
      return { rank, address: r.address, refs: r.refs, volume_usdc: vol.toFixed(2), share_pct: share.toFixed(2) };
    });
    const header = Object.keys(all[0] || { rank: "", address: "", refs: "", volume_usdc: "", share_pct: "" }).join(",");
    const body = all.map((r) => `${r.rank},${r.address},${r.refs},${r.volume_usdc},${r.share_pct}`).join("\n");
    const blob = new Blob([header + "\n" + body], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leaderboard.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card p-6 glow">
      <div className="flex flex-wrap items-center gap-2 mb-4 text-sm">
        <button className={`${btnChoice(pageSizeChoice === 10)} btn-sm`} onClick={() => setPageSizeChoice(10)}>10</button>
        <button className={`${btnChoice(pageSizeChoice === 25)} btn-sm`} onClick={() => setPageSizeChoice(25)}>25</button>
        <button className={`${btnChoice(pageSizeChoice === 50)} btn-sm`} onClick={() => setPageSizeChoice(50)}>50</button>
        <div className="flex-1 min-w-[1rem]" />
        <input className="input w-36 sm:w-48" placeholder="Search address" value={query} onChange={(e) => setQuery(e.target.value)} />
        <input className="input w-24 sm:w-28" type="number" min={0} placeholder="Min refs" value={minRefs || ""} onChange={(e) => setMinRefs(Number(e.target.value || 0))} />
        <label className="inline-flex items-center gap-2 text-white/80 whitespace-nowrap"><input type="checkbox" checked={includeL2} onChange={(e) => setIncludeL2(e.target.checked)} /> Include L2</label>
        <button className="btn btn-sm" onClick={apply}>Apply</button>
        <button className="btn-outline btn-sm" onClick={reset}>Reset</button>
        <button className="btn-outline btn-sm" onClick={downloadCsv}><span className="hidden sm:inline">Export </span>CSV</button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-white/60">
              <th className="py-2 pr-4">Rank</th>
              <th className="py-2 pr-4">Address</th>
              <th className="py-2 pr-4">Refs</th>
              <th className="py-2 pr-4">Volume (USDC)</th>
              <th className="py-2 pr-4">Share %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-center text-white/60">No data.</td>
              </tr>
            )}
            {pageRows.map((r, idx) => {
              const vol = includeL2 ? r.volumeTwoLevelUsd : r.volumeDirectUsd;
              const sharePct = total ? (vol / total) * 100 : 0;
              const rank = (page - 1) * pageSize + idx + 1;
              return (
                <tr key={r.id}>
                  <td className="py-2 pr-4">{rank}</td>
                  <td className="py-2 pr-4 font-mono">{shortAddr(r.address)}</td>
                  <td className="py-2 pr-4">{r.refs}</td>
                  <td className="py-2 pr-4">{formatUsd(vol)}</td>
                  <td className="py-2 pr-4">{sharePct.toFixed(2)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 text-sm">
        <div className="text-white/60">Page {page} / {pages}</div>
        <div className="flex gap-2">
          <button className="btn-outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
          <button className="btn-outline" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}>Next</button>
        </div>
      </div>
    </div>
  );
}
