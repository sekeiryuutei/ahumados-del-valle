import {describe,expect,it} from 'vitest';
import {parseCsv,attendanceRows} from './imports';
describe('importación de asistencia',()=>{
 it('reconoce columnas CSV y separa errores antes de confirmar',()=>{const result=attendanceRows(parseCsv('employeeId,date,entry,exit,overtimeHours\nu-planta,2026-10-21,08:00,17:00,1\ninexistente,2026-10-21,08:00,17:00,1'),['u-planta']);expect(result.valid[0]?.hours).toBe(9);expect(result.errors).toHaveLength(1);});
 it('rechaza extras superiores al trabajo',()=>{expect(attendanceRows(parseCsv('employeeId,date,entry,exit,overtimeHours\nu-planta,2026-10-21,08:00,09:00,2'),['u-planta']).valid).toHaveLength(0);});
});
