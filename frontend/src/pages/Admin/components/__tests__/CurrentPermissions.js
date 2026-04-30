import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { withText } from '../../../../testHelpers';
import CurrentPermissions from '../CurrentPermissions';

describe('CurrentPermissions', () => {
  test('renders single region', () => {
    render(<CurrentPermissions regions={['1']} scope="3" />);
    expect(screen.getByText(withText('READ_WRITE_ACTIVITY_REPORTS: Region 1'))).toBeVisible();
  });

  test('renders multiple regions', () => {
    render(<CurrentPermissions regions={['1', '2']} scope="3" />);
    expect(screen.getByText(withText('READ_WRITE_ACTIVITY_REPORTS: Regions 1, 2'))).toBeVisible();
  });
});
