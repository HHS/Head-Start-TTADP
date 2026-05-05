import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { withText } from '../../../../testHelpers';
import GrantLabel from '../GrantLabel';

describe('GrantLabel', () => {
  test('renders the label and value', async () => {
    render(<GrantLabel label="label" value="value" />);
    const found = await screen.findByText(withText('label: value'));
    expect(found).toBeVisible();
  });
});
