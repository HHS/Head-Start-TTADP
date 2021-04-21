import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';

import GrantLabel from '../GrantLabel';
import { withText } from '../../../../testHelpers';

describe('GrantLabel', () => {
  test('renders the label and value', async () => {
    render(
      <GrantLabel
        label="label"
        value="value"
      />,
    );
    const found = await screen.findByText(withText('label: value'));
    expect(found).toBeVisible();
  });
});
