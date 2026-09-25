import type { FieldConfig, InputField, NumberField } from '../types/form';

/**
 * Validation for the live preview.
 *
 * Preview values are always kept as the raw strings the user typed. Nothing is
 * coerced while typing, so invalid input (e.g. "12abc" in a number field) stays
 * visible and gets a clear error rather than being silently dropped or turned into NaN.
 */

export type FormValues = Record<string, string>;
export type FormErrors = Record<string, string>;

/** Plain decimal / scientific notation. Rejects hex, "Infinity", and whitespace-only input. */
const NUMBER_PATTERN = /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/;

export type ParsedNumber = { kind: 'empty' } | { kind: 'invalid' } | { kind: 'ok'; value: number };

export function parseNumberInput(raw: string): ParsedNumber {
  const trimmed = raw.trim();
  if (trimmed === '') return { kind: 'empty' };
  if (!NUMBER_PATTERN.test(trimmed)) return { kind: 'invalid' };
  const value = Number(trimmed);
  return Number.isFinite(value) ? { kind: 'ok', value } : { kind: 'invalid' };
}

function isFilled(raw: string | undefined): boolean {
  return raw !== undefined && raw.trim() !== '';
}

export function displayLabel(field: FieldConfig): string {
  return field.label.trim() || 'Untitled field';
}

function validateNumber(field: NumberField, raw: string): string | undefined {
  const parsed = parseNumberInput(raw);
  if (parsed.kind === 'empty') return undefined;
  if (parsed.kind === 'invalid') return 'Enter a valid number.';
  const { min, max } = field;
  if (min !== undefined && max !== undefined && (parsed.value < min || parsed.value > max)) {
    return `Must be between ${min} and ${max}.`;
  }
  if (min !== undefined && parsed.value < min) return `Must be at least ${min}.`;
  if (max !== undefined && parsed.value > max) return `Must be at most ${max}.`;
  return undefined;
}

export function validateInput(field: InputField, raw: string | undefined): string | undefined {
  if (!isFilled(raw)) return field.required ? `${displayLabel(field)} is required.` : undefined;
  return field.type === 'number' ? validateNumber(field, raw!) : undefined;
}

/** True if any input field inside `fields` (at any depth) has a value. */
function hasAnyValue(fields: FieldConfig[], values: FormValues): boolean {
  return fields.some((field) =>
    field.type === 'group' ? hasAnyValue(field.children, values) : isFilled(values[field.id]),
  );
}

/**
 * Validates the whole tree against the current values.
 *
 * Semantics of `required` on a group: at least one field inside it must be filled.
 * Required fields inside a group are always enforced, whether or not the group
 * itself is required.
 */
export function validateForm(fields: FieldConfig[], values: FormValues): FormErrors {
  const errors: FormErrors = {};
  const visit = (list: FieldConfig[]) => {
    for (const field of list) {
      if (field.type === 'group') {
        if (field.required && !hasAnyValue(field.children, values)) {
          errors[field.id] =
            field.children.length === 0
              ? `${displayLabel(field)} is required but has no fields.`
              : `Fill in at least one field in ${displayLabel(field)}.`;
        }
        visit(field.children);
      } else {
        const error = validateInput(field, values[field.id]);
        if (error) errors[field.id] = error;
      }
    }
  };
  visit(fields);
  return errors;
}

export type SubmittedValue =
  | { id: string; label: string; type: 'text'; value: string | null }
  | { id: string; label: string; type: 'number'; value: number | null }
  | { id: string; label: string; type: 'group'; fields: SubmittedValue[] };

/**
 * Converts raw values into typed output, following the current structure.
 * Values for fields that were deleted from the config are naturally left out.
 */
export function buildSubmission(fields: FieldConfig[], values: FormValues): SubmittedValue[] {
  return fields.map((field): SubmittedValue => {
    const { id, label } = field;
    switch (field.type) {
      case 'group':
        return { id, label, type: 'group', fields: buildSubmission(field.children, values) };
      case 'number': {
        const parsed = parseNumberInput(values[id] ?? '');
        return { id, label, type: 'number', value: parsed.kind === 'ok' ? parsed.value : null };
      }
      case 'text': {
        const raw = values[id] ?? '';
        return { id, label, type: 'text', value: raw.trim() === '' ? null : raw };
      }
    }
  });
}
