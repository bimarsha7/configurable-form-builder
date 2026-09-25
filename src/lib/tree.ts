import type {
  FieldConfig,
  FieldPatch,
  FieldType,
  GroupField,
  MoveDirection,
  ParentId,
} from '../types/form';

/**
 * Pure, immutable operations over the field tree.
 *
 * Every operation uses structural sharing: only the nodes on the path to the
 * change are recreated, and if nothing changed the original array is returned.
 * That keeps `React.memo` effective — untouched subtrees keep their identity.
 */

export function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

const DEFAULT_LABELS: Record<FieldType, string> = {
  text: 'Text field',
  number: 'Number field',
  group: 'Group',
};

export function createField(type: FieldType, id: string = createId()): FieldConfig {
  const base = { id, label: DEFAULT_LABELS[type], required: false };
  switch (type) {
    case 'text':
      return { ...base, type };
    case 'number':
      return { ...base, type };
    case 'group':
      return { ...base, type, children: [] };
  }
}

export function isGroup(field: FieldConfig): field is GroupField {
  return field.type === 'group';
}

/**
 * Applies `fn` to the sibling list that directly contains the target (the root
 * list when `parentId` is null, otherwise the matching group's children).
 */
function mapSiblings(
  fields: FieldConfig[],
  parentId: ParentId,
  fn: (siblings: FieldConfig[]) => FieldConfig[],
): FieldConfig[] {
  if (parentId === null) return fn(fields);

  let changed = false;
  const next = fields.map((field) => {
    if (!isGroup(field)) return field;
    const children =
      field.id === parentId ? fn(field.children) : mapSiblings(field.children, parentId, fn);
    if (children === field.children) return field;
    changed = true;
    return { ...field, children };
  });
  return changed ? next : fields;
}

/** Finds the id of the list containing `id`: `null` for root, a group id, or `undefined` if absent. */
export function findParentId(
  fields: FieldConfig[],
  id: string,
  parentId: ParentId = null,
): ParentId | undefined {
  for (const field of fields) {
    if (field.id === id) return parentId;
    if (isGroup(field)) {
      const found = findParentId(field.children, id, field.id);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

export function findField(fields: FieldConfig[], id: string): FieldConfig | undefined {
  for (const field of fields) {
    if (field.id === id) return field;
    if (isGroup(field)) {
      const found = findField(field.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

export function addField(
  fields: FieldConfig[],
  parentId: ParentId,
  field: FieldConfig,
): FieldConfig[] {
  return mapSiblings(fields, parentId, (siblings) => [...siblings, field]);
}

export function updateField(fields: FieldConfig[], id: string, patch: FieldPatch): FieldConfig[] {
  let changed = false;
  const next = fields.map((field): FieldConfig => {
    if (field.id === id) {
      const updated = applyPatch(field, patch);
      if (updated !== field) changed = true;
      return updated;
    }
    if (isGroup(field)) {
      const children = updateField(field.children, id, patch);
      if (children !== field.children) {
        changed = true;
        return { ...field, children };
      }
    }
    return field;
  });
  return changed ? next : fields;
}

function applyPatch(field: FieldConfig, patch: FieldPatch): FieldConfig {
  const { label, required, ...numberProps } = patch;
  let next: FieldConfig = field;

  if (label !== undefined && label !== field.label) next = { ...next, label };
  if (required !== undefined && required !== field.required) next = { ...next, required };

  // min/max only exist on number fields; `'min' in patch` with `undefined` clears the bound.
  if (next.type === 'number') {
    for (const key of ['min', 'max'] as const) {
      if (key in numberProps && numberProps[key] !== next[key]) {
        const { [key]: _removed, ...rest } = next;
        next = numberProps[key] === undefined ? rest : { ...rest, [key]: numberProps[key] };
      }
    }
  }
  return next;
}

export function removeField(fields: FieldConfig[], id: string): FieldConfig[] {
  let changed = false;
  const next: FieldConfig[] = [];
  for (const field of fields) {
    if (field.id === id) {
      changed = true;
      continue;
    }
    if (isGroup(field)) {
      const children = removeField(field.children, id);
      if (children !== field.children) {
        changed = true;
        next.push({ ...field, children });
        continue;
      }
    }
    next.push(field);
  }
  return changed ? next : fields;
}

/** Swaps a field with its neighbour inside the same sibling list. No-op at the edges. */
export function moveField(
  fields: FieldConfig[],
  id: string,
  direction: MoveDirection,
): FieldConfig[] {
  const parentId = findParentId(fields, id);
  if (parentId === undefined) return fields;

  return mapSiblings(fields, parentId, (siblings) => {
    const from = siblings.findIndex((f) => f.id === id);
    const to = direction === 'up' ? from - 1 : from + 1;
    if (from < 0 || to < 0 || to >= siblings.length) return siblings;
    const next = [...siblings];
    [next[from], next[to]] = [next[to], next[from]];
    return next;
  });
}

/** Total number of fields in the tree, groups included. */
export function countFields(fields: FieldConfig[]): number {
  return fields.reduce(
    (total, field) => total + 1 + (isGroup(field) ? countFields(field.children) : 0),
    0,
  );
}
