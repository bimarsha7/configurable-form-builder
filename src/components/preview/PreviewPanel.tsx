import { usePreviewForm } from '../../hooks/usePreviewForm';
import { useBuilderState } from '../../state/hooks';
import { PreviewFields } from './PreviewFields';

export function PreviewPanel() {
  const { fields } = useBuilderState();
  const form = usePreviewForm(fields);
  const showSummary = form.submitAttempted && form.errorCount > 0;

  return (
    <section className="panel panel--preview" aria-labelledby="preview-heading">
      <header className="panel__header">
        <div>
          <h2 id="preview-heading" className="panel__title">
            Live preview
          </h2>
          <p className="panel__subtitle">Updates as you edit the structure</p>
        </div>
      </header>

      <div className="panel__body">
        {fields.length === 0 ? (
          <p className="field-list__empty">Your form preview will appear here.</p>
        ) : (
          <form className="preview-form" noValidate onSubmit={form.handleSubmit}>
            <PreviewFields
              fields={fields}
              values={form.values}
              visibleError={form.visibleError}
              onChange={form.setValue}
              onBlur={form.markTouched}
            />

            <div role="status" aria-live="polite" className="preview-form__status">
              {showSummary && (
                <p className="alert alert--error">
                  Please fix {form.errorCount} error{form.errorCount === 1 ? '' : 's'} before
                  submitting.
                </p>
              )}
              {form.submission && <p className="alert alert--success">Form is valid.</p>}
            </div>

            <div className="preview-form__actions">
              <button type="submit" className="button button--primary">
                Submit
              </button>
              <button type="button" className="button" onClick={form.reset}>
                Reset
              </button>
            </div>

            {form.submission && (
              <div className="submission">
                <h3 className="submission__title">Submitted values</h3>
                <pre className="code-block">{JSON.stringify(form.submission, null, 2)}</pre>
              </div>
            )}
          </form>
        )}
      </div>
    </section>
  );
}
