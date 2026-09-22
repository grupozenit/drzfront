import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isRowClick, rowActionProps } from '@/lib/utils/row-click';

// Entorno `node`: un DOM mínimo con lo que usa el helper (contains/closest).
class FakeElement {
  parent: FakeElement | null = null;
  constructor(public tag: string, public attrs: Record<string, string> = {}) {}
  append(child: FakeElement) {
    child.parent = this;
    return child;
  }
  contains(other: FakeElement | null): boolean {
    for (let node = other; node; node = node.parent) if (node === this) return true;
    return false;
  }
  closest(selector: string): FakeElement | null {
    const interactive = ['a', 'button', 'input', 'select', 'textarea', 'label', 'summary'];
    for (let node: FakeElement | null = this; node; node = node.parent) {
      if (selector.includes(node.tag) && interactive.includes(node.tag)) return node;
      if (node.attrs.role && selector.includes(`[role='${node.attrs.role}']`)) return node;
    }
    return null;
  }
}

let selectionText = '';

beforeEach(() => {
  vi.stubGlobal('Element', FakeElement);
  vi.stubGlobal('window', { getSelection: () => ({ toString: () => selectionText }) });
  selectionText = '';
});

afterEach(() => vi.unstubAllGlobals());

function click(row: FakeElement, target: FakeElement, extra: Record<string, unknown> = {}) {
  return { currentTarget: row, target, button: 0, defaultPrevented: false, ...extra } as never;
}

describe('isRowClick', () => {
  it('acepta un clic en una celda de la fila', () => {
    const row = new FakeElement('tr');
    const cell = row.append(new FakeElement('td'));
    expect(isRowClick(click(row, cell))).toBe(true);
  });

  it('ignora clics que llegan por un portal (menú, fondo del menú, calendario)', () => {
    const row = new FakeElement('tr');
    const portalItem = new FakeElement('button'); // en document.body, fuera de la fila
    expect(isRowClick(click(row, portalItem))).toBe(false);
    expect(isRowClick(click(row, new FakeElement('div')))).toBe(false);
  });

  it('ignora clics en controles internos de la fila', () => {
    const row = new FakeElement('tr');
    const menuButton = row.append(new FakeElement('td')).append(new FakeElement('button'));
    const icon = menuButton.append(new FakeElement('svg'));
    expect(isRowClick(click(row, icon))).toBe(false);
  });

  it('no abre nada si el usuario está seleccionando texto', () => {
    const row = new FakeElement('tr');
    const cell = row.append(new FakeElement('td'));
    selectionText = 'EQ-001';
    expect(isRowClick(click(row, cell))).toBe(false);
  });

  it('ignora el botón derecho/medio y eventos ya manejados', () => {
    const row = new FakeElement('tr');
    const cell = row.append(new FakeElement('td'));
    expect(isRowClick(click(row, cell, { button: 1 }))).toBe(false);
    expect(isRowClick(click(row, cell, { defaultPrevented: true }))).toBe(false);
  });
});

describe('rowActionProps', () => {
  it('sin permiso no agrega nada', () => {
    expect(rowActionProps(() => {}, false)).toEqual({});
  });

  it('Enter o Espacio sobre la fila activan; sobre un control interno no', () => {
    const onActivate = vi.fn();
    const props = rowActionProps(onActivate, true) as { onKeyDown: (e: never) => void; tabIndex: number };
    const row = new FakeElement('tr');
    const key = (k: string, target: FakeElement) =>
      ({ key: k, target, currentTarget: row, preventDefault: () => {} }) as never;

    expect(props.tabIndex).toBe(0);
    props.onKeyDown(key('Enter', row));
    props.onKeyDown(key(' ', row));
    props.onKeyDown(key('Enter', row.append(new FakeElement('button'))));
    props.onKeyDown(key('a', row));
    expect(onActivate).toHaveBeenCalledTimes(2);
  });
});
