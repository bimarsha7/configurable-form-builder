import { useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';
import { createField } from '../lib/tree';
import { CONFIG_VERSION, type FormConfig } from '../types/form';
import { builderReducer, createInitialState } from './builderReducer';
import { BuilderActionsContext, BuilderStateContext, type BuilderActions } from './contexts';

interface BuilderProviderProps {
  initialConfig?: FormConfig;
  onChange?: (config: FormConfig) => void;
  children: ReactNode;
}

export function BuilderProvider({ initialConfig, onChange, children }: BuilderProviderProps) {
  const [state, dispatch] = useReducer(builderReducer, initialConfig, createInitialState);

  const actions = useMemo<BuilderActions>(
    () => ({
      addField: (type, parentId = null) =>
        dispatch({ type: 'field/add', parentId, field: createField(type) }),
      updateField: (id, patch) => dispatch({ type: 'field/update', id, patch }),
      removeField: (id) => dispatch({ type: 'field/remove', id }),
      moveField: (id, direction) => dispatch({ type: 'field/move', id, direction }),
      replaceConfig: (config) => dispatch({ type: 'config/replace', config }),
    }),
    [],
  );

  // Keep the latest callback in a ref so a new inline `onChange` from the parent
  // doesn't re-fire the effect; it runs only when the fields actually change.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    onChangeRef.current?.({ version: CONFIG_VERSION, fields: state.fields });
  }, [state.fields]);

  return (
    <BuilderActionsContext value={actions}>
      <BuilderStateContext value={state}>{children}</BuilderStateContext>
    </BuilderActionsContext>
  );
}
