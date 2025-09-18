"use client";

import { useState } from "react";

export default function WithdrawForm() {
  const [amount, setAmount] = useState("");
  const [toAddress, setToAddress] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setStatus("sending");
    try {
      const res = await fetch("/api/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountEth: amount, toAddress }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to request withdrawal");
      setStatus("done");
      setAmount("");
      setToAddress("");
    } catch (e: any) {
      setStatus("error");
      setError(e?.message || "Request failed");
    }
  };

  return (
    <div className="card p-6">
      <h3 className="font-semibold text-lg">Request Withdrawal</h3>
      <div className="mt-4 space-y-3">
        <div>
          <label className="block text-sm mb-1">Amount (ETH)</label>
          <input className="input" placeholder="0.05" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm mb-1">To Address</label>
          <input className="input" placeholder="0x..." value={toAddress} onChange={(e) => setToAddress(e.target.value)} />
        </div>
        <button className="btn" onClick={submit} disabled={status === "sending"}>Submit</button>
        {status === "done" && <p className="text-green-400 text-sm">Withdrawal requested!</p>}
        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>
    </div>
  );
}
