import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';

import PermissionCheckboxLabel from '../PermissionCheckboxLabel';
import { withText } from '../../../../testHelpers';

describe('PermissionCheckboxLabel', () => {
  test('renders correct text', () => {
    render(<PermissionCheckboxLabel name="TEST_SCOPE" description="test description" />);
    expect(screen.getByText(withText('TEST_SCOPE: test description'))).toBeVisible();
  });
});
