"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { signIn } from "next-auth/react";

const schema = z.object({
  name: z.string().min(2, "Name is too short"),
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  ref: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function SignupForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"details" | "otp">("details");
  const [emailCache, setEmailCache] = useState("");
  const [passwordCache, setPasswordCache] = useState("");
  const [otp, setOtp] = useState("");
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    const ref = search?.get("ref");
    if (ref) setValue("ref", ref);
  }, [search, setValue]);

  const onSubmit = async (data: FormValues) => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Signup failed");
        setLoading(false);
        return;
      }
      // Request OTP for signup and move to OTP step
      setEmailCache(data.email);
      setPasswordCache(data.password);
      const otpReq = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email, password: data.password, purpose: "signup" }),
      });
      if (!otpReq.ok) {
        const j = await otpReq.json().catch(() => ({}));
        setError(j.error || "Failed to send OTP");
        setLoading(false);
        return;
      }
      setStep("otp");
      setLoading(false);
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
      const res = await signIn("credentials", { email: emailCache, password: passwordCache, otp, purpose: "signup", redirect: false });
      setLoading(false);
      if (res?.error) {
        setError("Invalid code");
      } else {
        router.push("/connect");
      }
    } catch (e) {
      setError("Verification failed");
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md w-full card p-8">
      {step === "details" ? (
        <>
          <h1 className="text-2xl font-bold mb-2">Create your account</h1>
          <p className="text-white/70 mb-6">Join and start subscribing with your wallet</p>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Name</label>
              <input className="input" placeholder="Jane Doe" {...register("name")} />
              {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm mb-1">Email</label>
              <input className="input" placeholder="you@example.com" {...register("email")} />
              {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-sm mb-1">Password</label>
              <input type="password" className="input" placeholder="••••••••" {...register("password")} />
              {errors.password && <p className="text-red-400 text-sm mt-1">{errors.password.message}</p>}
            </div>
            <input type="hidden" {...register("ref")} />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button className="btn w-full" disabled={loading}>
              <UserPlus className="w-4 h-4 mr-2" /> Create account
            </button>
          </form>
          <p className="text-sm text-white/70 mt-4">
            Already have an account? <Link className="link" href="/login">Login</Link>
          </p>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-bold mb-2">Verify your email</h1>
          <p className="text-white/70 mb-6">Enter the 6-digit code sent to your email</p>
          <form onSubmit={onVerify} className="space-y-4">
            <input className="input" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button className="btn w-full" disabled={loading}>Verify & Continue</button>
          </form>
          <button
            className="btn-outline w-full mt-3"
            onClick={async () => {
              setError(null);
              setLoading(true);
              const r = await fetch("/api/auth/request-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: emailCache, password: passwordCache, purpose: "signup" }) });
              setLoading(false);
              if (!r.ok) setError("Failed to resend code");
            }}
          >Resend Code</button>
        </>
      )}
    </div>
  );
}
