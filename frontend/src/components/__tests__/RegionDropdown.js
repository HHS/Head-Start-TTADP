import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';

import RegionDropdown from '../RegionDropdown';

describe('RegionalDropdown', () => {
  test('defaults to the correct option', () => {
    render(<RegionDropdown id="id" name="name" onChange={() => {}} />);
    expect(screen.getByLabelText('Region').value).toBe('default');
  });

  test('default option is not selectable', () => {
    render(<RegionDropdown id="id" name="name" onChange={() => {}} />);
    const item = screen.getByLabelText('Region').options.namedItem('default');
    expect(item.hidden).toBeTruthy();
  });
});
