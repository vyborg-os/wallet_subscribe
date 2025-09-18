import { Suspense } from "react";
import SignupForm from "./signup-form";

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="card p-6">Loading…</div>}>
      <SignupForm />
    </Suspense>
  );
}
