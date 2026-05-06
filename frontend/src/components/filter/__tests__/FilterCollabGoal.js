import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import FilterCollabGoal from '../FilterCollabGoal';

jest.mock('../FilterSelect', () =>
  function MockFilterSelect({ onApply, options }) {
    return (
      <button type="button" onClick={() => onApply(options[0]?.value)}>
        Apply
      </button>
    );
  }
);

describe('FilterCollabGoal', () => {
  it('renders without crashing', () => {
    render(<FilterCollabGoal onApply={() => {}} inputId="test" query={[]} />);
    expect(screen.getByRole('button', { name: /apply/i })).toBeInTheDocument();
  });

  it('calls onApply when a selection is made', async () => {
    const onApply = jest.fn();
    render(<FilterCollabGoal onApply={onApply} inputId="test" query={[]} />);
    await userEvent.click(screen.getByRole('button', { name: /apply/i }));
    expect(onApply).toHaveBeenCalled();
  });
});
