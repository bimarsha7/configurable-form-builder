import type { FormConfig } from './types/form';

/** Seed shown on first visit so every feature (incl. nested groups) is visible immediately. */
export const exampleConfig: FormConfig = {
  version: 1,
  fields: [
    { id: 'full-name', type: 'text', label: 'Full name', required: true },
    { id: 'age', type: 'number', label: 'Age', required: true, min: 18, max: 120 },
    {
      id: 'address',
      type: 'group',
      label: 'Address',
      required: false,
      children: [
        { id: 'street', type: 'text', label: 'Street', required: true },
        { id: 'city', type: 'text', label: 'City', required: false },
        {
          id: 'geo',
          type: 'group',
          label: 'Coordinates',
          required: false,
          children: [
            { id: 'lat', type: 'number', label: 'Latitude', required: false, min: -90, max: 90 },
            { id: 'lng', type: 'number', label: 'Longitude', required: false, min: -180, max: 180 },
          ],
        },
      ],
    },
  ],
};
