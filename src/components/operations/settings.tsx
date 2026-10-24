import { useState } from "react";
import { Pencil, Settings, Download, Plus, ShieldCheck, FlaskConical, Ban } from "lucide-react";
import { services } from "@/services";
import { formatDateTime, formatCOP, todayBogota } from "@/lib/format";
import type {
  BusinessSetting,
  HardwareDeviceConfig,
  IntegrationSummary,
} from "@/domain/operations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, Empty } from "@/components/app/ui-bits";
import {
  useBusiness,
  useAction,
  Field,
  SelectField,
  NumberField,
  FormModal,
  Submit,
  Status,
  Table,
  cell,
  ConfirmReason,
  ExportButton,
} from "./common";

export function SettingsPage() {
  const d = useBusiness();
  const { run, busy } = useAction();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [edit, setEdit] = useState<BusinessSetting | null>(null);
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [effective, setEffective] = useState(todayBogota());
  const [device, setDevice] = useState<HardwareDeviceConfig | null>(null);
  return (
    <>
      <PageHeader title="Configuración del negocio" />
      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <Input
          aria-label="Buscar configuración"
          placeholder="Buscar parámetro"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-12"
        />
        <SelectField
          label="Categoría"
          value={category}
          onChange={setCategory}
          options={[...new Set(d.settings.map((s) => s.category))].map((c) => ({ id: c, name: c }))}
        />
      </div>
      <Table heads={["Parámetro", "Valor", "Estado", "Actualizado", "Acción"]}>
        {d.settings
          .filter(
            (s) =>
              (!category || s.category === category) &&
              s.label.toLowerCase().includes(search.toLowerCase()),
          )
          .map((s) => (
            <tr key={s.id}>
              <td className={cell}>
                <strong>{s.label}</strong>
                <p className="text-xs">{s.category}</p>
              </td>
              <td className={cell}>
                {s.value || "Pendiente de configurar"} {s.value && s.unit}
              </td>
              <td className={cell}>
                <Status warning={s.status !== "configurado"}>
                  {s.status.replaceAll("_", " ")}
                </Status>
              </td>
              <td className={cell}>
                <p className="text-xs">
                  {s.updatedBy}
                  <br />
                  {formatDateTime(s.updatedAt)}
                </p>
              </td>
              <td className={cell}>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Editar ${s.label}`}
                  title="Editar configuración"
                  onClick={() => {
                    setEdit(s);
                    setValue(s.value);
                    setReason("");
                    setEffective(todayBogota());
                  }}
                >
                  <Pencil />
                </Button>
              </td>
            </tr>
          ))}
      </Table>
      <h2 className="mb-3 mt-8 text-xl font-bold">Hardware</h2>
      <Table heads={["Dispositivo", "Modelo / protocolo", "Estado", "Acciones"]}>
        {d.hardware.map((h) => (
          <tr key={h.id}>
            <td className={cell}>{h.name}</td>
            <td className={cell}>
              {h.model || "Pendiente"} · {h.protocol || "Pendiente"}
            </td>
            <td className={cell}>
              <Status warning>{h.status}</Status>
            </td>
            <td className={cell}>
              <Button variant="ghost" onClick={() => setDevice({ ...h })}>
                <Pencil />
                Configurar
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  run(
                    () => services.hardware.test(h.id),
                    "Prueba simulada: compatibilidad real pendiente",
                  )
                }
              >
                Probar · demo
              </Button>
            </td>
          </tr>
        ))}
      </Table>
      <h2 className="mb-3 mt-8 text-xl font-bold">Historial de cambios</h2>
      <Table heads={["Parámetro", "Antes → después", "Vigencia", "Responsable / motivo"]}>
        {d.versions.map((v) => (
          <tr key={v.id}>
            <td className={cell}>{d.settings.find((s) => s.id === v.settingId)?.label}</td>
            <td className={cell}>
              {v.before || "Vacío"} → {v.after || "Vacío"}
            </td>
            <td className={cell}>{v.effectiveFrom}</td>
            <td className={cell}>
              {v.actor}
              <p className="text-xs">{v.reason}</p>
            </td>
          </tr>
        ))}
      </Table>
      <FormModal title={edit?.label ?? "Configuración"} open={!!edit} onClose={() => setEdit(null)}>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await run(async () => {
              if (edit) await services.businessSettings.update(edit.id, value, reason, effective);
              return true;
            });
            if (ok) setEdit(null);
          }}
        >
          <p>
            Actual: {edit?.value || "Pendiente de configurar"} {edit?.unit}
          </p>
          <Field label={`Nuevo valor ${edit?.unit ?? ""}`}>
            <Input value={value} onChange={(e) => setValue(e.target.value)} />
          </Field>
          <Field label="Vigencia">
            <Input
              type="date"
              required
              value={effective}
              onChange={(e) => setEffective(e.target.value)}
            />
          </Field>
          <Field label="Motivo">
            <Input required value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <p className="text-xs text-muted-foreground">
            El cambio aplica desde su vigencia y conserva la versión anterior.
          </p>
          <Submit busy={busy}>Confirmar cambio</Submit>
        </form>
      </FormModal>
      <FormModal title="Configurar dispositivo" open={!!device} onClose={() => setDevice(null)}>
        {device && (
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await run(async () => {
                await services.hardware.save({
                  ...device,
                  status:
                    device.model && device.protocol
                      ? "Configurado · pendiente de validar"
                      : "Pendiente de configurar",
                });
                return true;
              });
              if (ok) setDevice(null);
            }}
          >
            {(["model", "connection", "protocol", "note"] as const).map((key) => (
              <Field
                label={
                  {
                    model: "Modelo",
                    connection: "Conexión",
                    protocol: "Protocolo / formato",
                    note: "Notas de instalación",
                  }[key]
                }
                key={key}
              >
                <Input
                  value={device[key]}
                  onChange={(e) => setDevice({ ...device, [key]: e.target.value })}
                />
              </Field>
            ))}
            <Submit busy={busy} />
          </form>
        )}
      </FormModal>
    </>
  );
}
export function AuditPage({ technical = false }: { technical?: boolean }) {
  const d = useBusiness();
  const [search, setSearch] = useState("");
  const [module, setModule] = useState("");
  const [date, setDate] = useState("");
  const rows = d.audit.filter(
    (a) =>
      a.technical === technical &&
      (!module || a.module === module) &&
      (!date || todayBogota(new Date(a.createdAt)) === date) &&
      `${a.actor} ${a.action} ${a.entityId} ${a.reason}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <PageHeader
        title={technical ? "Auditoría técnica" : "Auditoría del negocio"}
        action={<ExportButton name="auditoria.csv" rows={rows.map((r) => ({ ...r }))} />}
      />
      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <Input
          aria-label="Buscar auditoría"
          placeholder="Usuario, acción, entidad o motivo"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-12"
        />
        <SelectField
          label="Módulo"
          value={module}
          onChange={setModule}
          options={[...new Set(d.audit.map((a) => a.module))].map((m) => ({ id: m, name: m }))}
        />
        <Field label="Fecha">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-12"
          />
        </Field>
      </div>
      <Table
        heads={["Fecha / responsable", "Módulo / entidad", "Acción / motivo", "Antes → después"]}
      >
        {rows.map((a) => (
          <tr key={a.id}>
            <td className={cell}>
              {a.actor}
              <p className="text-xs">{formatDateTime(a.createdAt)}</p>
            </td>
            <td className={cell}>
              {a.module}
              <p className="text-xs break-all">{a.entityId}</p>
            </td>
            <td className={cell}>
              <strong>{a.action}</strong>
              <p className="text-xs">{a.reason}</p>
            </td>
            <td className={`${cell} max-w-xs break-words text-xs`}>
              {a.before.slice(0, 200)} → {a.after.slice(0, 200)}
            </td>
          </tr>
        ))}
      </Table>
      {!rows.length && <Empty title="Sin eventos con estos filtros" />}
    </>
  );
}
export function IntegrationsPage() {
  const d = useBusiness();
  const { run, busy } = useAction();
  const [edit, setEdit] = useState<IntegrationSummary | null>(null);
  const [environment, setEnvironment] = useState("sandbox");
  const [replace, setReplace] = useState(false);
  const [production, setProduction] = useState(false);
  const [disable, setDisable] = useState("");
  return (
    <>
      <PageHeader
        title="Administración técnica"
        subtitle="Integraciones de demostración · Sin conexiones reales"
      />
      <div className="grid gap-4 md:grid-cols-2">
        {d.integrations.map((i) => (
          <article className="rounded-lg border bg-card p-5" key={i.id}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-2xl font-bold">{i.name}</h2>
              <Status warning={i.status !== "prueba_simulada"}>
                {i.status.replaceAll("_", " ")}
              </Status>
            </div>
            <p className="my-4 text-sm">
              Entorno: {i.environment}
              <br />
              Credencial: {i.configured ? `••••••••${i.maskedSuffix}` : "No configurada"}
              <br />
              Última prueba: {i.lastTestAt ? formatDateTime(i.lastTestAt) : "Pendiente"}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  setEdit(i);
                  setEnvironment(i.environment);
                  setReplace(false);
                  setProduction(false);
                }}
              >
                <Settings />
                Configurar
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  run(
                    () => services.integrations.test(i.id),
                    "Prueba ficticia completada; no se realizó conexión real",
                  )
                }
              >
                <FlaskConical />
                Probar · demo
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Desactivar ${i.name}`}
                title="Desactivar"
                onClick={() => setDisable(i.id)}
              >
                <Ban />
              </Button>
            </div>
          </article>
        ))}
      </div>
      <section className="mt-8 border-y py-5">
        <h2 className="font-bold">Seguridad</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Sesión local de demostración · MFA no implementado · Sin acceso a caja, recetas ni nómina.
        </p>
      </section>
      <FormModal
        title={`Configurar ${edit?.name ?? ""}`}
        open={!!edit}
        onClose={() => setEdit(null)}
      >
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (environment === "produccion" && !production) return;
            const ok = await run(async () => {
              if (edit)
                await services.integrations.save(
                  edit.id,
                  environment as "sandbox" | "produccion",
                  replace,
                );
              return true;
            });
            if (ok) setEdit(null);
          }}
        >
          <SelectField
            label="Entorno"
            value={environment}
            onChange={setEnvironment}
            options={[
              { id: "sandbox", name: "Sandbox" },
              { id: "produccion", name: "Producción (solo representación)" },
            ]}
          />
          <p>
            Credencial actual:{" "}
            {edit?.configured ? `••••••••${edit.maskedSuffix}` : "No configurada"}
          </p>
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={replace}
              onChange={(e) => setReplace(e.target.checked)}
            />
            Reemplazar por credencial ficticia DEMO
          </label>
          <p className="text-xs text-muted-foreground">
            No ingresar claves reales. Sin reemplazo se conserva la credencial ficticia existente.
          </p>
          {environment === "produccion" && (
            <label className="flex gap-2 text-sm">
              <input
                required
                type="checkbox"
                checked={production}
                onChange={(e) => setProduction(e.target.checked)}
              />
              Confirmo entorno de producción representado, sin conexión real
            </label>
          )}
          <Submit busy={busy} />
        </form>
      </FormModal>
      <ConfirmReason
        title="Desactivar integración"
        open={!!disable}
        onClose={() => setDisable("")}
        onConfirm={(r) => services.integrations.disable(disable, r)}
      />
    </>
  );
}
