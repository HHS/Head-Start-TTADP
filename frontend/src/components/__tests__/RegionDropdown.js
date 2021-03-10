import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';

import RegionDropdown from '../RegionDropdown';

describe('RegionalDropdown', () => {
  test('shows "select an option" (the default) when no value is selected', () => {
    render(<RegionDropdown id="id" name="name" onChange={() => {}} />);
    expect(screen.getByLabelText('Region').value).toBe('0');
  });

  test('default option is not selectable', () => {
    render(<RegionDropdown id="id" name="name" onChange={() => {}} />);
    const item = screen.getByLabelText('Region').options.namedItem('default');
    expect(item.hidden).toBeTruthy();
  });

  test('does not show central office when includeCentralOffice is not specified', () => {
    render(<RegionDropdown id="id" name="name" onChange={() => {}} />);
    expect(screen.queryByText('Central Office')).toBeNull();
  });

  test('with prop includeCentralOffice has central office as an option', () => {
    render(<RegionDropdown id="id" name="name" includeCentralOffice onChange={() => {}} />);
    expect(screen.queryByText('Central Office')).toBeVisible();
  });
});
