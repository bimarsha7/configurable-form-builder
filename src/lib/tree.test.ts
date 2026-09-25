import { describe, expect, it } from 'vitest';
import type { FieldConfig, GroupField } from '../types/form';
import {
  addField,
  countFields,
  createField,
  findField,
  findParentId,
  moveField,
  removeField,
  updateField,
} from './tree';

const tree = (): FieldConfig[] => [
  { id: 'a', type: 'text', label: 'A', required: false },
  {
    id: 'g',
    type: 'group',
    label: 'G',
    required: false,
    children: [
      { id: 'b', type: 'number', label: 'B', required: false, min: 1 },
      { id: 'c', type: 'text', label: 'C', required: false },
      {
        id: 'g2',
        type: 'group',
        label: 'G2',
        required: false,
        children: [{ id: 'd', type: 'text', label: 'D', required: false }],
      },
    ],
  },
];

const ids = (fields: FieldConfig[]) => fields.map((f) => f.id);
const group = (fields: FieldConfig[], id: string) => findField(fields, id) as GroupField;

describe('createField', () => {
  it('creates each type with sensible defaults', () => {
    expect(createField('text', 'x')).toEqual({ id: 'x', type: 'text', label: 'Text field', required: false });
    expect(createField('number', 'x')).toEqual({ id: 'x', type: 'number', label: 'Number field', required: false });
    expect(createField('group', 'x')).toMatchObject({ type: 'group', children: [] });
  });
});

describe('addField', () => {
  it('appends to the root', () => {
    expect(ids(addField(tree(), null, createField('text', 'new')))).toEqual(['a', 'g', 'new']);
  });

  it('appends into a deeply nested group without touching other branches', () => {
    const before = tree();
    const after = addField(before, 'g2', createField('text', 'new'));
    expect(ids(group(after, 'g2').children)).toEqual(['d', 'new']);
    expect(after[0]).toBe(before[0]); // structural sharing
  });
});

describe('updateField', () => {
  it('patches label and required on a nested field', () => {
    const after = updateField(tree(), 'd', { label: 'Renamed', required: true });
    expect(findField(after, 'd')).toMatchObject({ label: 'Renamed', required: true });
  });

  it('sets and clears number bounds', () => {
    const withMax = updateField(tree(), 'b', { max: 10 });
    expect(findField(withMax, 'b')).toMatchObject({ min: 1, max: 10 });
    const cleared = updateField(withMax, 'b', { min: undefined });
    expect(findField(cleared, 'b')).not.toHaveProperty('min');
  });

  it('ignores min/max on non-number fields', () => {
    const after = updateField(tree(), 'a', { min: 3 });
    expect(findField(after, 'a')).not.toHaveProperty('min');
  });

  it('returns the same reference when nothing changes', () => {
    const before = tree();
    expect(updateField(before, 'a', { label: 'A' })).toBe(before);
    expect(updateField(before, 'missing', { label: 'x' })).toBe(before);
  });
});

describe('removeField', () => {
  it('removes a nested field', () => {
    expect(ids(group(removeField(tree(), 'c'), 'g').children)).toEqual(['b', 'g2']);
  });

  it('removes a group with all its descendants', () => {
    const after = removeField(tree(), 'g');
    expect(ids(after)).toEqual(['a']);
    expect(findField(after, 'd')).toBeUndefined();
  });
});

describe('moveField', () => {
  it('moves within the same group', () => {
    expect(ids(group(moveField(tree(), 'c', 'up'), 'g').children)).toEqual(['c', 'b', 'g2']);
    expect(ids(group(moveField(tree(), 'c', 'down'), 'g').children)).toEqual(['b', 'g2', 'c']);
  });

  it('moves at the root', () => {
    expect(ids(moveField(tree(), 'g', 'up'))).toEqual(['g', 'a']);
  });

  it('is a no-op at the edges (never moves across groups)', () => {
    const before = tree();
    expect(moveField(before, 'b', 'up')).toBe(before);
    expect(moveField(before, 'g2', 'down')).toBe(before);
    expect(moveField(before, 'd', 'up')).toBe(before);
  });
});

describe('lookups', () => {
  it('finds parents and counts all fields', () => {
    const fields = tree();
    expect(findParentId(fields, 'a')).toBeNull();
    expect(findParentId(fields, 'd')).toBe('g2');
    expect(findParentId(fields, 'missing')).toBeUndefined();
    expect(countFields(fields)).toBe(6);
  });
});
