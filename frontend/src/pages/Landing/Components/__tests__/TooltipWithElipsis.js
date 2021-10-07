import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen, fireEvent, act,
} from '@testing-library/react';

import TooltipWithEllipsis from '../TooltipWithEllipsis';

describe('TooltipWithEllipsis', () => {
  const renderTooltip = (collection = ['Teddy', 'Cathy', 'Bobby', 'G-berg']) => {
    render(<div data-testid="tooltip-container"><TooltipWithEllipsis collection={collection} collectionTitle="people who something" /></div>);
  };

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('correctly modifies the dom when the button is clicked', async () => {
    renderTooltip();
    const teddy = screen.getByText('Teddy');
    const cathy = screen.getByText('Cathy');

    expect(teddy).toBeVisible();
    expect(cathy).toBeVisible();

    const button = screen.getByRole('button', { name: 'Teddy Cathy Bobby G-berg click to visually reveal the people who something' });
    act(() => {
      fireEvent.click(button);
    });

    const tooltip = await screen.findByTestId('tooltip');

    expect(tooltip).toHaveClass('show-tooltip');

    act(() => {
      fireEvent.click(button);
    });

    expect(tooltip).not.toHaveClass('show-tooltip');

    act(() => {
      fireEvent.click(button);
    });

    expect(tooltip).toHaveClass('show-tooltip');

    act(() => {
      jest.runAllTimers();
    });

    expect(tooltip).not.toHaveClass('show-tooltip');
  });

  it('renders nothing when passed an empty collection', async () => {
    renderTooltip([]);
    const container = screen.getByTestId('tooltip-container');

    expect(container.innerHTML).toBe('');
  });

  it('renders a single span when passed a one item array', async () => {
    renderTooltip(['Jimbo']);
    const jimbo = screen.getByText('Jimbo');
    expect(jimbo).toBeVisible();
    expect(jimbo).toHaveClass('smarthub-ellipsis');
  });
});
