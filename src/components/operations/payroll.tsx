import { useState } from "react";
import { Upload, Plus, FileSpreadsheet } from "lucide-react";
import { services } from "@/services";
import { useSession } from "@/hooks/use-session";
import { currentPeriod, formatCOP, todayBogota } from "@/lib/format";
import type { AttendanceRecord } from "@/domain/operations";
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
  ExportButton,
  downloadCsv,
} from "./common";
import { parseCsv, attendanceRows } from "@/domain/imports";

export function PayrollPage() {
  const d = useBusiness();
  const session = useSession();
  const { run, busy } = useAction();
  const [period, setPeriod] = useState(currentPeriod());
  const [open, setOpen] = useState(false);
  const [employee, setEmployee] = useState("u-planta");
  const [hours, setHours] = useState(1);
  const [reason, setReason] = useState("");
  const [records, setRecords] = useState<Omit<AttendanceRecord, "id">[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [filename, setFilename] = useState("");
  const rows = d.employees
    .filter((e) => e.active && e.role !== "admin")
    .map((e) => {
      const att = d.attendance.filter((a) => a.employeeId === e.id && a.date.startsWith(period));
      const total = att.reduce((s, a) => s + a.hours, 0);
      const extra = att.reduce((s, a) => s + a.overtimeHours, 0);
      const authorized = d.overtime
        .filter((o) => o.employeeId === e.id && o.period === period)
        .reduce((s, o) => s + o.hours, 0);
      const rate = Number(d.settings.find((s) => s.id === "overtime-rate")?.value || 0);
      const base = Math.round((total - extra) * e.hourlyRate);
      const extraPay = Math.round(Math.min(extra, authorized) * e.hourlyRate * (1 + rate / 100));
      return {
        Empleado: e.name,
        Horas: total,
        "Extras autorizadas": Math.min(extra, authorized),
        Base: base,
        "Extras estimadas": extraPay,
        "Total estimado": base + extraPay,
      };
    });
  return (
    <>
      <PageHeader
        title="Asistencia y preliquidación"
        action={
          session?.user.role === "admin" ? (
            <Button onClick={() => setOpen(true)}>
              <Plus />
              Autorizar extras
            </Button>
          ) : undefined
        }
      />
      <p className="mb-5 border-y border-warning/40 bg-warning/10 px-4 py-3 text-sm font-semibold">
        Preliquidación: validar con contador antes de usar como nómina oficial.
      </p>
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <Field label="Periodo">
          <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
        </Field>
        <ExportButton name="preliquidacion-demo.csv" rows={rows} />
        <Button
          variant="outline"
          onClick={() =>
            downloadCsv("asistencia-ejemplo.csv", [
              {
                employeeId: "u-planta",
                date: todayBogota(),
                entry: "08:00",
                exit: "17:00",
                overtimeHours: 1,
              },
            ])
          }
        >
          <FileSpreadsheet />
          Plantilla CSV
        </Button>
        <Field label="Importar asistencia CSV · demostración">
          <Input
            type="file"
            accept=".csv"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setFilename(file.name);
              try {
                const result = attendanceRows(
                  parseCsv(await file.text()),
                  d.employees.map((e) => e.id),
                );
                setRecords(result.valid);
                setErrors(result.errors);
              } catch (err) {
                setRecords([]);
                setErrors([err instanceof Error ? err.message : "No se pudo leer el archivo"]);
              }
            }}
          />
        </Field>
      </div>
      {(filename || errors.length > 0) && (
        <section className="mb-6 border-y py-5">
          <h2 className="font-bold">Vista previa: {filename}</h2>
          <p className="my-2">
            {records.length} filas válidas · {errors.length} errores
          </p>
          {errors.map((err, i) => (
            <p role="alert" className="text-sm text-destructive" key={i}>
              {err}
            </p>
          ))}
          <Table heads={["Empleado", "Fecha", "Entrada", "Salida", "Horas", "Extras"]}>
            {records.map((r, i) => (
              <tr key={i}>
                <td className={cell}>{r.employeeId}</td>
                <td className={cell}>{r.date}</td>
                <td className={cell}>{r.entry}</td>
                <td className={cell}>{r.exit}</td>
                <td className={cell}>{r.hours}</td>
                <td className={cell}>{r.overtimeHours}</td>
              </tr>
            ))}
          </Table>
          <Button
            className="mt-4"
            disabled={!records.length || busy}
            onClick={async () => {
              const ok = await run(async () => {
                await services.payroll.import(records, filename, errors.length);
                return true;
              }, "Asistencia importada");
              if (ok) {
                setFilename("");
                setRecords([]);
                setErrors([]);
              }
            }}
          >
            <Upload />
            Confirmar filas válidas
          </Button>
        </section>
      )}
      <Table heads={Object.keys(rows[0] ?? {})}>
        {rows.map((r, i) => (
          <tr key={i}>
            {Object.values(r).map((v, j) => (
              <td className={cell} key={j}>
                {j >= 3 ? formatCOP(Number(v)) : v}
              </td>
            ))}
          </tr>
        ))}
      </Table>
      <h2 className="mb-3 mt-8 text-xl font-bold">Parámetros aplicados</h2>
      <Table heads={["Parámetro", "Valor", "Validación"]}>
        {d.settings
          .filter((s) => s.category === "Laboral")
          .map((s) => (
            <tr key={s.id}>
              <td className={cell}>{s.label}</td>
              <td className={cell}>
                {s.value ? `${s.value} ${s.unit}` : "Pendiente de configurar"}
              </td>
              <td className={cell}>
                <Status warning>Validar con contador</Status>
              </td>
            </tr>
          ))}
      </Table>
      <h2 className="mb-3 mt-8 text-xl font-bold">Registro por empleado y día</h2>
      <Table heads={["Empleado", "Día", "Entrada / salida", "Horas", "Incidencia"]}>
        {d.attendance
          .filter((a) => a.date.startsWith(period))
          .map((a) => (
            <tr key={a.id}>
              <td className={cell}>{d.employees.find((e) => e.id === a.employeeId)?.name}</td>
              <td className={cell}>{a.date}</td>
              <td className={cell}>
                {a.entry} / {a.exit}
              </td>
              <td className={cell}>{a.hours}</td>
              <td className={cell}>{a.incident}</td>
            </tr>
          ))}
      </Table>
      <FormModal title="Autorizar horas extras" open={open} onClose={() => setOpen(false)}>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await run(async () => {
              await services.payroll.authorize(employee, period, hours, reason);
              return true;
            });
            if (ok) setOpen(false);
          }}
        >
          <SelectField
            label="Empleado"
            value={employee}
            onChange={setEmployee}
            options={d.employees}
          />
          <Field label="Periodo">
            <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
          </Field>
          <NumberField label="Horas autorizadas" value={hours} onChange={setHours} />
          <Field label="Motivo">
            <Input required value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <Submit busy={busy} />
        </form>
      </FormModal>
    </>
  );
}

