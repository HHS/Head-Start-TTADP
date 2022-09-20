import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import ObjectiveTopics from '../ObjectiveTopics';

describe('ObjectiveTopics', () => {
  const defaultTopicSelection = [
    {
      value: 1,
      label: 'Dancing but too fast',
      isOnApprovedReport: true,
      onAnyReport: true,
    },
    {
      value: 2,
      label: 'Dancing but too slow',
      isOnApprovedReport: false,
      onAnyReport: false,
    },
  ];

  const renderObjectiveTopics = (
    isOnApprovedReport = false,
    topics = defaultTopicSelection,
    objectiveStatus = 'In Progress',
    goalStatus = 'In Progress',
  ) => render((
    <ObjectiveTopics
      error={<></>}
      topicOptions={[]}
      validateObjectiveTopics={jest.fn()}
      topics={topics}
      onChangeTopics={jest.fn()}
      status={objectiveStatus}
      isOnReport={false}
      isOnApprovedReport={isOnApprovedReport}
      goalStatus={goalStatus}
    />
  ));

  it('displays the correct label', async () => {
    renderObjectiveTopics();
    const label = await screen.findByText('Topics');
    expect(label).toBeVisible();
    expect(screen.getByText(/add more topics/i)).toBeVisible();
    const fastDancing = await screen.findByRole('listitem');
    expect(fastDancing).toHaveTextContent('Dancing but too fast');
    expect(screen.getByText(/dancing but too slow/i)).toBeVisible();
  });

  it('displays the correct data on approved report', async () => {
    renderObjectiveTopics(true);
    const label = await screen.findByText('Topics');
    expect(label).toBeVisible();

    expect(await screen.findByText(/dancing but too slow/i)).toBeVisible();
    expect(await screen.findByText(/dancing but too fast/i)).toBeVisible();
  });

  it('in the read only view, it distinguises between used data and unused data', async () => {
    renderObjectiveTopics(false, defaultTopicSelection, 'Completed', 'Closed');
    expect(await screen.findByText(/dancing but too fast/i)).toBeVisible();
    expect(await screen.findByText(/dancing but too slow/i)).toBeVisible();
    expect(document.querySelectorAll('.ttahub-objective-list-item--unused-data').length).toBe(1);
  });
});
