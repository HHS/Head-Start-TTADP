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
      grants: [],
      objectives: [],
      endDate: null,
    },
  ];

  const renderReadOnly = () => {
    render((
      <ReadOnly
        createdGoals={createdGoals}
      />
    ));
  };

  it('can render with a null endDate no problem', async () => {
    renderReadOnly();
    expect(await screen.findByText('Sample goal')).toBeVisible();
  });
});
