import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import ObjectiveTopics from '../ObjectiveTopics';

describe('ObjectiveTopics', () => {
  const renderObjectiveTopics = (savedTopics) => render((
    <ObjectiveTopics
      error={<></>}
      savedTopics={savedTopics}
      topicOptions={[]}
      validateObjectiveTopics={jest.fn()}
      topics={[]}
      onChangeTopics={jest.fn()}
      status="In Progress"
      isOnReport={false}
    />
  ));

  it('displays the correct label', async () => {
    const savedTopics = [{
      value: 1,
      label: 'Lack of digestible solids',
    }];
    renderObjectiveTopics(savedTopics);
    const label = await screen.findByText(/Add more topics/i);
    expect(label).toBeVisible();
  });

  it('handles no saved topics', async () => {
    renderObjectiveTopics([]);
    const label = await screen.findByText(/Topics/i);
    expect(label).toBeVisible();
  });
});
