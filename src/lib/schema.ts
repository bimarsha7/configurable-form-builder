import { CONFIG_VERSION, type FieldConfig, type FormConfig } from '../types/form';
import { createId } from './tree';

/**
 * Parsing and validation for imported configurations.
 *
 * Imported JSON is untrusted, so it is checked field by field and rebuilt into a
 * clean object: unknown keys are dropped, missing ids are generated, and every
 * problem is reported with a JSON-path-like location so the user can fix it.
 */

export type ParseResult =
  | { ok: true; config: FormConfig; warnings: string[] }
  | { ok: false; errors: string[] };

/** Guards against pathological input blowing the stack during recursion. */
export const MAX_DEPTH = 32;

const FIELD_TYPES = new Set(['text', 'number', 'group']);

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

interface Ctx {
  errors: string[];
  warnings: string[];
  seenIds: Set<string>;
}

function parseField(raw: unknown, path: string, depth: number, ctx: Ctx): FieldConfig | null {
  if (!isObject(raw)) {
    ctx.errors.push(`${path}: expected an object`);
    return null;
  }
  if (depth > MAX_DEPTH) {
    ctx.errors.push(`${path}: groups are nested more than ${MAX_DEPTH} levels deep`);
    return null;
  }

  const { type, label, required } = raw;
  if (typeof type !== 'string' || !FIELD_TYPES.has(type)) {
    ctx.errors.push(`${path}.type: must be one of "text", "number", "group"`);
    return null;
  }

  let id: string;
  if (raw.id === undefined) {
    id = createId();
    ctx.warnings.push(`${path}: missing "id", one was generated`);
  } else if (typeof raw.id !== 'string' || raw.id.trim() === '') {
    ctx.errors.push(`${path}.id: must be a non-empty string`);
    return null;
  } else {
    id = raw.id;
  }
  if (ctx.seenIds.has(id)) {
    ctx.errors.push(`${path}.id: duplicate id "${id}"`);
    return null;
  }
  ctx.seenIds.add(id);

  if (typeof label !== 'string') {
    ctx.errors.push(`${path}.label: must be a string`);
    return null;
  }
  if (required !== undefined && typeof required !== 'boolean') {
    ctx.errors.push(`${path}.required: must be a boolean`);
    return null;
  }
  const base = { id, label, required: required ?? false };

  switch (type) {
    case 'text':
      return { ...base, type };

    case 'number': {
      const bounds: { min?: number; max?: number } = {};
      for (const key of ['min', 'max'] as const) {
        const value = raw[key];
        if (value === undefined || value === null) continue;
        if (typeof value !== 'number' || !Number.isFinite(value)) {
          ctx.errors.push(`${path}.${key}: must be a finite number`);
          return null;
        }
        bounds[key] = value;
      }
      if (bounds.min !== undefined && bounds.max !== undefined && bounds.min > bounds.max) {
        ctx.errors.push(`${path}: "min" (${bounds.min}) is greater than "max" (${bounds.max})`);
        return null;
      }
      return { ...base, type, ...bounds };
    }

    case 'group': {
      if (!Array.isArray(raw.children)) {
        ctx.errors.push(`${path}.children: must be an array`);
        return null;
      }
      const children = parseFields(raw.children, `${path}.children`, depth + 1, ctx);
      return { ...base, type, children };
    }
  }
  return null;
}

function parseFields(raw: unknown[], path: string, depth: number, ctx: Ctx): FieldConfig[] {
  const fields: FieldConfig[] = [];
  raw.forEach((item, index) => {
    const field = parseField(item, `${path}[${index}]`, depth, ctx);
    if (field) fields.push(field);
  });
  return fields;
}

/**
 * Accepts either the exported shape `{ version, fields }` or a bare array of fields.
 * The import is all-or-nothing: any error rejects the whole configuration so the
 * user never ends up with a silently truncated form.
 */
export function parseFormConfig(text: string): ParseResult {
  if (text.trim() === '') return { ok: false, errors: ['Paste a JSON configuration first.'] };

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { ok: false, errors: [`Invalid JSON: ${reason}`] };
  }

  const ctx: Ctx = { errors: [], warnings: [], seenIds: new Set() };
  let rawFields: unknown;

  if (Array.isArray(data)) {
    rawFields = data;
  } else if (isObject(data)) {
    if (data.version !== undefined && data.version !== CONFIG_VERSION) {
      return {
        ok: false,
        errors: [`Unsupported version ${JSON.stringify(data.version)} (expected ${CONFIG_VERSION}).`],
      };
    }
    rawFields = data.fields;
  }

  if (!Array.isArray(rawFields)) {
    return {
      ok: false,
      errors: ['Expected an object with a "fields" array, or an array of fields.'],
    };
  }

  const fields = parseFields(rawFields, 'fields', 0, ctx);
  if (ctx.errors.length > 0) return { ok: false, errors: ctx.errors };
  return { ok: true, config: { version: CONFIG_VERSION, fields }, warnings: ctx.warnings };
}

export function serializeFormConfig(config: FormConfig): string {
  return JSON.stringify(config, null, 2);
}
