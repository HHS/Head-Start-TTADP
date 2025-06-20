import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import ReadOnly from '../ReadOnly';

describe('ReadOnly', () => {
  const createdGoals = [
    {
      name: 'Sample goal',
      grant: {},
      objectives: [],
      endDate: null,
    },
  ];

  const renderReadOnly = () => {
    render((
      <ReadOnly
        createdGoals={createdGoals}
        onEdit={jest.fn()}
        onRemove={jest.fn()}
      />
    ));
  };

  it('can render with a null endDate no problem', async () => {
    renderReadOnly();
    expect(await screen.findByText('Sample goal')).toBeVisible();
  });
});
