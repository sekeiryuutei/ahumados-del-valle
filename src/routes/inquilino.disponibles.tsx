import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/hooks/use-data";
import { formatCOP } from "@/lib/format";
import { errorMessage } from "@/services";
import { Empty, ErrorBox, Loading, PageHeader, Panel } from "@/components/app/ui-bits";
import { PropertyBadge } from "@/components/app/status";

export const Route = createFileRoute("/inquilino/disponibles")({ component: Available });

function Available() {
  const list = useQuery(q.properties("disponible"));
  return (
    <>
      <PageHeader title="Locales disponibles" subtitle="¿Te interesa alguno? Pregunta a la administración." />
      {list.isLoading ? <Loading /> : list.error ? <ErrorBox message={errorMessage(list.error)} onRetry={() => list.refetch()} /> : list.data!.length === 0 ? (
        <Empty title="No hay locales disponibles" text="Vuelve a revisar más adelante." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {list.data!.map((p) => (
            <Panel key={p.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-bold">{p.name}</p>
                  <p className="text-sm text-muted-foreground">{p.location} · {p.areaM2} m²</p>
                </div>
                <PropertyBadge status={p.status} />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{p.description}</p>
              <p className="mt-4 font-display text-xl font-bold tabular">{formatCOP(p.monthlyRent)}<span className="text-sm font-normal text-muted-foreground"> /mes</span></p>
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}
