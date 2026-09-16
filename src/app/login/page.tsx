"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { buscarEmpleadoPorDni, registrarFichada } from "@/app/fichado/actions";
import type { EmpleadoFichado } from "@/app/fichado/actions";
import type { TipoFichada } from "@/lib/types";

type Vista =
  | { paso: "login" }
  | { paso: "buscando-dni" }
  | { paso: "fichaje-opciones"; empleado: EmpleadoFichado }
  | { paso: "fichaje-registrando"; empleado: EmpleadoFichado }
  | { paso: "fichaje-confirmado"; empleado: EmpleadoFichado; tipo: TipoFichada; hora: string };

const REINICIO_MS = 3000;

function esDni(valor: string): boolean {
  const limpio = valor.trim();
  return limpio.length > 0 && !limpio.includes("@") && /^[\d.]+$/.test(limpio);
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [vista, setVista] = useState<Vista>({ paso: "login" });

  useEffect(() => {
    if (vista.paso !== "fichaje-confirmado") return;

    const id = setTimeout(() => {
      setVista({ paso: "login" });
      setEmail("");
    }, REINICIO_MS);

    return () => clearTimeout(id);
  }, [vista]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (esDni(email)) {
      setVista({ paso: "buscando-dni" });
      const empleado = await buscarEmpleadoPorDni(email);

      if (!empleado) {
        setVista({ paso: "login" });
        setError("No encontramos un empleado activo con ese DNI.");
        return;
      }

      setVista({ paso: "fichaje-opciones", empleado });
      return;
    }

    setCargando(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setCargando(false);

    if (error) {
      setError("Email o contraseña incorrectos.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function handleMarcar(tipo: TipoFichada, empleado: EmpleadoFichado) {
    setVista({ paso: "fichaje-registrando", empleado });
    const resultado = await registrarFichada(empleado.id, tipo);

    if (!resultado.ok) {
      setVista({ paso: "login" });
      setError(resultado.error);
      return;
    }

    setVista({ paso: "fichaje-confirmado", empleado, tipo: resultado.tipo, hora: resultado.hora });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-panel px-4">
      <div className="w-full max-w-sm rounded-2xl border border-edge bg-card p-8 text-center">
        <div className="mb-4 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-vektor.png"
            alt="Vektor Geriatrixs"
            className="h-11 w-11 flex-shrink-0 rounded-[10px] object-cover"
          />
          <div className="text-left">
            <h1 className="font-display text-xl font-semibold leading-tight text-ink">Vektor</h1>
            <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-brass">Geriatrixs</p>
          </div>
        </div>

        {vista.paso === "login" && (
          <>
            <p className="mb-6 text-left text-sm text-ink-soft">Iniciá sesión para continuar</p>

            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-soft">
                  Email o DNI
                </label>
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none"
                />
                <p className="mt-1 text-[0.65rem] text-ink-soft">
                  ¿Solo venís a fichar? Poné tu DNI acá y dejá la contraseña vacía.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-soft">
                  Contraseña
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none"
                />
              </div>

              {error && <p className="text-sm text-red-700">{error}</p>}

              <button
                type="submit"
                disabled={cargando}
                className="w-full rounded-lg bg-brass px-3 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
              >
                {cargando ? "Ingresando..." : "Ingresar"}
              </button>
            </form>
          </>
        )}

        {vista.paso === "buscando-dni" && <p className="text-sm text-ink-soft">Buscando...</p>}

        {vista.paso === "fichaje-opciones" && (
          <div className="space-y-4">
            <p className="text-sm text-ink-soft">Hola,</p>
            <p className="font-display text-xl font-semibold text-ink">
              {vista.empleado.nombre_completo}
            </p>
            <div className="grid grid-cols-1 gap-3 pt-2">
              <button
                onClick={() => handleMarcar("ingreso", vista.empleado)}
                className="rounded-xl bg-green-700 px-4 py-5 text-base font-bold text-white hover:bg-green-600"
              >
                Marcar ingreso
              </button>
              <button
                onClick={() => handleMarcar("egreso", vista.empleado)}
                className="rounded-xl bg-red-700 px-4 py-5 text-base font-bold text-white hover:bg-red-600"
              >
                Marcar egreso
              </button>
            </div>
            <button
              onClick={() => {
                setVista({ paso: "login" });
                setEmail("");
              }}
              className="text-xs text-ink-soft underline decoration-ink-soft/40 underline-offset-2 hover:text-ink"
            >
              No soy yo
            </button>
          </div>
        )}

        {vista.paso === "fichaje-registrando" && (
          <p className="text-sm text-ink-soft">Registrando...</p>
        )}

        {vista.paso === "fichaje-confirmado" && (
          <div className="space-y-2">
            <p className="text-4xl">✓</p>
            <p className="font-display text-lg font-semibold text-ink">
              {vista.tipo === "ingreso" ? "Ingreso registrado" : "Egreso registrado"}
            </p>
            <p className="text-sm text-ink-soft">
              {vista.empleado.nombre_completo} · {vista.hora} hs
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
