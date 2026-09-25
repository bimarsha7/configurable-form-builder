import { memo } from 'react';
import { useBuilderActions } from '../../state/hooks';
import type { FieldType, ParentId } from '../../types/form';
import { Icon } from '../ui/Icon';

const OPTIONS: { type: FieldType; label: string }[] = [
  { type: 'text', label: 'Text' },
  { type: 'number', label: 'Number' },
  { type: 'group', label: 'Group' },
];

interface AddFieldButtonsProps {
  parentId: ParentId;
  /** Used in accessible names, e.g. "Add text field to Address". */
  targetLabel: string;
  /** Called after a field is added (e.g. to expand a collapsed group). Should be stable. */
  onAdd?: () => void;
}

export const AddFieldButtons = memo(function AddFieldButtons({
  parentId,
  targetLabel,
  onAdd,
}: AddFieldButtonsProps) {
  const { addField } = useBuilderActions();

  return (
    <div className="add-field" role="group" aria-label={`Add field to ${targetLabel}`}>
      {OPTIONS.map(({ type, label }) => (
        <button
          key={type}
          type="button"
          className="button button--ghost button--small"
          onClick={() => {
            addField(type, parentId);
            onAdd?.();
          }}
          aria-label={`Add ${label.toLowerCase()} field to ${targetLabel}`}
        >
          <Icon name="plus" size={14} />
          {label}
        </button>
      ))}
    </div>
  );
});
