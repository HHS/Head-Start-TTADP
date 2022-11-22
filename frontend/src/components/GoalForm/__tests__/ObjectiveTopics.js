import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import ObjectiveTopics from '../ObjectiveTopics';

describe('ObjectiveTopics', () => {
  const defaultTopicSelection = [
    {
      id: 1,
      name: 'Dancing but too fast',
      isOnApprovedReport: true,
      onAnyReport: true,
    },
    {
      id: 2,
      name: 'Dancing but too slow',
      isOnApprovedReport: false,
      onAnyReport: false,
    },
  ];

  const renderObjectiveTopics = (
    isOnReport = false,
    topics = defaultTopicSelection,
    objectiveStatus = 'In Progress',
    goalStatus = 'In Progress',
    userCanEdit = true,
  ) => render((
    <ObjectiveTopics
      error={<></>}
      topicOptions={[]}
      validateObjectiveTopics={jest.fn()}
      topics={topics}
      onChangeTopics={jest.fn()}
      status={objectiveStatus}
      isOnReport={isOnReport}
      goalStatus={goalStatus}
      userCanEdit={userCanEdit}
    />
  ));

  it('displays the correct label', async () => {
    renderObjectiveTopics();
    const label = screen.queryAllByText(/topics/i);
    expect(label).toHaveLength(2);
    const fastDancing = await screen.findByRole('listitem');
    expect(fastDancing).toHaveTextContent('Dancing but too fast');
    expect(screen.getByText(/dancing but too slow/i)).toBeVisible();
  });

  it('shows the read only view when goal is not started and on a report', async () => {
    renderObjectiveTopics(
      true,
      defaultTopicSelection,
      'Not Started',
      'Not Started',
    );

    expect(await screen.findByText(/dancing but too slow/i)).toBeVisible();
    expect(await screen.findByText(/dancing but too fast/i)).toBeVisible();
    expect(document.querySelector('input')).toBeNull();
  });

  it('shows the read only view when a user can\'t edit', async () => {
    renderObjectiveTopics(
      false,
      defaultTopicSelection,
      'Not Started',
      'Not Started',
      false,
    );

    expect(await screen.findByText(/dancing but too slow/i)).toBeVisible();
    expect(await screen.findByText(/dancing but too fast/i)).toBeVisible();
    expect(document.querySelector('input')).toBeNull();
  });

  it('in the read only view, it distinguises between used data and unused data', async () => {
    renderObjectiveTopics(false, defaultTopicSelection, 'Complete', 'Closed');
    expect(await screen.findByText(/dancing but too fast/i)).toBeVisible();
    expect(await screen.findByText(/dancing but too slow/i)).toBeVisible();
    expect(document.querySelectorAll('.ttahub-objective-list-item--unused-data').length).toBe(1);
  });
});
