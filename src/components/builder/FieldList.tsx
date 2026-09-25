import { memo } from 'react';
import type { FieldConfig } from '../../types/form';
import { FieldEditor } from './FieldEditor';

interface FieldListProps {
  fields: FieldConfig[];
  depth: number;
  lastAddedId: string | null;
  emptyMessage: string;
}

export const FieldList = memo(function FieldList({
  fields,
  depth,
  lastAddedId,
  emptyMessage,
}: FieldListProps) {
  if (fields.length === 0) {
    return <p className="field-list__empty">{emptyMessage}</p>;
  }

  return (
    <ol className="field-list">
      {fields.map((field, index) => (
        <FieldEditor
          key={field.id}
          field={field}
          index={index}
          siblingCount={fields.length}
          depth={depth}
          lastAddedId={lastAddedId}
        />
      ))}
    </ol>
  );
});
