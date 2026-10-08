import type { Estado } from "@/types/publico";

const CONFIG: Record<Estado, { texto: string; clases: string; punto: string }> = {
  disponible: {
    texto: "Disponible",
    clases: "bg-ok-bg text-ok-text",
    punto: "bg-ok-dot",
  },
  bajo: {
    texto: "Stock bajo",
    clases: "bg-low-bg text-low-text",
    punto: "bg-low-dot",
  },
  sin_stock: {
    texto: "Sin stock",
    clases: "bg-out-bg text-out-text",
    // Anillo vacío: se distingue por forma y no solo por color.
    punto: "border-2 border-out-ring bg-transparent",
  },
};

export function EstadoBadge({ estado }: { estado: Estado }) {
  const c = CONFIG[estado];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${c.clases}`}
    >
      <span aria-hidden className={`size-2.5 rounded-full ${c.punto}`} />
      {c.texto}
    </span>
  );
}
