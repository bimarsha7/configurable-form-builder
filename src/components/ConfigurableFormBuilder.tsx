import { useState } from 'react';
import { BuilderProvider } from '../state/BuilderProvider';
import { useBuilderActions, useBuilderState } from '../state/hooks';
import { CONFIG_VERSION, type FormConfig } from '../types/form';
import { BuilderPanel } from './builder/BuilderPanel';
import { ExportDialog } from './json/ExportDialog';
import { ImportDialog } from './json/ImportDialog';
import { PreviewPanel } from './preview/PreviewPanel';
import { Icon } from './ui/Icon';

export interface ConfigurableFormBuilderProps {
  /** Starting configuration. Read once on mount (uncontrolled). */
  initialConfig?: FormConfig;
  /** Called whenever the configuration changes, e.g. to persist it. */
  onChange?: (config: FormConfig) => void;
}

/**
 * Self-contained form builder: structure editor, live preview and JSON
 * import/export, all sharing state through `BuilderProvider`.
 */
export function ConfigurableFormBuilder({ initialConfig, onChange }: ConfigurableFormBuilderProps) {
  return (
    <BuilderProvider initialConfig={initialConfig} onChange={onChange}>
      <BuilderLayout />
    </BuilderProvider>
  );
}

type Dialog = 'export' | 'import' | null;

function BuilderLayout() {
  const { fields } = useBuilderState();
  const { replaceConfig } = useBuilderActions();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [notice, setNotice] = useState('');
  const closeDialog = () => setDialog(null);

  const clearAll = () => {
    if (fields.length === 0) return;
    if (!window.confirm('Remove all fields from the form?')) return;
    replaceConfig({ version: CONFIG_VERSION, fields: [] });
    setNotice('Form cleared.');
  };

  return (
    <div className="form-builder">
      <div className="toolbar" role="toolbar" aria-label="Configuration">
        <p role="status" className="toolbar__notice muted">
          {notice}
        </p>
        <button type="button" className="button" onClick={() => setDialog('import')}>
          <Icon name="upload" /> Import JSON
        </button>
        <button type="button" className="button" onClick={() => setDialog('export')}>
          <Icon name="download" /> Export JSON
        </button>
        <button
          type="button"
          className="button button--danger-ghost"
          onClick={clearAll}
          disabled={fields.length === 0}
        >
          Clear
        </button>
      </div>

      <div className="form-builder__panels">
        <BuilderPanel />
        <PreviewPanel />
      </div>

      <ExportDialog open={dialog === 'export'} onClose={closeDialog} />
      <ImportDialog open={dialog === 'import'} onClose={closeDialog} onImported={setNotice} />
    </div>
  );
}
