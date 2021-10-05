import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

import TooltipWithEllipsis from '../TooltipWithEllipsis';

describe('TooltipWithEllipsis', () => {
  const renderTooltip = () => {
    const collection = ['Teddy', 'Cathy', 'Bobby', 'G-berg'];
    render(<TooltipWithEllipsis collection={collection} />);
  };

  it('correctly modifies the dom when the button is clicked', async () => {
    renderTooltip();
    const teddy = screen.getByText('Teddy');
    const cathy = screen.getByText('Cathy');

    expect(teddy).toBeVisible();
    expect(cathy).toBeVisible();

    const button = screen.getByRole('button', { name: /teddy cathy bobby g-berg button visually reveals this content/i });
    await act(async () => fireEvent.click(button));

    expect(teddy.parentNode.parentNode.parentNode).toHaveClass('show-tooltip');
  });
});
