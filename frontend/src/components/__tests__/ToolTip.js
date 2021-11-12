import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import Tooltip from '../Tooltip';

describe('Tooltip', () => {
  const renderTooltip = (
    displayText,
    screenReadDisplayText,
    buttonLabel,
    tooltipText,
    hideUnderline,
  ) => {
    render(
      <div data-testid="tooltip-container">
        <Tooltip
          displayText={displayText}
          screenReadDisplayText={screenReadDisplayText}
          buttonLabel={buttonLabel}
          tooltipText={tooltipText}
          hideUnderline={hideUnderline}
        />
      </div>,
    );
  };

  afterAll(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    renderTooltip('my display text', false, 'my button label', 'my tool tip text', false);
    expect(await screen.findByText(/my tool tip text/i)).toBeVisible();
    expect(await screen.findByText(/my button label/i)).toBeVisible();
    expect(await screen.findByText(/my display text/i)).toBeVisible();
    const button = await screen.findByRole('button', { name: /button label/i });
    await expect(button).toBeInTheDocument();
    await expect(document.querySelector('svg')).toBeInTheDocument();
  });
  it('renders without underline', async () => {
    renderTooltip('my display text', false, 'my button label', 'my tool tip text', true);
    await expect(document.querySelector('svg')).not.toBeInTheDocument();
  });
});
