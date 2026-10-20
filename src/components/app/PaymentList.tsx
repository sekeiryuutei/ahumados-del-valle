import type { RentPayment } from "@/domain/types";
import { formatCOP, formatDateTime, formatPeriod } from "@/lib/format";
import { PaymentBadge } from "./status";
import { Panel } from "./ui-bits";

const methodLabel: Record<RentPayment["method"], string> = { efectivo: "Efectivo", transferencia: "Transferencia", wompi: "En línea (Wompi)" };
const channelLabel = { pse: "PSE", nequi: "Nequi", bancolombia: "Bancolombia", tarjeta: "Tarjeta" } as const;

export function PaymentList({ payments, names }: { payments: RentPayment[]; names?: Record<string, string> }) {
  return (
    <div className="space-y-3">
      {payments.map((p) => (
        <Panel key={p.id} className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-semibold">{formatPeriod(p.period)}{names && <span className="font-normal text-muted-foreground"> · {names[p.tenantId]}</span>}</p>
              <p className="text-sm text-muted-foreground">
                {methodLabel[p.method]}{p.channel ? ` · ${channelLabel[p.channel]}` : ""} · {formatDateTime(p.createdAt)}
              </p>
              <p className="text-xs text-muted-foreground">Ref. {p.reference}</p>
            </div>
            <div className="text-right">
              <p className="font-display text-lg font-bold tabular">{formatCOP(p.total)}</p>
              {p.surcharge > 0 && <p className="text-xs text-muted-foreground tabular">incluye recargo {formatCOP(p.surcharge)}</p>}
              <div className="mt-1"><PaymentBadge status={p.status} /></div>
            </div>
          </div>
        </Panel>
      ))}
    </div>
  );
}
