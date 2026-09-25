import { memo, useCallback, useEffect, useId, useRef, useState } from 'react';
import { countFields } from '../../lib/tree';
import { displayLabel } from '../../lib/validation';
import { useBuilderActions } from '../../state/hooks';
import type { FieldConfig, MoveDirection } from '../../types/form';
import { Icon } from '../ui/Icon';
import { AddFieldButtons } from './AddFieldButtons';
import { FieldList } from './FieldList';
import { NumberBoundsEditor } from './NumberBoundsEditor';

const TYPE_NAMES = { text: 'Text', number: 'Number', group: 'Group' } as const;

interface FieldEditorProps {
  field: FieldConfig;
  index: number;
  siblingCount: number;
  depth: number;
  lastAddedId: string | null;
}

/**
 * Editor card for a single field. Memoised: thanks to structural sharing in the
 * tree operations, editing one field re-renders only the cards on its path.
 */
export const FieldEditor = memo(function FieldEditor({
  field,
  index,
  siblingCount,
  depth,
  lastAddedId,
}: FieldEditorProps) {
  const { updateField, removeField, moveField } = useBuilderActions();
  const labelInputId = useId();
  const labelInputRef = useRef<HTMLInputElement>(null);
  const upRef = useRef<HTMLButtonElement>(null);
  const downRef = useRef<HTMLButtonElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const expand = useCallback(() => setCollapsed(false), []);

  const name = displayLabel(field);
  const isFirst = index === 0;
  const isLast = index === siblingCount - 1;

  // Focus the label of a freshly added field so the user can name it straight away.
  // Only on mount, so later re-renders (or moves) never steal focus.
  const shouldFocusOnMount = useRef(lastAddedId === field.id);
  useEffect(() => {
    const input = labelInputRef.current;
    if (shouldFocusOnMount.current && input) {
      input.focus();
      input.select();
    }
  }, []);

  const handleMove = (direction: MoveDirection) => {
    moveField(field.id, direction);
    // When the card reaches an edge its button becomes disabled and would drop
    // focus to <body>; hand focus to the opposite button instead.
    const reachesEdge = direction === 'up' ? index === 1 : index === siblingCount - 2;
    if (reachesEdge) {
      requestAnimationFrame(() => (direction === 'up' ? downRef : upRef).current?.focus());
    }
  };

  const handleDelete = () => {
    if (field.type === 'group' && field.children.length > 0) {
      const nested = countFields(field.children);
      const confirmed = window.confirm(
        `Delete "${name}" and the ${nested} field${nested === 1 ? '' : 's'} inside it?`,
      );
      if (!confirmed) return;
    }
    removeField(field.id);
  };

  return (
    <li className={`field-card field-card--${field.type}`} data-depth={depth}>
      <div className="field-card__header">
        <span className={`badge badge--${field.type}`}>{TYPE_NAMES[field.type]}</span>

        <div className="field-card__label">
          <label htmlFor={labelInputId} className="visually-hidden">
            Label for {TYPE_NAMES[field.type].toLowerCase()} field {index + 1}
          </label>
          <input
            ref={labelInputRef}
            id={labelInputId}
            className="input input--label"
            type="text"
            value={field.label}
            placeholder="Untitled field"
            autoComplete="off"
            onChange={(event) => updateField(field.id, { label: event.target.value })}
          />
        </div>

        <div className="field-card__actions">
          <button
            ref={upRef}
            type="button"
            className="icon-button"
            onClick={() => handleMove('up')}
            disabled={isFirst}
            aria-label={`Move "${name}" up`}
            title="Move up"
          >
            <Icon name="up" />
          </button>
          <button
            ref={downRef}
            type="button"
            className="icon-button"
            onClick={() => handleMove('down')}
            disabled={isLast}
            aria-label={`Move "${name}" down`}
            title="Move down"
          >
            <Icon name="down" />
          </button>
          <button
            type="button"
            className="icon-button icon-button--danger"
            onClick={handleDelete}
            aria-label={`Delete "${name}"`}
            title="Delete"
          >
            <Icon name="trash" />
          </button>
        </div>
      </div>

      <div className="field-card__settings">
        <label className="checkbox">
          <input
            type="checkbox"
            checked={field.required}
            onChange={(event) => updateField(field.id, { required: event.target.checked })}
          />
          <span>Required</span>
          {field.type === 'group' && (
            <span className="muted"> — at least one field inside must be filled</span>
          )}
        </label>

        {field.type === 'number' && <NumberBoundsEditor field={field} />}
      </div>

      {field.type === 'group' && (
        <div className="group-body">
          <div className="group-body__toolbar">
            <button
              type="button"
              className="disclosure"
              aria-expanded={!collapsed}
              onClick={() => setCollapsed((c) => !c)}
            >
              <Icon name="chevron" size={14} />
              {field.children.length} field{field.children.length === 1 ? '' : 's'}
            </button>
            <AddFieldButtons parentId={field.id} targetLabel={name} onAdd={expand} />
          </div>
          {/* Hidden rather than unmounted, so drafts and focus state survive collapsing. */}
          <div hidden={collapsed}>
            <FieldList
              fields={field.children}
              depth={depth + 1}
              lastAddedId={lastAddedId}
              emptyMessage="This group is empty. Add a field to it above."
            />
          </div>
        </div>
      )}
    </li>
  );
});
