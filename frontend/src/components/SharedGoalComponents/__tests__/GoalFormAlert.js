import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
} from '@testing-library/react';
import GoalFormAlert from '../GoalFormAlert';

describe('GoalFormAlert', () => {
  it('renders nothing if there is no error', async () => {
    render(<GoalFormAlert alert={null} />);

    const alert = screen.queryByTestId('alert');
    expect(alert).toBeNull();
  });

  it('renders error alert', async () => {
    render(<GoalFormAlert alert={{ message: 'There has been an error' }} />);

    const alert = await screen.findByText('There has been an error');
    expect(alert).toBeInTheDocument();
  });
});
