import { use, useMemo } from 'react';
import { CONFIG_VERSION, type FormConfig } from '../types/form';
import type { BuilderState } from './builderReducer';
import { BuilderActionsContext, BuilderStateContext, type BuilderActions } from './contexts';
export function useBuilderState(): BuilderState {
  const state = use(BuilderStateContext);
  if (!state) throw new Error('useBuilderState must be used inside <BuilderProvider>');
  return state;
}

export function useBuilderActions(): BuilderActions {
  const actions = use(BuilderActionsContext);
  if (!actions) throw new Error('useBuilderActions must be used inside <BuilderProvider>');
  return actions;
}

/** The current tree as a serialisable config object (memoised on the tree identity). */
export function useFormConfig(): FormConfig {
  const { fields } = useBuilderState();
  return useMemo(() => ({ version: CONFIG_VERSION, fields }), [fields]);
}
