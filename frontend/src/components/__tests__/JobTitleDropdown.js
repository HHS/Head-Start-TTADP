import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';

import JobTitleDropdown from '../JobTitleDropdown';

describe('JobTitleDropdown', () => {
  test('shows "select a job title" (the default) when no value is selected', () => {
    render(<JobTitleDropdown id="id" name="name" onChange={() => {}} />);
    expect(screen.getByLabelText('Role').value).toBe('default');
  });

  test('default option is not selectable', () => {
    render(<JobTitleDropdown id="id" name="name" onChange={() => {}} />);
    const item = screen.getByLabelText('Role').options.namedItem('default');
    expect(item.hidden).toBeTruthy();
  });
});
