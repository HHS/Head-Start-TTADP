import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen, fireEvent, act,
} from '@testing-library/react';

import TooltipWithEllipsis from '../TooltipWithEllipsis';

describe('TooltipWithEllipsis', () => {
  const renderTooltip = () => {
    const collection = ['Teddy', 'Cathy', 'Bobby', 'G-berg'];
    render(<TooltipWithEllipsis collection={collection} collectionTitle="people who something" />);
  };

  it('correctly modifies the dom when the button is clicked', async () => {
    renderTooltip();
    const teddy = screen.getByText('Teddy');
    const cathy = screen.getByText('Cathy');

    expect(teddy).toBeVisible();
    expect(cathy).toBeVisible();

    screen.logTestingPlaygroundURL();
    const button = screen.getByRole('button', { name: 'Teddy Cathy Bobby G-berg click to visually reveal the people who something' });
    await act(async () => fireEvent.click(button));

    const tooltip = await screen.findByTestId('tooltip');

    expect(tooltip).toHaveClass('show-tooltip');

    await act(async () => fireEvent.click(button));

    expect(tooltip).not.toHaveClass('show-tooltip');
  });
});
