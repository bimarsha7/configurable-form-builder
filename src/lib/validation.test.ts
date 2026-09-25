import { describe, expect, it } from 'vitest';
import type { FieldConfig } from '../types/form';
import { buildSubmission, parseNumberInput, validateForm } from './validation';

describe('parseNumberInput', () => {
  it.each([
    ['', 'empty'],
    ['   ', 'empty'],
    ['42', 'ok'],
    ['-3.5', 'ok'],
    ['.5', 'ok'],
    ['1e3', 'ok'],
    ['abc', 'invalid'],
    ['12abc', 'invalid'],
    ['0x10', 'invalid'],
    ['Infinity', 'invalid'],
    ['1e999', 'invalid'],
    ['-', 'invalid'],
  ])('%j -> %s', (raw, kind) => {
    expect(parseNumberInput(raw).kind).toBe(kind);
  });
});

const fields: FieldConfig[] = [
  { id: 'name', type: 'text', label: 'Name', required: true },
  { id: 'age', type: 'number', label: 'Age', required: false, min: 18, max: 99 },
  {
    id: 'g',
    type: 'group',
    label: 'Contact',
    required: true,
    children: [
      { id: 'email', type: 'text', label: 'Email', required: false },
      { id: 'phone', type: 'text', label: 'Phone', required: false },
    ],
  },
];

describe('validateForm', () => {
  it('flags required fields and required groups', () => {
    expect(validateForm(fields, {})).toEqual({
      name: 'Name is required.',
      g: 'Fill in at least one field in Contact.',
    });
  });

  it('treats whitespace as empty', () => {
    expect(validateForm(fields, { name: '   ', email: 'x' })).toHaveProperty('name');
  });

  it('validates numbers and bounds', () => {
    const base = { name: 'Ann', email: 'a@b.c' };
    expect(validateForm(fields, { ...base, age: 'abc' })).toEqual({ age: 'Enter a valid number.' });
    expect(validateForm(fields, { ...base, age: '5' })).toEqual({ age: 'Must be between 18 and 99.' });
    expect(validateForm(fields, { ...base, age: '30' })).toEqual({});
  });

  it('enforces required children even when the group is optional', () => {
    const optionalGroup: FieldConfig[] = [
      {
        id: 'g',
        type: 'group',
        label: 'G',
        required: false,
        children: [{ id: 'x', type: 'text', label: 'X', required: true }],
      },
    ];
    expect(validateForm(optionalGroup, {})).toEqual({ x: 'X is required.' });
  });
});

describe('buildSubmission', () => {
  it('produces typed, nested output and ignores values of removed fields', () => {
    const output = buildSubmission(fields, { name: 'Ann', age: '30', email: '', stale: 'x' });
    expect(output).toEqual([
      { id: 'name', label: 'Name', type: 'text', value: 'Ann' },
      { id: 'age', label: 'Age', type: 'number', value: 30 },
      {
        id: 'g',
        label: 'Contact',
        type: 'group',
        fields: [
          { id: 'email', label: 'Email', type: 'text', value: null },
          { id: 'phone', label: 'Phone', type: 'text', value: null },
        ],
      },
    ]);
  });
});
