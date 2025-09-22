"use client";

import { useMemo, useState } from "react";

type Row = {
  id: string;
  email: string;
  name: string;
  wallet: string;
  role: "USER" | "ADMIN";
  createdAt: string;
  subscribed: boolean;
};

export default function UsersClient({ initialRows }: { initialRows: Row[] }) {
  const [query, setQuery] = useState("");
  const [onlySubscribed, setOnlySubscribed] = useState(false);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return initialRows.filter((r) => {
      const match = !q || r.email.toLowerCase().includes(q) || r.name.toLowerCase().includes(q);
      const subOk = !onlySubscribed || r.subscribed;
      return match && subOk;
    });
  }, [initialRows, query, onlySubscribed]);

  const exportCsv = () => {
    const header = "email,name,subscribed,role,createdAt";
    const body = rows.map((r) => `${r.email},${escapeCsv(r.name)},${r.subscribed ? "yes" : "no"},${r.role},${r.createdAt}`).join("\n");
    const blob = new Blob([header + "\n" + body], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users_emails.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input className="input w-64" placeholder="Search email or name" value={query} onChange={(e) => setQuery(e.target.value)} />
        <label className="inline-flex items-center gap-2 text-white/80"><input type="checkbox" checked={onlySubscribed} onChange={(e) => setOnlySubscribed(e.target.checked)} /> Only subscribed</label>
        <div className="flex-1" />
        <button className="btn" onClick={exportCsv}>Export CSV</button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-white/60">
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Subscribed</th>
              <th className="py-2 pr-4">Role</th>
              <th className="py-2 pr-4">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="py-2 pr-4">{r.email}</td>
                <td className="py-2 pr-4">{r.name}</td>
                <td className="py-2 pr-4">{r.subscribed ? "Yes" : "No"}</td>
                <td className="py-2 pr-4">{r.role}</td>
                <td className="py-2 pr-4">{new Date(r.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function escapeCsv(s: string) {
  if (s.includes(",") || s.includes("\n") || s.includes('"')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}
