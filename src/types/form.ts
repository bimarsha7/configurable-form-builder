/**
 * Form configuration model.
 *
 * Fields are a discriminated union on `type`, so type-specific properties
 * (min/max for numbers, children for groups) are only reachable after narrowing.
 */

export type FieldType = 'text' | 'number' | 'group';

interface BaseField {
  id: string;
  label: string;
  required: boolean;
}

export interface TextField extends BaseField {
  type: 'text';
}

export interface NumberField extends BaseField {
  type: 'number';
  min?: number;
  max?: number;
}

export interface GroupField extends BaseField {
  type: 'group';
  children: FieldConfig[];
}

export type FieldConfig = TextField | NumberField | GroupField;

/** Input fields are the ones that hold a value in the preview (i.e. not groups). */
export type InputField = TextField | NumberField;

/** Serialisable root of a form. `version` allows the format to evolve safely. */
export interface FormConfig {
  version: 1;
  fields: FieldConfig[];
}

export const CONFIG_VERSION = 1 as const;

/**
 * Editable properties for a field. `type`, `id` and `children` are structural and
 * change only through dedicated tree operations, never through a property patch.
 */
export type FieldPatch = Partial<Pick<BaseField, 'label' | 'required'>> &
  Partial<Pick<NumberField, 'min' | 'max'>>;

/** Parent id for insertion; `null` means the form root. */
export type ParentId = string | null;

export type MoveDirection = 'up' | 'down';
