import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { withText } from '../../../../testHelpers';
import PermissionCheckboxLabel from '../PermissionCheckboxLabel';

describe('PermissionCheckboxLabel', () => {
  test('renders correct text', () => {
    render(<PermissionCheckboxLabel name="TEST_SCOPE" description="test description" />);
    expect(screen.getByText(withText('TEST_SCOPE: test description'))).toBeVisible();
  });
});
