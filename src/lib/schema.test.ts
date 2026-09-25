import { describe, expect, it } from 'vitest';
import { exampleConfig } from '../exampleConfig';
import { MAX_DEPTH, parseFormConfig, serializeFormConfig } from './schema';

const errorsOf = (text: string) => {
  const result = parseFormConfig(text);
  if (result.ok) throw new Error('expected parse to fail');
  return result.errors;
};

describe('parseFormConfig', () => {
  it('round-trips an exported config', () => {
    const result = parseFormConfig(serializeFormConfig(exampleConfig));
    expect(result).toEqual({ ok: true, config: exampleConfig, warnings: [] });
  });

  it('accepts a bare array of fields', () => {
    const result = parseFormConfig('[{"id":"a","type":"text","label":"A"}]');
    expect(result.ok && result.config.fields).toEqual([
      { id: 'a', type: 'text', label: 'A', required: false },
    ]);
  });

  it('generates missing ids with a warning and strips unknown keys', () => {
    const result = parseFormConfig('{"fields":[{"type":"text","label":"A","extra":1}]}');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config.fields[0].id).toEqual(expect.any(String));
    expect(result.config.fields[0]).not.toHaveProperty('extra');
    expect(result.warnings).toHaveLength(1);
  });

  it('reports invalid JSON', () => {
    expect(errorsOf('{ nope')[0]).toMatch(/^Invalid JSON/);
    expect(errorsOf('   ')[0]).toMatch(/Paste/);
  });

  it('reports structural problems with a path', () => {
    const errors = errorsOf(
      JSON.stringify({
        fields: [
          { id: 'a', type: 'date', label: 'A' },
          { id: 'b', type: 'number', label: 'B', min: 'one' },
          { id: 'g', type: 'group', label: 'G', children: [{ id: 'c', type: 'text' }] },
        ],
      }),
    );
    expect(errors).toEqual([
      'fields[0].type: must be one of "text", "number", "group"',
      'fields[1].min: must be a finite number',
      'fields[2].children[0].label: must be a string',
    ]);
  });

  it('rejects duplicate ids, min > max, and unknown versions', () => {
    expect(
      errorsOf('[{"id":"a","type":"text","label":"A"},{"id":"a","type":"text","label":"B"}]'),
    ).toEqual(['fields[1].id: duplicate id "a"']);
    expect(errorsOf('[{"id":"n","type":"number","label":"N","min":5,"max":1}]')[0]).toMatch(
      /greater than/,
    );
    expect(errorsOf('{"version":2,"fields":[]}')[0]).toMatch(/Unsupported version/);
    expect(errorsOf('{"foo":[]}')[0]).toMatch(/"fields" array/);
  });

  it('rejects groups nested beyond the depth limit', () => {
    let node: object = { id: 'leaf', type: 'text', label: 'Leaf' };
    for (let i = 0; i <= MAX_DEPTH + 1; i++) {
      node = { id: `g${i}`, type: 'group', label: 'G', children: [node] };
    }
    expect(errorsOf(JSON.stringify([node]))[0]).toMatch(/nested more than/);
  });
});
