import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { FormConfig } from '../types/form';
import { ConfigurableFormBuilder } from './ConfigurableFormBuilder';

const builder = () => screen.getByRole('region', { name: 'Structure' });
const preview = () => screen.getByRole('region', { name: 'Live preview' });

function setup(initialConfig?: FormConfig) {
  const onChange = vi.fn();
  const user = userEvent.setup();
  render(<ConfigurableFormBuilder initialConfig={initialConfig} onChange={onChange} />);
  return { user, onChange };
}

describe('ConfigurableFormBuilder', () => {
  it('adds fields and reflects them in the preview immediately', async () => {
    const { user } = setup();
    expect(within(preview()).getByText(/preview will appear here/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add text field to form' }));
    // The new field's label input is focused and selected, so typing replaces it.
    await user.keyboard('First name');

    expect(within(preview()).getByLabelText('First name')).toBeInTheDocument();
  });

  it('supports nested groups', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Add group field to form' }));
    await user.keyboard('Outer');
    await user.click(screen.getByRole('button', { name: 'Add group field to Outer' }));
    await user.keyboard('Inner');
    await user.click(screen.getByRole('button', { name: 'Add number field to Inner' }));
    await user.keyboard('Qty');

    const outer = within(preview()).getByRole('group', { name: 'Outer' });
    const inner = within(outer).getByRole('group', { name: 'Inner' });
    expect(within(inner).getByLabelText('Qty')).toBeInTheDocument();
  });

  it('validates required fields and invalid numbers in the preview', async () => {
    const { user } = setup({
      version: 1,
      fields: [
        { id: 'name', type: 'text', label: 'Name', required: true },
        { id: 'qty', type: 'number', label: 'Qty', required: false, min: 1, max: 5 },
      ],
    });
    const form = within(preview());

    await user.click(form.getByRole('button', { name: 'Submit' }));
    expect(form.getByText('Name is required.')).toBeInTheDocument();
    expect(form.getByLabelText(/Name/)).toHaveAttribute('aria-invalid', 'true');

    await user.type(form.getByLabelText(/Name/), 'Ann');
    await user.type(form.getByLabelText('Qty'), '12abc');
    // Invalid text stays visible rather than being coerced or dropped.
    expect(form.getByLabelText('Qty')).toHaveValue('12abc');
    expect(form.getByText('Enter a valid number.')).toBeInTheDocument();

    await user.clear(form.getByLabelText('Qty'));
    await user.type(form.getByLabelText('Qty'), '9');
    expect(form.getByText('Must be between 1 and 5.')).toBeInTheDocument();

    await user.clear(form.getByLabelText('Qty'));
    await user.type(form.getByLabelText('Qty'), '3');
    await user.click(form.getByRole('button', { name: 'Submit' }));
    expect(form.getByText('Form is valid.')).toBeInTheDocument();
    expect(form.getByText(/"value": 3/)).toBeInTheDocument();
  });

  it('toggles required and updates the preview live', async () => {
    const { user } = setup({
      version: 1,
      fields: [{ id: 'a', type: 'text', label: 'Nick', required: false }],
    });
    await user.click(within(preview()).getByRole('button', { name: 'Submit' }));
    expect(within(preview()).getByText('Form is valid.')).toBeInTheDocument();

    await user.click(within(builder()).getByRole('checkbox', { name: /Required/ }));
    await user.click(within(preview()).getByRole('button', { name: 'Submit' }));
    expect(within(preview()).getByText('Nick is required.')).toBeInTheDocument();
  });

  it('reorders fields within a group and deletes fields', async () => {
    const { user, onChange } = setup({
      version: 1,
      fields: [
        { id: 'a', type: 'text', label: 'Alpha', required: false },
        { id: 'b', type: 'text', label: 'Beta', required: false },
      ],
    });
    expect(screen.getByRole('button', { name: 'Move "Alpha" up' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Move "Beta" up' }));
    const labels = within(preview())
      .getAllByRole('textbox')
      .map((input) => input.closest('.control')?.querySelector('label')?.textContent);
    expect(labels).toEqual(['Beta', 'Alpha']);

    await user.click(screen.getByRole('button', { name: 'Delete "Alpha"' }));
    expect(within(preview()).queryByLabelText('Alpha')).not.toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith({
      version: 1,
      fields: [{ id: 'b', type: 'text', label: 'Beta', required: false }],
    });
  });

  it('rejects min greater than max in the builder', async () => {
    const { user, onChange } = setup({
      version: 1,
      fields: [{ id: 'n', type: 'number', label: 'N', required: false, max: 5 }],
    });
    await user.type(within(builder()).getByLabelText(/Min/), '10');
    expect(within(builder()).getByRole('alert')).toHaveTextContent("Min can't exceed max (5).");
    expect(onChange).not.toHaveBeenCalledWith(
      expect.objectContaining({ fields: [expect.objectContaining({ min: 10 })] }),
    );
  });

  it('exports the configuration as JSON and imports it back', async () => {
    const config: FormConfig = {
      version: 1,
      fields: [{ id: 'x', type: 'text', label: 'Exported', required: true }],
    };
    const { user } = setup(config);

    await user.click(screen.getByRole('button', { name: /Export JSON/ }));
    const exported = screen.getByLabelText('Form configuration (JSON)') as HTMLTextAreaElement;
    expect(JSON.parse(exported.value)).toEqual(config);
    await user.click(screen.getByRole('button', { name: 'Close' }));

    await user.click(screen.getByRole('button', { name: /Import JSON/ }));
    const textarea = screen.getByLabelText('Paste a JSON configuration');

    await user.click(textarea);
    await user.paste('{"fields": [{"type": "unknown"}]}');
    await user.click(screen.getByRole('button', { name: 'Import' }));
    expect(screen.getByRole('alert')).toHaveTextContent('fields[0].type');

    await user.clear(textarea);
    await user.paste(
      JSON.stringify({
        version: 1,
        fields: [
          {
            id: 'g',
            type: 'group',
            label: 'Imported group',
            required: false,
            children: [{ id: 'y', type: 'number', label: 'Imported number', required: false }],
          },
        ],
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Import' }));

    expect(screen.getByText('Imported 2 fields.')).toBeInTheDocument();
    expect(within(preview()).getByRole('group', { name: 'Imported group' })).toBeInTheDocument();
    expect(within(preview()).getByLabelText('Imported number')).toBeInTheDocument();
    expect(within(preview()).queryByLabelText(/Exported/)).not.toBeInTheDocument();
  });
});
