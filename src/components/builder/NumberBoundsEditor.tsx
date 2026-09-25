import { memo, useId, useState } from 'react';
import { parseNumberInput } from '../../lib/validation';
import { useBuilderActions } from '../../state/hooks';
import type { NumberField } from '../../types/form';

type Bound = 'min' | 'max';

const toDraft = (value: number | undefined) => (value === undefined ? '' : String(value));

/**
 * Min/max editor.
 *
 * Each input keeps a local draft string so intermediate input like "-" or "1e"
 * can be typed. A draft is committed to the config only when it is a valid number
 * (or empty, which clears the bound) and keeps min <= max. Otherwise the error is
 * shown and the last valid value stays in effect; on blur the draft reverts to it.
 * The config therefore never holds bounds that the import validator would reject.
 */
export const NumberBoundsEditor = memo(function NumberBoundsEditor({
  field,
}: {
  field: NumberField;
}) {
  const { updateField } = useBuilderActions();
  const baseId = useId();
  const [drafts, setDrafts] = useState({ min: toDraft(field.min), max: toDraft(field.max) });
  const [errors, setErrors] = useState<Partial<Record<Bound, string>>>({});

  // Sync drafts when the committed values change from outside (e.g. an import).
  // Adjusting state during render is React's recommended alternative to an effect here.
  const [committed, setCommitted] = useState({ min: field.min, max: field.max });
  if (committed.min !== field.min || committed.max !== field.max) {
    setCommitted({ min: field.min, max: field.max });
    setDrafts((prev) => ({
      min: parseDraft(prev.min) === field.min ? prev.min : toDraft(field.min),
      max: parseDraft(prev.max) === field.max ? prev.max : toDraft(field.max),
    }));
  }

  const handleChange = (bound: Bound, raw: string) => {
    setDrafts((prev) => ({ ...prev, [bound]: raw }));

    const parsed = parseNumberInput(raw);
    if (parsed.kind === 'invalid') {
      setErrors((prev) => ({ ...prev, [bound]: 'Enter a valid number.' }));
      return;
    }
    const value = parsed.kind === 'ok' ? parsed.value : undefined;
    const min = bound === 'min' ? value : field.min;
    const max = bound === 'max' ? value : field.max;
    if (min !== undefined && max !== undefined && min > max) {
      setErrors((prev) => ({
        ...prev,
        [bound]: bound === 'min' ? `Min can't exceed max (${max}).` : `Max can't be below min (${min}).`,
      }));
      return;
    }
    setErrors((prev) => ({ ...prev, [bound]: undefined }));
    updateField(field.id, { [bound]: value });
  };

  const handleBlur = (bound: Bound) => {
    if (!errors[bound]) return;
    setDrafts((prev) => ({ ...prev, [bound]: toDraft(field[bound]) }));
    setErrors((prev) => ({ ...prev, [bound]: undefined }));
  };

  return (
    <div className="bounds">
      {(['min', 'max'] as const).map((bound) => {
        const inputId = `${baseId}-${bound}`;
        const errorId = `${inputId}-error`;
        const error = errors[bound];
        return (
          <div key={bound} className="control">
            <label htmlFor={inputId} className="control__label">
              {bound === 'min' ? 'Min' : 'Max'} <span className="muted">(optional)</span>
            </label>
            <input
              id={inputId}
              className="input"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="None"
              value={drafts[bound]}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              onChange={(event) => handleChange(bound, event.target.value)}
              onBlur={() => handleBlur(bound)}
            />
            {error && (
              <p id={errorId} className="control__error" role="alert">
                {error}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
});

function parseDraft(raw: string): number | undefined {
  const parsed = parseNumberInput(raw);
  return parsed.kind === 'ok' ? parsed.value : undefined;
}
