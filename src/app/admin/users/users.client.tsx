"use client";

import { useMemo, useState } from "react";
import { Save, Trash2 } from "lucide-react";

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
  const [rows, setRows] = useState<(Row & { newPassword?: string })[]>(initialRows);
  const [query, setQuery] = useState("");
  const [onlySubscribed, setOnlySubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const match = !q || r.email.toLowerCase().includes(q) || r.name.toLowerCase().includes(q);
      const subOk = !onlySubscribed || r.subscribed;
      return match && subOk;
    });
  }, [rows, query, onlySubscribed]);

  const exportCsv = () => {
    const header = "email,name,subscribed,role,createdAt";
    const body = filtered.map((r) => `${r.email},${escapeCsv(r.name)},${r.subscribed ? "yes" : "no"},${r.role},${r.createdAt}`).join("\n");
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

  const onSave = async (u: Row & { newPassword?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const payload: any = { name: u.name, role: u.role, walletAddress: u.wallet };
      if (u.newPassword && u.newPassword.length >= 6) payload.password = u.newPassword;
      const r = await fetch(`/api/admin/users/${u.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed to update user");
      setRows((prev) => prev.map((x) => (x.id === u.id ? { ...x, newPassword: "" } : x)));
    } catch (e: any) {
      setError(e.message || "Failed to update");
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this user? Users with financial history cannot be deleted.")) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Failed to delete user");
      setRows((prev) => prev.filter((x) => x.id !== id));
    } catch (e: any) {
      setError(e.message || "Failed to delete");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input className="input w-full sm:w-64" placeholder="Search email or name" value={query} onChange={(e) => setQuery(e.target.value)} />
        <label className="inline-flex items-center gap-2 text-white/80"><input type="checkbox" checked={onlySubscribed} onChange={(e) => setOnlySubscribed(e.target.checked)} /> Only subscribed</label>
        <div className="flex-1" />
        <button className="btn" onClick={exportCsv}>Export CSV</button>
        {error && <span className="text-red-400 text-sm ml-3">{error}</span>}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs sm:text-sm">
          <thead>
            <tr className="text-left text-white/60">
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4 hidden sm:table-cell">Wallet</th>
              <th className="py-2 pr-4 hidden md:table-cell">Subscribed</th>
              <th className="py-2 pr-4">Role</th>
              <th className="py-2 pr-4 hidden md:table-cell">New Password</th>
              <th className="py-2 pr-4 hidden lg:table-cell">Created</th>
              <th className="py-2 pr-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {filtered.map((r) => (
              <tr key={r.id}>
                <td className="py-2 pr-4">{r.email}</td>
                <td className="py-2 pr-4"><input className="input w-36 sm:w-52 md:w-64" value={r.name} onChange={(e) => setRows((prev) => prev.map((x) => x.id === r.id ? { ...x, name: e.target.value } : x))} /></td>
                <td className="py-2 pr-4 hidden sm:table-cell"><input className="input w-40 sm:w-64" value={r.wallet} onChange={(e) => setRows((prev) => prev.map((x) => x.id === r.id ? { ...x, wallet: e.target.value } : x))} /></td>
                <td className="py-2 pr-4 hidden md:table-cell">{r.subscribed ? "Yes" : "No"}</td>
                <td className="py-2 pr-4">
                  <select className="input" value={r.role} onChange={(e) => setRows((prev) => prev.map((x) => x.id === r.id ? { ...x, role: e.target.value as Row["role"] } : x))}>
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </td>
                <td className="py-2 pr-4 hidden md:table-cell"><input type="password" className="input w-36 sm:w-44" placeholder="Set new password" value={(r as any).newPassword || ""} onChange={(e) => setRows((prev) => prev.map((x) => x.id === r.id ? { ...x, newPassword: e.target.value } : x))} /></td>
                <td className="py-2 pr-4 hidden lg:table-cell">{new Date(r.createdAt).toLocaleString()}</td>
                <td className="py-2 pr-4">
                  <div className="flex gap-2">
                    <button className="btn px-3" title="Save" onClick={() => onSave(r)} disabled={loading}>
                      <Save className="w-4 h-4" />
                    </button>
                    <button className="btn-outline px-3" title="Delete" onClick={() => onDelete(r.id)} disabled={loading}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
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
