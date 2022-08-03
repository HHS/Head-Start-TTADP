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
      topics={[
        {
          value: 1,
          label: 'Dancing but too fast',
          isOnApprovedReport: true,
        },
        {
          value: 2,
          label: 'Dancing but too slow',
          isOnApprovedReport: false,
        },
      ]}
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
    expect(screen.getByText(/add more topics/i)).toBeVisible();
    const fastDancing = await screen.findByRole('listitem');
    expect(fastDancing).toHaveTextContent('Dancing but too fast');
    expect(screen.getByText(/dancing but too slow/i)).toBeVisible();
  });
});
