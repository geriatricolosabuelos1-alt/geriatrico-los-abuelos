"use client";

import { useEffect } from "react";

export function AutoExportarPdf({ activo }: { activo: boolean }) {
  useEffect(() => {
    if (!activo) return;
    const id = setTimeout(() => window.print(), 300);
    return () => clearTimeout(id);
  }, [activo]);

  return null;
}
