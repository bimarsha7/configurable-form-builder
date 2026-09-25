import { useCallback, useMemo, useState, type FormEvent } from 'react';
import type { FieldConfig } from '../types/form';
import {
  buildSubmission,
  validateForm,
  type FormErrors,
  type FormValues,
  type SubmittedValue,
} from '../lib/validation';

/**
 * Minimal form state for the live preview (no form library).
 *
 * - Values are keyed by field id, so they survive reordering, relabelling and
 *   changes to min/max; errors are re-derived from the current config on every render.
 * - Errors surface once a field is touched (blurred) or after a submit attempt,
 *   so the user isn't shouted at before they've typed anything.
 */
export function usePreviewForm(fields: FieldConfig[]) {
  const [values, setValues] = useState<FormValues>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submission, setSubmission] = useState<SubmittedValue[] | null>(null);

  // A previous submission no longer reflects the form once its structure changes.
  const [submittedFields, setSubmittedFields] = useState(fields);
  if (submittedFields !== fields) {
    setSubmittedFields(fields);
    if (submission) setSubmission(null);
  }

  const errors: FormErrors = useMemo(() => validateForm(fields, values), [fields, values]);
  const errorCount = Object.keys(errors).length;

  const setValue = useCallback((id: string, value: string) => {
    setValues((prev) => ({ ...prev, [id]: value }));
    setSubmission(null);
  }, []);

  const markTouched = useCallback((id: string) => {
    setTouched((prev) => (prev[id] ? prev : { ...prev, [id]: true }));
  }, []);

  const visibleError = (id: string): string | undefined =>
    touched[id] || submitAttempted ? errors[id] : undefined;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitAttempted(true);
    if (errorCount > 0) {
      setSubmission(null);
      // Move focus to the first invalid control so keyboard/screen-reader users land on it.
      const form = event.currentTarget;
      requestAnimationFrame(() => {
        form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      });
      return;
    }
    setSubmission(buildSubmission(fields, values));
  };

  const reset = useCallback(() => {
    setValues({});
    setTouched({});
    setSubmitAttempted(false);
    setSubmission(null);
  }, []);

  return {
    values,
    errors,
    errorCount,
    submitAttempted,
    submission,
    visibleError,
    setValue,
    markTouched,
    handleSubmit,
    reset,
  };
}
