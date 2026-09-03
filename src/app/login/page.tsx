"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setCargando(false);

    if (error) {
      setError("Email o contraseña incorrectos.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-panel px-4">
      <div className="w-full max-w-sm rounded-2xl border border-edge bg-card p-8">
        <p className="mb-1 text-[0.65rem] font-semibold uppercase tracking-widest text-brass">
          Suite de cuidado
        </p>
        <h1 className="mb-1 font-display text-xl font-bold text-ink">
          Los Abuelos
        </h1>
        <p className="mb-6 text-sm text-ink-soft">Iniciá sesión para continuar</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-soft">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-soft">
              Contraseña
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={cargando}
            className="w-full rounded-lg bg-brass px-3 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
          >
            {cargando ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}
