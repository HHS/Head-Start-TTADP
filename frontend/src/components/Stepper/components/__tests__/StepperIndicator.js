import '@testing-library/jest-dom';
import { screen, render } from '@testing-library/react';
import React from 'react';

import StepperIndicator from '../StepperIndicator';

const COMPLETE_CLASS = 'usa-step-indicator__segment--complete';
const CURRENT_CLASS = 'usa-step-indicator__segment--current';

describe('StepperIndicator', () => {
  const steps = [
    {
      label: 'complete',
      complete: true,
      current: false,
    },
    {
      label: 'current',
      complete: false,
      current: true,
    },
    {
      label: 'unvisited',
      complete: false,
      current: false,
    },
  ];

  beforeEach(() => {
    render(<StepperIndicator steps={steps} />);
  });

  it('properly sets the complete class on complete items', () => {
    const complete = screen.getByTestId('complete');
    expect(complete).toHaveClass(COMPLETE_CLASS);
  });

  it('properly sets the current class on current items', () => {
    const current = screen.getByTestId('current');
    expect(current).toHaveClass(CURRENT_CLASS);
  });

  it('does not set classes on incomplete items', () => {
    const unvisited = screen.getByTestId('unvisited');
    expect(unvisited).not.toHaveClass(COMPLETE_CLASS);
    expect(unvisited).not.toHaveClass(COMPLETE_CLASS);
  });
});
