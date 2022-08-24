import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import ObjectiveTopics from '../ObjectiveTopics';

describe('ObjectiveTopics', () => {
  const renderObjectiveTopics = (isOnApprovedReport = false) => render((
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
      isOnApprovedReport={isOnApprovedReport}
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
});
