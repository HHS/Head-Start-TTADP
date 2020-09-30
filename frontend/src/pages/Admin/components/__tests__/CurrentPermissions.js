import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';

import CurrentPermissions from '../CurrentPermissions';
import { withText } from '../../../../testHelpers';

describe('CurrentPermissions', () => {
  test('renders single region', () => {
    render(<CurrentPermissions regions={['1']} scope="TEST_SCOPE" />);
    expect(screen.getByText(withText('TEST_SCOPE: Region 1'))).toBeVisible();
  });

  test('renders multiple regions', () => {
    render(<CurrentPermissions regions={['1', '2']} scope="TEST_SCOPE" />);
    expect(
      screen.getByText(withText('TEST_SCOPE: Regions 1, 2')),
    ).toBeVisible();
  });
});
