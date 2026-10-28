import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Send, RefreshCw, Settings } from "lucide-react";
import { services, errorMessage } from "@/services";
import { formatCOP, formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { PageHeader, Empty, ErrorBox, Loading } from "@/components/app/ui-bits";
import { useBusiness, useAction, SelectField, Table, cell, Status } from "./common";

export function RemindersPage() {
  const d = useBusiness();
  const { run, busy } = useAction();
  const [channel, setChannel] = useState("correo");
  const preview = useQuery({
    queryKey: ["reminders", d.versions.length, d.audit.length],
    queryFn: () => services.reminders.preview(),
    retry: false,
  });
  return (
    <>
      <PageHeader
        title="Recordatorios de arriendo"
        action={
          <Button asChild variant="outline">
            <Link to="/admin/configuracion">
              <Settings />
              Configuración
            </Link>
          </Button>
        }
      />
      <div className="mb-5 border-y py-4 text-sm">
        <strong>Correo y WhatsApp: no conectados</strong>
        <p className="text-muted-foreground">
          Envíos de demostración · No se envían mensajes reales.
        </p>
      </div>
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <SelectField
          label="Canal del aviso"
          value={channel}
          onChange={setChannel}
          options={[
            { id: "correo", name: "Correo" },
            { id: "whatsapp", name: "WhatsApp" },
          ]}
        />
        <Button variant="outline" onClick={() => preview.refetch()}>
          <RefreshCw />
          Actualizar
        </Button>
      </div>
      {preview.isLoading ? (
        <Loading />
      ) : preview.error ? (
        <ErrorBox message={errorMessage(preview.error)} />
      ) : !preview.data?.length ? (
        <Empty title="Sin avisos pendientes" />
      ) : (
        <Table
          heads={["Inquilino", "Periodo / vencimiento", "Canon", "Mensaje", "Estado", "Acción"]}
        >
          {preview.data.map((row) => (
            <tr key={row.tenantId}>
              <td className={cell}>{row.tenantName}</td>
              <td className={cell}>
                {row.period}
                <p className="text-xs">{row.dueDate}</p>
              </td>
              <td className={cell}>{formatCOP(row.amount)}</td>
              <td className={`${cell} max-w-xs whitespace-normal`}>{row.message}</td>
              <td className={cell}>
                <Status warning={!row.eligible}>{row.status}</Status>
              </td>
              <td className={cell}>
                <Button
                  disabled={busy || !row.eligible}
                  onClick={async () => {
                    await run(
                      () =>
                        services.reminders.simulate(row.tenantId, channel as "correo" | "whatsapp"),
                      "Aviso simulado registrado; no se envió ningún mensaje",
                    );
                    await preview.refetch();
                  }}
                >
                  <Send />
                  Simular aviso
                </Button>
              </td>
            </tr>
          ))}
        </Table>
      )}
      <h2 className="mb-3 mt-8 text-xl font-bold">Historial de avisos simulados</h2>
      <Table heads={["Fecha", "Inquilino", "Canal", "Mensaje", "Responsable"]}>
        {d.audit
          .filter((a) => a.module === "Recordatorios")
          .map((a) => (
            <tr key={a.id}>
              <td className={cell}>{formatDateTime(a.createdAt)}</td>
              <td className={cell}>{a.entityId}</td>
              <td className={cell}>{a.action}</td>
              <td className={`${cell} max-w-sm whitespace-normal`}>{a.reason}</td>
              <td className={cell}>{a.actor}</td>
            </tr>
          ))}
      </Table>
    </>
  );
}
