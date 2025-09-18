"use client";

import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import Link from "next/link";
import { LogIn } from "lucide-react";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormValues) => {
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", { ...data, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password");
      return;
    }
    window.location.href = "/connect";
  };

  return (
    <div className="mx-auto max-w-md w-full card p-8">
      <h1 className="text-2xl font-bold mb-2">Welcome back</h1>
      <p className="text-white/70 mb-6">Login to continue</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button className="btn w-full" disabled={loading}>
          <LogIn className="w-4 h-4 mr-2" /> Login
        </button>
      </form>

      <p className="text-sm text-white/70 mt-4">
        Don't have an account? <Link className="link" href="/signup">Create one</Link>
      </p>
    </div>
  );
}
