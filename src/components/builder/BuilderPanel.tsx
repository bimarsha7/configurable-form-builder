import { countFields } from '../../lib/tree';
import { useBuilderState } from '../../state/hooks';
import { AddFieldButtons } from './AddFieldButtons';
import { FieldList } from './FieldList';

export function BuilderPanel() {
  const { fields, lastAddedId } = useBuilderState();
  const total = countFields(fields);

  return (
    <section className="panel" aria-labelledby="builder-heading">
      <header className="panel__header">
        <div>
          <h2 id="builder-heading" className="panel__title">
            Structure
          </h2>
          <p className="panel__subtitle">
            {total === 0 ? 'No fields yet' : `${total} field${total === 1 ? '' : 's'}`}
          </p>
        </div>
        <AddFieldButtons parentId={null} targetLabel="form" />
      </header>
      <div className="panel__body">
        <FieldList
          fields={fields}
          depth={0}
          lastAddedId={lastAddedId}
          emptyMessage="Start by adding a text, number or group field."
        />
      </div>
    </section>
  );
}
