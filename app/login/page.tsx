"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BookOpen } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("Incorrect email or password.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-9 h-9 rounded-lg bg-gcash/20 border border-gcash/40 flex items-center justify-center">
            <BookOpen size={18} className="text-gcash" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight">PayLedger</span>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-ink-card border border-ink-line rounded-xl p-6 space-y-4"
        >
          <div>
            <label className="text-xs text-text-mid uppercase tracking-wide">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg bg-ink border border-ink-line px-3 py-2.5 text-text-hi outline-none focus:border-gcash"
              placeholder="you@shop.com"
            />
          </div>
          <div>
            <label className="text-xs text-text-mid uppercase tracking-wide">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg bg-ink border border-ink-line px-3 py-2.5 text-text-hi outline-none focus:border-gcash"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-out text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gcash text-white font-medium py-2.5 disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <p className="text-xs text-text-low text-center pt-2">
            Accounts are created in your Supabase project's Auth dashboard.
          </p>
        </form>
      </div>
    </main>
  );
}
