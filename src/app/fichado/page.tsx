"use client";

import { useEffect, useState } from "react";
import { buscarEmpleadoPorDni, registrarFichada } from "./actions";
import type { EmpleadoFichado } from "./actions";
import type { TipoFichada } from "@/lib/types";

type Estado =
  | { paso: "dni" }
  | { paso: "buscando" }
  | { paso: "opciones"; empleado: EmpleadoFichado }
  | { paso: "registrando"; empleado: EmpleadoFichado }
  | { paso: "confirmado"; empleado: EmpleadoFichado; tipo: TipoFichada; hora: string }
  | { paso: "error"; mensaje: string };

const REINICIO_MS = 3000;

export default function FichadoPage() {
  const [estado, setEstado] = useState<Estado>({ paso: "dni" });
  const [dni, setDni] = useState("");

  useEffect(() => {
    if (estado.paso !== "confirmado" && estado.paso !== "error") return;

    const id = setTimeout(() => {
      setEstado({ paso: "dni" });
      setDni("");
    }, REINICIO_MS);

    return () => clearTimeout(id);
  }, [estado]);

  async function handleBuscar(e: React.FormEvent) {
    e.preventDefault();
    if (!dni.trim()) return;

    setEstado({ paso: "buscando" });
    const empleado = await buscarEmpleadoPorDni(dni);

    if (!empleado) {
      setEstado({ paso: "error", mensaje: "No encontramos un empleado activo con ese DNI." });
      return;
    }

    setEstado({ paso: "opciones", empleado });
  }

  async function handleMarcar(tipo: TipoFichada, empleado: EmpleadoFichado) {
    setEstado({ paso: "registrando", empleado });
    const resultado = await registrarFichada(empleado.id, tipo);

    if (!resultado.ok) {
      setEstado({ paso: "error", mensaje: resultado.error });
      return;
    }

    setEstado({ paso: "confirmado", empleado, tipo: resultado.tipo, hora: resultado.hora });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-panel px-4">
      <div className="w-full max-w-sm rounded-2xl border border-edge bg-card p-8 text-center">
        <div className="mb-6 flex flex-col items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-vektor.png"
            alt="Vektor Geriatrixs"
            className="h-12 w-12 rounded-[10px] object-cover"
          />
          <p className="text-xs font-semibold uppercase tracking-widest text-brass">
            Control de asistencia
          </p>
        </div>

        {estado.paso === "dni" && (
          <form onSubmit={handleBuscar} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-soft">
                Ingresá tu DNI
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                required
                value={dni}
                onChange={(e) => setDni(e.target.value.replace(/\D/g, ""))}
                className="w-full rounded-lg border border-edge bg-panel-deep px-3 py-3 text-center text-lg tracking-widest text-ink focus:border-brass focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-brass px-3 py-3 text-sm font-semibold text-btn-ink hover:bg-brass/90"
            >
              Continuar
            </button>
          </form>
        )}

        {estado.paso === "buscando" && <p className="text-sm text-ink-soft">Buscando...</p>}

        {estado.paso === "opciones" && (
          <div className="space-y-4">
            <p className="text-sm text-ink-soft">Hola,</p>
            <p className="font-display text-xl font-semibold text-ink">
              {estado.empleado.nombre_completo}
            </p>
            <div className="grid grid-cols-1 gap-3 pt-2">
              <button
                onClick={() => handleMarcar("ingreso", estado.empleado)}
                className="rounded-xl bg-green-700 px-4 py-5 text-base font-bold text-white hover:bg-green-600"
              >
                Marcar ingreso
              </button>
              <button
                onClick={() => handleMarcar("egreso", estado.empleado)}
                className="rounded-xl bg-red-700 px-4 py-5 text-base font-bold text-white hover:bg-red-600"
              >
                Marcar egreso
              </button>
            </div>
            <button
              onClick={() => {
                setEstado({ paso: "dni" });
                setDni("");
              }}
              className="text-xs text-ink-soft underline decoration-ink-soft/40 underline-offset-2 hover:text-ink"
            >
              No soy yo
            </button>
          </div>
        )}

        {estado.paso === "registrando" && <p className="text-sm text-ink-soft">Registrando...</p>}

        {estado.paso === "confirmado" && (
          <div className="space-y-2">
            <p className="text-4xl">✓</p>
            <p className="font-display text-lg font-semibold text-ink">
              {estado.tipo === "ingreso" ? "Ingreso registrado" : "Egreso registrado"}
            </p>
            <p className="text-sm text-ink-soft">
              {estado.empleado.nombre_completo} · {estado.hora} hs
            </p>
          </div>
        )}

        {estado.paso === "error" && (
          <p className="text-sm text-red-700">{estado.mensaje}</p>
        )}
      </div>
    </div>
  );
}
