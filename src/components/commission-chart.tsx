"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";

type SeriesPoint = { date: string; amount: number };

export default function CommissionChart({ pending, paid, series }: { pending: number; paid: number; series: SeriesPoint[] }) {
  const pieData = [
    { name: "Pending", value: pending },
    { name: "Paid", value: paid },
  ];
  const COLORS = ["#F59E0B", "#34D399"]; // amber, green

  return (
    <div className="card p-6 glow">
      <h3 className="font-semibold text-lg mb-4">Earnings Overview</h3>
      <div className="grid md:grid-cols-2 gap-4 items-center">
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={70} innerRadius={40} stroke="#222446" strokeWidth={2}>
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "#151935", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="date" tick={{ fill: "#A3A7C2" }} tickLine={false} axisLine={{ stroke: "rgba(255,255,255,0.1)" }} />
              <YAxis tick={{ fill: "#A3A7C2" }} tickLine={false} axisLine={{ stroke: "rgba(255,255,255,0.1)" }} />
              <Tooltip contentStyle={{ background: "#151935", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12 }} />
              <Line type="monotone" dataKey="amount" stroke="#6C5CE7" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
