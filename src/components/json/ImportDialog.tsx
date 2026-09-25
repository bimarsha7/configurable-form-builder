import { useId, useState, type ChangeEvent } from 'react';
import { parseFormConfig } from '../../lib/schema';
import { countFields } from '../../lib/tree';
import { useBuilderActions } from '../../state/hooks';
import { Icon } from '../ui/Icon';
import { Modal } from '../ui/Modal';

const PLACEHOLDER = `{
  "version": 1,
  "fields": [
    { "id": "name", "type": "text", "label": "Name", "required": true },
    { "id": "age", "type": "number", "label": "Age", "required": false, "min": 0, "max": 120 }
  ]
}`;

/** Max errors listed at once; a badly broken file could otherwise produce hundreds. */
const MAX_LISTED_ERRORS = 8;

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImported: (message: string) => void;
}

export function ImportDialog({ open, onClose, onImported }: ImportDialogProps) {
  const { replaceConfig } = useBuilderActions();
  const textareaId = useId();
  const errorsId = useId();
  const [text, setText] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  const close = () => {
    setErrors([]);
    onClose();
  };

  const handleImport = () => {
    const result = parseFormConfig(text);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    replaceConfig(result.config);
    const total = countFields(result.config.fields);
    const note = result.warnings.length > 0 ? ` (${result.warnings.length} missing id(s) generated)` : '';
    onImported(`Imported ${total} field${total === 1 ? '' : 's'}${note}.`);
    setText('');
    close();
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    setText(await file.text());
    setErrors([]);
  };

  return (
    <Modal
      open={open}
      title="Import configuration"
      onClose={close}
      footer={
        <>
          <label className="button file-button">
            <Icon name="upload" /> Load file…
            <input
              type="file"
              accept="application/json,.json"
              className="visually-hidden"
              onChange={handleFile}
            />
          </label>
          <button type="button" className="button" onClick={close}>
            Cancel
          </button>
          <button type="button" className="button button--primary" onClick={handleImport}>
            Import
          </button>
        </>
      }
    >
      <label htmlFor={textareaId} className="control__label">
        Paste a JSON configuration
      </label>
      <p className="control__hint">This replaces the current form.</p>
      <textarea
        id={textareaId}
        className="textarea"
        value={text}
        rows={16}
        spellCheck={false}
        placeholder={PLACEHOLDER}
        aria-invalid={errors.length > 0 || undefined}
        aria-describedby={errors.length > 0 ? errorsId : undefined}
        onChange={(event) => {
          setText(event.target.value);
          if (errors.length > 0) setErrors([]);
        }}
      />
      {errors.length > 0 && (
        <div id={errorsId} className="alert alert--error" role="alert">
          <p>Couldn't import this configuration:</p>
          <ul>
            {errors.slice(0, MAX_LISTED_ERRORS).map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
          {errors.length > MAX_LISTED_ERRORS && (
            <p>…and {errors.length - MAX_LISTED_ERRORS} more.</p>
          )}
        </div>
      )}
    </Modal>
  );
}
