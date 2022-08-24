import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReadOnlyGoal from '../ReadOnlyGoal';

const createdGoal = {
  goalName: 'Sample goal',
  grant: [],
  objectives: [],
  endDate: null,
};

// eslint-disable-next-line react/prop-types
const RenderReadOnlyGoal = ({ hideEdit = false }) => (
  <ReadOnlyGoal
    onEdit={jest.fn()}
    onRemove={jest.fn()}
    hideEdit={hideEdit}
    goal={createdGoal}
    index={0}
  />
);

describe('ReadOnlyGoal', () => {
  it('can render with a goal', async () => {
    render(<RenderReadOnlyGoal />);
    expect(await screen.findByRole('heading', { name: /goal summary/i })).toBeVisible();
    expect(await screen.findByText('Sample goal')).toBeVisible();
  });

  it('can hide edit', async () => {
    render(<RenderReadOnlyGoal hideEdit />);
    expect(await screen.findByRole('heading', { name: /goal summary/i })).toBeVisible();
    expect(await screen.findByText('Sample goal')).toBeVisible();

    const contextMenu = await screen.findByRole('button', { name: /actions for goal undefined/i });
    userEvent.click(contextMenu);

    expect(await screen.findByText(/remove/i)).toBeVisible();
    const edit = screen.queryByText(/edit/i);
    expect(edit).toBeNull();
  });
});
