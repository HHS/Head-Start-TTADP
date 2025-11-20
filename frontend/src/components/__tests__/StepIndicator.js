import React from 'react';
import { render } from '@testing-library/react';
import StepIndicator from '../StepIndicator';

describe('StepIndicator', () => {
  const helpLink = <span />;

  // eslint-disable-next-line react/prop-types
  const Child = ({ label, status }) => (
    <li label={label}>{status}</li>
  );

  const renderTest = (children) => render(
    <StepIndicator helpLink={helpLink}>
      {children}
    </StepIndicator>,
  );

  it('renders the current step number', () => {
    const children = [
      <Child key="1" label="Step 1" status="current" />,
      <Child key="2" label="Step 2" />,
    ];

    renderTest(children);

    const current = document.querySelector('.usa-step-indicator__current-step');
    expect(current.textContent).toBe('1');

    const total = document.querySelector('.usa-step-indicator__total-steps');
    expect(total.textContent).toBe('of 2');
  });

  it('renders the first step number when no step is current', () => {
    const children = [
      <Child key="1" label="Step 1" />,
      <Child key="2" label="Step 2" />,
    ];

    renderTest(children);

    const current = document.querySelector('.usa-step-indicator__current-step');
    expect(current.textContent).toBe('1');

    const total = document.querySelector('.usa-step-indicator__total-steps');
    expect(total.textContent).toBe('of 2');
  });
});
