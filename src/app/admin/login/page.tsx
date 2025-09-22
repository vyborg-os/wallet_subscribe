"use client";

import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { Shield } from "lucide-react";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type FormValues = z.infer<typeof schema>;

export default function AdminLoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [emailCache, setEmailCache] = useState("");
  const [passwordCache, setPasswordCache] = useState("");
  const [otp, setOtp] = useState("");
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormValues) => {
    setError(null);
    setLoading(true);
    try {
      const r = await fetch("/api/admin/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      setLoading(false);
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setError(j.error || "Invalid admin credentials");
        return;
      }
      setEmailCache(data.email);
      setPasswordCache(data.password);
      setStep("otp");
    } catch (e) {
      setError("Network error");
      setLoading(false);
    }
  };

  const onVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await signIn("credentials", { email: emailCache, password: passwordCache, otp, purpose: "login", redirect: false });
      setLoading(false);
      if (res?.error) {
        setError("Invalid code");
        return;
      }
      window.location.href = "/admin";
    } catch (e) {
      setError("Verification failed");
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md w-full card p-8">
      {step === "credentials" ? (
        <>
          <h1 className="text-2xl font-bold mb-2 inline-flex items-center gap-2"><Shield className="w-5 h-5 text-brand" /> Admin Login</h1>
          <p className="text-white/70 mb-6">Enter your credentials to receive a one-time code</p>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Email</label>
              <input className="input" placeholder="admin@example.com" {...register("email")} />
              {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-sm mb-1">Password</label>
              <input type="password" className="input" placeholder="••••••••" {...register("password")} />
              {errors.password && <p className="text-red-400 text-sm mt-1">{errors.password.message}</p>}
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button className="btn w-full" disabled={loading}>Request Code</button>
          </form>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-bold mb-2">Enter OTP</h1>
          <p className="text-white/70 mb-6">We sent a 6-digit code to your email</p>
          <form onSubmit={onVerify} className="space-y-4">
            <input className="input" placeholder="123456" value={otp} onChange={(e) => setOtp(e.target.value)} />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button className="btn w-full" disabled={loading}>Verify & Continue</button>
          </form>
          <button
            className="btn-outline w-full mt-3"
            onClick={async () => {
              setError(null);
              setLoading(true);
              const r = await fetch("/api/admin/request-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: emailCache, password: passwordCache }) });
              setLoading(false);
              if (!r.ok) setError("Failed to resend code");
            }}
          >Resend Code</button>
        </>
      )}
    </div>
  );
}
