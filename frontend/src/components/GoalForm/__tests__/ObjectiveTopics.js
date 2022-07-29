import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import ObjectiveTopics from '../ObjectiveTopics';

describe('ObjectiveTopics', () => {
  const renderObjectiveTopics = () => render((
    <ObjectiveTopics
      error={<></>}
      topicOptions={[]}
      validateObjectiveTopics={jest.fn()}
      topics={[]}
      onChangeTopics={jest.fn()}
      status="In Progress"
      isOnReport={false}
      isOnApprovedReport={false}
    />
  ));

  it('displays the correct label', async () => {
    renderObjectiveTopics();
    const label = await screen.findByText('Topics');
    expect(label).toBeVisible();
  });
});
