import { createContext } from 'react';
import type { FieldPatch, FieldType, FormConfig, MoveDirection, ParentId } from '../types/form';
import type { BuilderState } from './builderReducer';

/**
 * State and actions live in separate contexts. Actions are created once and never
 * change, so components that only dispatch (buttons, editors) don't re-render
 * when the tree changes — they re-render only when their own `field` prop does.
 */

export interface BuilderActions {
  addField: (type: FieldType, parentId?: ParentId) => void;
  updateField: (id: string, patch: FieldPatch) => void;
  removeField: (id: string) => void;
  moveField: (id: string, direction: MoveDirection) => void;
  replaceConfig: (config: FormConfig) => void;
}

export const BuilderStateContext = createContext<BuilderState | null>(null);
export const BuilderActionsContext = createContext<BuilderActions | null>(null);
