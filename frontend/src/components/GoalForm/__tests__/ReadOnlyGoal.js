import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReadOnlyGoal from '../ReadOnlyGoal';

describe('ReadOnlyGoal', () => {
  const createdGoal = {
    goalName: 'Sample goal',
    grant: [],
    objectives: [],
    endDate: null,
    id: 1,
  };

  const renderReadOnlyGoal = (hideEdit = false) => {
    render((
      <ReadOnlyGoal
        onEdit={jest.fn()}
        onRemove={jest.fn()}
        hideEdit={hideEdit}
        goal={createdGoal}
        index={0}
      />
    ));
  };

  it('can render with a goal', async () => {
    renderReadOnlyGoal();
    expect(await screen.findByRole('heading', { name: /goal summary/i })).toBeVisible();
    expect(await screen.findByText('Sample goal')).toBeVisible();

    const contextButton = await screen.findByRole('button');
    userEvent.click(contextButton);
    const menu = await screen.findByTestId('menu');
    expect(menu.querySelectorAll('li').length).toBe(2);
  });

  it('shows the correct menu items when hide edit is passed', async () => {
    renderReadOnlyGoal(true);
    const contextButton = await screen.findByRole('button');
    userEvent.click(contextButton);
    const menu = await screen.findByTestId('menu');
    expect(menu.querySelectorAll('li').length).toBe(1);
  });
});
