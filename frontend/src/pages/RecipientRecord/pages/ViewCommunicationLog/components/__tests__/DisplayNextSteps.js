import React from 'react';
import { render } from '@testing-library/react';
import DisplayNextSteps from '../DisplayNextSteps';

describe('DisplayNextSteps', () => {
  const title = 'Next Steps';
  const steps = [
    {
      note: 'First step',
      completeDate: '2022-01-01',
    },
    {
      note: 'second step',
      completeDate: '2022-01-02',
    },
  ];

  it('renders the component with title and steps', () => {
    const { getByText } = render(<DisplayNextSteps title={title} steps={steps} />);

    expect(getByText(title)).toBeInTheDocument();
    expect(getByText('Step 1')).toBeInTheDocument();
    expect(getByText('First step')).toBeInTheDocument();
    expect(getByText('Step 2')).toBeInTheDocument();
    expect(getByText('second step')).toBeInTheDocument();
    expect(getByText('2022-01-01')).toBeInTheDocument();
    expect(getByText('2022-01-02')).toBeInTheDocument();
  });

  it('renders nothing when steps prop is empty', () => {
    const { container } = render(<DisplayNextSteps title={title} steps={[]} />);

    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when steps prop is undefined', () => {
    const { container } = render(<DisplayNextSteps title={title} />);

    expect(container.firstChild).toBeNull();
  });
});