export function ImportsPage() {
  const d = useBusiness();
  const { run, busy } = useAction();
  const [target, setTarget] = useState("Clientes");
  const [name, setName] = useState("");
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  return (
    <>
      <PageHeader title="Migración de datos" />
      <div className="mb-5 grid max-w-xl gap-4">
        <SelectField
          label="Tipo de importación"
          value={target}
          onChange={(v) => {
            setTarget(v);
            setRows([]);
            setName("");
            setErrors([]);
          }}
          options={["Clientes", "Productos"].map((v) => ({ id: v, name: v }))}
        />
        <Button
          variant="outline"
          onClick={() =>
            downloadCsv(
              "plantilla.csv",
              target === "Clientes"
                ? [{ name: "Cliente ejemplo", document: "DEMO", phone: "" }]
                : [
                    {
                      name: "Producto ejemplo",
                      barcode: "",
                      retailPrice: 25000,
                      wholesalePrice: 22000,
                    },
                  ],
            )
          }
        >
          <FileSpreadsheet />
          Descargar plantilla
        </Button>
        <Field label="Archivo CSV">
          <Input
            type="file"
            accept=".csv"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setName(file.name);
              try {
                const parsed = parseCsv(await file.text());
                const required = target === "Clientes" ? ["name"] : ["name", "retailPrice"];
                if (required.some((k) => !parsed.headers.includes(k)))
                  throw new Error(`Columnas requeridas: ${required.join(", ")}`);
                const valid: Record<string, string>[] = [];
                const issues: string[] = [];
                parsed.rows.forEach((r, i) => {
                  if (
                    !r["name"]?.trim() ||
                    (target === "Productos" &&
                      (!Number.isInteger(Number(r["retailPrice"])) ||
                        Number(r["retailPrice"]) <= 0))
                  )
                    issues.push(`Fila ${i + 2}: nombre o precio inválido`);
                  else valid.push(r);
                });
                setRows(valid);
                setErrors(issues);
              } catch (err) {
                setRows([]);
                setErrors([err instanceof Error ? err.message : "Archivo inválido"]);
              }
            }}
          />
        </Field>
      </div>
      {name && (
        <section className="mb-6 border-y py-5">
          <h2 className="font-bold">En revisión: {name}</h2>
          <p>
            {rows.length} válidas · {errors.length} errores
          </p>
          {errors.map((e, i) => (
            <p key={i} role="alert" className="text-destructive">
              {e}
            </p>
          ))}
          <Table heads={Object.keys(rows[0] ?? {})}>
            {rows.slice(0, 20).map((r, i) => (
              <tr key={i}>
                {Object.values(r).map((v, j) => (
                  <td key={j} className={cell}>
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </Table>
          <Button
            className="mt-4"
            disabled={!rows.length || busy}
            onClick={async () => {
              const ok = await run(async () => {
                await services.imports.record(name, target, rows.length, errors.length, rows);
                return true;
              });
              if (ok) {
                setRows([]);
                setName("");
              }
            }}
          >
            <Upload />
            Confirmar importación
          </Button>
        </section>
      )}
      <Table heads={["Archivo", "Tipo", "Filas / errores", "Estado"]}>
        {d.imports.map((i) => (
          <tr key={i.id}>
            <td className={cell}>{i.name}</td>
            <td className={cell}>{i.target}</td>
            <td className={cell}>
              {i.valid} / {i.errors}
            </td>
            <td className={cell}>
              <Status warning={!!i.errors}>{i.status}</Status>
            </td>
          </tr>
        ))}
      </Table>
      {!d.imports.length && <Empty title="No hay importaciones confirmadas" />}
    </>
  );
}
