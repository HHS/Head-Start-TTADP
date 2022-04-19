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
      savedTopics={[{
        value: 1,
        label: 'Lack of digestible solids',
      }]}
      topicOptions={[]}
      validateObjectiveTopics={jest.fn()}
      topics={[]}
      onChangeTopics={jest.fn()}
    />
  ));

  it('displays the correct label', async () => {
    renderObjectiveTopics();
    const label = await screen.findByText(/Add more topics/i);
    expect(label).toBeVisible();
  });
});
