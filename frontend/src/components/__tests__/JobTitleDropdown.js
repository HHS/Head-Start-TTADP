import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';

import JobTitleDropdown from '../JobTitleDropdown';

describe('JobTitleDropdown', () => {
  test('defaults to the correct option', () => {
    render(<JobTitleDropdown id="id" name="name" onChange={() => {}} />);
    expect(screen.getByLabelText('Job Title').value).toBe('default');
  });

  test('default option is not selectable', () => {
    render(<JobTitleDropdown id="id" name="name" onChange={() => {}} />);
    const item = screen.getByLabelText('Job Title').options.namedItem('default');
    expect(item.hidden).toBeTruthy();
  });
});
