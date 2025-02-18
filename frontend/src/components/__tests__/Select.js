import '@testing-library/jest-dom';
import React from 'react';
import { screen, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Select from '../Select';

describe('Select', () => {
  const renderSelect = () => {
    render(<Select
      name="the-selector"
      options={[]}
      onChange={jest.fn()}
      value={[]}
      className="the-class"
    />);
  };

  it('shows the correct disabled styles', async () => {
    renderSelect(true);
    userEvent.tab();
    expect(await screen.findByText(/select is focused ,type to refine list, press down to open the menu/i)).toBeInTheDocument();
  });
});
