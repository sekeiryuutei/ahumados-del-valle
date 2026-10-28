import type { ReactNode } from "react";
import { Inbox, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string | undefined;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border bg-card p-5 shadow-soft", className)}>
      {children}
    </section>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string | undefined;
  tone?: "default" | "primary" | "warning" | "success";
}) {
  const tones = {
    default: "",
    primary: "text-primary",
    warning: "text-warning-foreground dark:text-warning",
    success: "text-success",
  };
  return (
    <Panel className="p-4">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className={cn("mt-1 font-display text-2xl font-bold tabular md:text-3xl", tones[tone])}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Panel>
  );
}

export function Loading({ label = "Cargando…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
      <Loader2 className="size-5 animate-spin" /> {label}
    </div>
  );
}

export function Empty({
  title,
  text,
  action,
}: {
  title: string;
  text?: string | undefined;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed bg-card/50 px-6 py-12 text-center">
      <Inbox className="size-8 text-muted-foreground" />
      <p className="mt-3 font-semibold">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorBox({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: (() => void) | undefined;
}) {
  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm">
      <p className="font-semibold text-destructive">No pudimos cargar la información</p>
      <p className="mt-1 text-muted-foreground">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-3 font-semibold text-primary underline">
          Intentar de nuevo
        </button>
      )}
    </div>
  );
}
