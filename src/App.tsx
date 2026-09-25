import { ConfigurableFormBuilder } from './components/ConfigurableFormBuilder';
import { exampleConfig } from './exampleConfig';
import { usePersistedConfig } from './hooks/usePersistedConfig';

const STORAGE_KEY = 'configurable-form-builder:config';

export default function App() {
  const [initialConfig, saveConfig] = usePersistedConfig(STORAGE_KEY, exampleConfig);

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">Configurable Form Builder</h1>
        <p className="app__subtitle">
          Build a form from text, number and nested group fields, preview it live, and
          export or import it as JSON.
        </p>
      </header>
      <main>
        <ConfigurableFormBuilder initialConfig={initialConfig} onChange={saveConfig} />
      </main>
    </div>
  );
}
