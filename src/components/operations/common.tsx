import { useState, type ReactNode } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { q, useRefresh } from '@/hooks/use-data';
import { errorMessage } from '@/services';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription } from '@/components/ui/dialog';
import { Download, Loader2 } from 'lucide-react';

export function useBusiness() { return useSuspenseQuery(q.business()).data; }
export function useAction() {
  const [busy, setBusy] = useState(false); const refresh = useRefresh();
  const run = async (fn: () => Promise<unknown>, success = 'Guardado en esta demostración') => { setBusy(true); try { const result = await fn(); await refresh(); toast.success(success); return result; } catch(e) { toast.error(errorMessage(e)); return undefined; } finally { setBusy(false); } };
  return { run, busy };
}
export function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block space-y-2 text-sm font-medium"><span>{label}</span>{children}</label>; }
export function NumberField({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (n:number)=>void; step?: number }) { return <Field label={label}><Input type="number" step={step} value={value} onChange={e=>onChange(Number(e.target.value))} className="h-12 text-base" /></Field>; }
export function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v:string)=>void; options: {id:string;name:string}[] }) { return <Field label={label}><select aria-label={label} value={value} onChange={e=>onChange(e.target.value)} className="h-12 w-full min-w-0 rounded-md border bg-background px-3 text-base"><option value="">Selecciona…</option>{options.map(o=><option value={o.id} key={o.id}>{o.name}</option>)}</select></Field>; }
export function FormModal({ title, open, onClose, children }: { title: string; open: boolean; onClose:()=>void; children: ReactNode }) { return <Dialog open={open} onOpenChange={v=>{if(!v)onClose();}}><DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>Datos locales de demostración</DialogDescription></DialogHeader>{children}</DialogContent></Dialog>; }
export function Submit({ busy, children = 'Confirmar' }: { busy: boolean; children?: ReactNode }) { return <Button type="submit" size="xl" className="w-full" disabled={busy}>{busy && <Loader2 className="animate-spin" />}{children}</Button>; }
export function Status({ children, warning = false }: { children: ReactNode; warning?:boolean }) { return <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${warning?'bg-warning/15 text-warning-foreground dark:text-warning':'bg-success/10 text-success'}`}>{children}</span>; }
export function downloadCsv(name:string, rows:Record<string,unknown>[]) { if(!rows.length) return; const keys=Object.keys(rows[0] ?? {}); const csv=[keys.join(','),...rows.map(r=>keys.map(k=>`"${String(r[k]??'').replaceAll('"','""')}"`).join(','))].join('\n'); const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));a.download=name;a.click();URL.revokeObjectURL(a.href); }
export function ExportButton({name,rows}:{name:string;rows:Record<string,unknown>[]}) { return <Button variant="outline" onClick={()=>downloadCsv(name,rows)} disabled={!rows.length}><Download />Exportar CSV</Button>; }
export function Table({ heads, children }: { heads:string[]; children:ReactNode }) { return <div className="overflow-x-auto border-y"><table className="w-full text-left text-sm"><thead className="bg-muted/60"><tr>{heads.map(h=><th className="whitespace-nowrap px-3 py-3 font-semibold" key={h}>{h}</th>)}</tr></thead><tbody className="divide-y">{children}</tbody></table></div>; }
export const cell='px-3 py-3 align-middle';
export function ConfirmReason({ title, open, onClose, onConfirm }: { title:string;open:boolean;onClose:()=>void;onConfirm:(reason:string)=>Promise<unknown> }) { const [reason,setReason]=useState('');const {run,busy}=useAction();return <FormModal title={title} open={open} onClose={onClose}><form className="space-y-4" onSubmit={async e=>{e.preventDefault();const ok=await run(async()=>{await onConfirm(reason);return true;});if(ok)onClose();}}><Label htmlFor="action-reason">Motivo obligatorio</Label><Input id="action-reason" required value={reason} onChange={e=>setReason(e.target.value)} /><Submit busy={busy} /></form></FormModal>; }
