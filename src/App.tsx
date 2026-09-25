import { ConfigurableFormBuilder } from './components/ConfigurableFormBuilder';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { exampleConfig } from './exampleConfig';
import { usePersistedConfig } from './hooks/usePersistedConfig';
import { useTheme } from './hooks/useTheme';

const STORAGE_KEY = 'configurable-form-builder:config';

export default function App() {
  const [initialConfig, saveConfig] = usePersistedConfig(STORAGE_KEY, exampleConfig);
  const { preference, setPreference } = useTheme();

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <h1 className="app__title">Configurable Form Builder</h1>
          <p className="app__subtitle">
            Build a form from text, number and nested group fields, preview it live, and
            export or import it as JSON.
          </p>
        </div>
        <ThemeSwitcher value={preference} onChange={setPreference} />
      </header>
      <main>
        <ConfigurableFormBuilder initialConfig={initialConfig} onChange={saveConfig} />
      </main>
    </div>
  );
}
