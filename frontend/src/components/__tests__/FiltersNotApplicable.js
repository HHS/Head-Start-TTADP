import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
} from '@testing-library/react';
import FiltersNotApplicable from '../FiltersNotApplicable';

describe('FiltersNotApplicable', () => {
  const renderDropdown = () => {
    render(
      <div>
        <FiltersNotApplicable />
      </div>,
    );
  };

  it('renders the component', async () => {
    renderDropdown();
    expect(screen.getByText(/Filters not applied/i)).toBeVisible();
    expect(screen.getByRole('tooltip', { hidden: true })).toBeInTheDocument();
    expect(screen.getByText(/One or more of the selected filters cannot be applied to this data./i)).toBeInTheDocument();
  });
});
