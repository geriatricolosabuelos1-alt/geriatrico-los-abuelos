export function CargandoSeccion() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-panel">
      <div className="flex flex-col items-center gap-3">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-edge border-t-brass" />
        <p className="text-xs font-medium uppercase tracking-widest text-ink-soft">
          Cargando...
        </p>
      </div>
    </div>
  );
}
