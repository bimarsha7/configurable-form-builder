import { addField, moveField, removeField, updateField } from '../lib/tree';
import type {
  FieldConfig,
  FieldPatch,
  FormConfig,
  MoveDirection,
  ParentId,
} from '../types/form';

export interface BuilderState {
  fields: FieldConfig[];
  /**
   * Newest field, so its editor can take focus when it mounts. It is kept until the
   * next add/replace (not cleared on every edit) so typing doesn't change it and
   * memoised editors aren't invalidated on each keystroke.
   */
  lastAddedId: string | null;
}

/**
 * Actions carry fully-formed data (e.g. a field with its id already generated)
 * so the reducer stays pure and deterministic, including under StrictMode's
 * double invocation.
 */
export type BuilderAction =
  | { type: 'field/add'; parentId: ParentId; field: FieldConfig }
  | { type: 'field/update'; id: string; patch: FieldPatch }
  | { type: 'field/remove'; id: string }
  | { type: 'field/move'; id: string; direction: MoveDirection }
  | { type: 'config/replace'; config: FormConfig };

export function createInitialState(config?: FormConfig): BuilderState {
  return { fields: config?.fields ?? [], lastAddedId: null };
}

export function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case 'field/add':
      return {
        fields: addField(state.fields, action.parentId, action.field),
        lastAddedId: action.field.id,
      };
    case 'field/update':
      return withFields(state, updateField(state.fields, action.id, action.patch));
    case 'field/remove':
      return withFields(state, removeField(state.fields, action.id));
    case 'field/move':
      return withFields(state, moveField(state.fields, action.id, action.direction));
    case 'config/replace':
      return { fields: action.config.fields, lastAddedId: null };
  }
}

/** Returns the same state object when the tree is unchanged, so consumers skip re-rendering. */
function withFields(state: BuilderState, fields: FieldConfig[]): BuilderState {
  return fields === state.fields ? state : { ...state, fields };
}
