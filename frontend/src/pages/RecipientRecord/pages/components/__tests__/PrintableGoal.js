import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';

import PrintableGoal from '../PrintableGoal';

describe('PrintableGoal', () => {
  const renderPrintableGoal = (goal) => render(<PrintableGoal goal={goal} />);

  it('will display a goal with an uncertain status', async () => {
    const goal = {
      goalStatus: 'Uncertain',
      goalNumber: '2',
      goalText: 'asdfasdf',
      grantNumber: '3',
      goalTopics: ['Topic'],
      objectives: [],
    };
    renderPrintableGoal(goal);
    expect(await screen.findByText('Uncertain')).toBeInTheDocument();
  });
});
