import { memo, useId } from 'react';
import { displayLabel, type FormValues } from '../../lib/validation';
import type { FieldConfig, GroupField, InputField, NumberField } from '../../types/form';

type ErrorLookup = (id: string) => string | undefined;

interface PreviewFieldsProps {
  fields: FieldConfig[];
  values: FormValues;
  visibleError: ErrorLookup;
  onChange: (id: string, value: string) => void;
  onBlur: (id: string) => void;
}

/** Recursively renders the configured fields as a real, accessible form. */
export function PreviewFields({ fields, ...rest }: PreviewFieldsProps) {
  return fields.map((field) =>
    field.type === 'group' ? (
      <GroupPreview key={field.id} field={field} {...rest} />
    ) : (
      <InputPreview
        key={field.id}
        field={field}
        value={rest.values[field.id] ?? ''}
        error={rest.visibleError(field.id)}
        onChange={rest.onChange}
        onBlur={rest.onBlur}
      />
    ),
  );
}

function GroupPreview({ field, ...rest }: { field: GroupField } & Omit<PreviewFieldsProps, 'fields'>) {
  const errorId = useId();
  const error = rest.visibleError(field.id);

  return (
    <fieldset
      className="preview-group"
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? errorId : undefined}
      // Focusable only programmatically, so a failed submit can move focus here.
      tabIndex={error ? -1 : undefined}
    >
      <legend className="preview-group__legend">
        {displayLabel(field)}
        {field.required && <RequiredMark />}
      </legend>
      {error && (
        <p id={errorId} className="control__error">
          {error}
        </p>
      )}
      {field.children.length === 0 ? (
        <p className="muted">No fields in this group.</p>
      ) : (
        <PreviewFields fields={field.children} {...rest} />
      )}
    </fieldset>
  );
}

function numberHint({ min, max }: NumberField): string | undefined {
  if (min !== undefined && max !== undefined) return `Between ${min} and ${max}`;
  if (min !== undefined) return `Minimum ${min}`;
  if (max !== undefined) return `Maximum ${max}`;
  return undefined;
}

interface InputPreviewProps {
  field: InputField;
  value: string;
  error: string | undefined;
  onChange: (id: string, value: string) => void;
  onBlur: (id: string) => void;
}

/**
 * Memoised on primitive props, so typing in one input re-renders only that input.
 *
 * Number fields deliberately use `type="text"` + `inputMode="decimal"` instead of
 * `type="number"`: native number inputs behave differently per browser (Chrome
 * blocks letters, Firefox accepts them but reports an empty value), which would make
 * "12abc" either impossible to type or silently read as empty. Keeping the raw text
 * and validating it ourselves gives the same, visible behaviour everywhere.
 */
const InputPreview = memo(function InputPreview({
  field,
  value,
  error,
  onChange,
  onBlur,
}: InputPreviewProps) {
  const inputId = useId();
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const hint = field.type === 'number' ? numberHint(field) : undefined;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="control">
      <label htmlFor={inputId} className="control__label">
        {displayLabel(field)}
        {field.required && <RequiredMark />}
      </label>
      <input
        id={inputId}
        className="input"
        type="text"
        inputMode={field.type === 'number' ? 'decimal' : undefined}
        autoComplete="off"
        value={value}
        aria-required={field.required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(event) => onChange(field.id, event.target.value)}
        onBlur={() => onBlur(field.id)}
      />
      {hint && (
        <p id={hintId} className="control__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="control__error">
          {error}
        </p>
      )}
    </div>
  );
});

function RequiredMark() {
  return (
    <span className="required-mark" aria-hidden="true">
      {' '}*
    </span>
  );
}
