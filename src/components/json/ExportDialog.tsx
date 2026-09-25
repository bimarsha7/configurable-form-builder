import { useEffect, useId, useMemo, useState } from 'react';
import { serializeFormConfig } from '../../lib/schema';
import { useFormConfig } from '../../state/hooks';
import { Icon } from '../ui/Icon';
import { Modal } from '../ui/Modal';

type CopyState = 'idle' | 'copied' | 'failed';

export function ExportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const config = useFormConfig();
  const json = useMemo(() => serializeFormConfig(config), [config]);
  const textareaId = useId();
  const [copyState, setCopyState] = useState<CopyState>('idle');

  useEffect(() => {
    if (copyState === 'idle') return;
    const timer = window.setTimeout(() => setCopyState('idle'), 2000);
    return () => window.clearTimeout(timer);
  }, [copyState]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'form-config.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal
      open={open}
      title="Export configuration"
      onClose={onClose}
      footer={
        <>
          <span role="status" className="muted">
            {copyState === 'copied' && 'Copied to clipboard'}
            {copyState === 'failed' && 'Copy failed — select the text and copy manually'}
          </span>
          <button type="button" className="button" onClick={download}>
            <Icon name="download" /> Download
          </button>
          <button type="button" className="button button--primary" onClick={copy}>
            <Icon name="copy" /> Copy JSON
          </button>
        </>
      }
    >
      <label htmlFor={textareaId} className="control__label">
        Form configuration (JSON)
      </label>
      <textarea
        id={textareaId}
        className="textarea"
        value={json}
        readOnly
        rows={18}
        spellCheck={false}
        onFocus={(event) => event.currentTarget.select()}
      />
    </Modal>
  );
}
