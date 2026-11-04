import { describe, it, expect } from 'vitest';
import {
  findWorkforceError,
  rowsFromReport,
  rowsFromRoster,
  toWorkforceDTO,
} from '@/components/forms/workforce-panel';
import type { Worker } from '@/lib/types';

const worker = (id: string, fullName: string, tipo: 'directo' | 'indirecto'): Worker => ({
  id, projectId: 'p1', projectName: 'P', fullName, empresa: 'Grupo Zenit',
  funcion: 'Ayudante', tipo, estado: 'activo',
});

const roster = [worker('w2', 'Zeta', 'indirecto'), worker('w1', 'Alfa', 'directo'), worker('w3', 'Beta', 'directo')];

describe('listado de personal del parte', () => {
  it('arranca con todo el plantel presente, directos primero', () => {
    const rows = rowsFromRoster(roster);
    expect(rows.map((r) => r.fullName)).toEqual(['Alfa', 'Beta', 'Zeta']);
    expect(rows.every((r) => r.present && r.hours === null)).toBe(true);
  });

  it('con workerId solo viaja el id y las horas; sin él, los datos completos', () => {
    const rows = rowsFromRoster(roster);
    rows[1] = { ...rows[1], present: false };
    rows.push({
      key: 'x', fullName: 'Eventual', empresa: 'Grupo Zenit', funcion: 'Ayudante',
      tipo: 'directo', present: true, hours: '4', adHoc: true,
    });
    expect(toWorkforceDTO(rows, 9)).toEqual([
      { workerId: 'w1', hours: 9 },
      { workerId: 'w2', hours: 9 },
      { fullName: 'Eventual', empresa: 'Grupo Zenit', funcion: 'Ayudante', tipo: 'directo', hours: 4 },
    ]);
  });

  it('al editar, suma sin tildar al resto de la plantilla', () => {
    const rows = rowsFromReport(
      [{ id: 'e1', workerId: 'w1', fullName: 'Alfa', empresa: 'Grupo Zenit', funcion: 'Ayudante', tipo: 'directo', hours: 8 }],
      roster,
    );
    expect(rows.filter((r) => r.present).map((r) => r.fullName)).toEqual(['Alfa']);
    expect(rows).toHaveLength(3);
  });

  it('rechaza horas fuera de 0-24 solo en los presentes', () => {
    const rows = rowsFromRoster(roster);
    rows[0] = { ...rows[0], hours: '25' };
    expect(findWorkforceError(rows, 9)).toMatch(/Alfa/);
    rows[0] = { ...rows[0], present: false };
    expect(findWorkforceError(rows, 9)).toBeNull();
    rows[1] = { ...rows[1], hours: 'abc' };
    expect(findWorkforceError(rows, 9)).toMatch(/Beta/);
  });
});
