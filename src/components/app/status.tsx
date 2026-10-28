import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  RotateCcw,
  Wrench,
  XCircle,
  Home,
} from "lucide-react";
import type { PaymentStatus, PropertyStatus } from "@/domain/types";
import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "danger" | "neutral" | "info";

const tones: Record<Tone, string> = {
  success: "bg-success/12 text-success border-success/25",
  warning: "bg-warning/18 text-warning-foreground border-warning/40 dark:text-warning",
  danger: "bg-destructive/10 text-destructive border-destructive/25",
  neutral: "bg-muted text-muted-foreground border-border",
  info: "bg-accent text-accent-foreground border-primary/20",
};

export function Pill({
  tone,
  icon: Icon,
  children,
  className,
}: {
  tone: Tone;
  icon?: typeof Clock;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
        tones[tone],
        className,
      )}
    >
      {Icon && <Icon className="size-3.5" aria-hidden />}
      {children}
    </span>
  );
}

const paymentMap: Record<PaymentStatus, { tone: Tone; label: string; icon: typeof Clock }> = {
  pendiente: { tone: "warning", label: "Pendiente", icon: Clock },
  en_proceso: { tone: "info", label: "En proceso", icon: Loader2 },
  pagado: { tone: "success", label: "Pagado", icon: CheckCircle2 },
  fallido: { tone: "danger", label: "Fallido", icon: XCircle },
  reembolsado: { tone: "neutral", label: "Reembolsado", icon: RotateCcw },
};

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  const s = paymentMap[status];
  return (
    <Pill tone={s.tone} icon={s.icon}>
      {s.label}
    </Pill>
  );
}

const propertyMap: Record<PropertyStatus, { tone: Tone; label: string; icon: typeof Clock }> = {
  disponible: { tone: "success", label: "Disponible", icon: CheckCircle2 },
  ocupado: { tone: "neutral", label: "Ocupado", icon: Home },
  mantenimiento: { tone: "warning", label: "En mantenimiento", icon: Wrench },
};

export function PropertyBadge({ status }: { status: PropertyStatus }) {
  const s = propertyMap[status];
  return (
    <Pill tone={s.tone} icon={s.icon}>
      {s.label}
    </Pill>
  );
}

export function DemoBadge() {
  return (
    <Pill tone="info" icon={AlertTriangle}>
      Demostración
    </Pill>
  );
}
