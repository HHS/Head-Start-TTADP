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

  it('renders multiple goals with the same goalTemplateId correctly using unique goal.id keys', async () => {
    // This test verifies the fix for the bug where goals would disappear when
    // multiple goals shared the same goalTemplateId (created from the same template)
    const multipleGoalsWithSameTemplate = [
      {
        id: 1,
        name: 'First goal from template',
        goalTemplateId: 123,
        grant: {},
        objectives: [],
        endDate: null,
      },
      {
        id: 2,
        name: 'Second goal from template',
        goalTemplateId: 123, // Same template as first goal
        grant: {},
        objectives: [],
        endDate: null,
      },
    ];

    render((
      <ReadOnly
        createdGoals={multipleGoalsWithSameTemplate}
        onEdit={jest.fn()}
        onRemove={jest.fn()}
      />
    ));

    // Both goals should be visible even though they share the same goalTemplateId
    expect(await screen.findByText('First goal from template')).toBeVisible();
    expect(await screen.findByText('Second goal from template')).toBeVisible();
  });
});
