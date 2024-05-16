import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import ObjectiveTopics from '../ObjectiveTopics';

describe('ObjectiveTopics', () => {
  beforeEach(() => fetchMock.get('/api/feeds/item?tag=ttahub-topic', `<feed xmlns="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <title>Whats New</title>
  <link rel="alternate" href="https://acf-ohs.atlassian.net/wiki" />
  <subtitle>Confluence Syndication Feed</subtitle>
  <id>https://acf-ohs.atlassian.net/wiki</id></feed>`));

  afterEach(() => fetchMock.restore());

  const defaultTopicSelection = [
    {
      id: 1,
      name: 'Dancing but too fast',
    },
    {
      id: 2,
      name: 'Dancing but too slow',
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
    // we expect a result of 2 elements
    // 1) the <label> for the topics <Select>
    // 2) The button to open the drawer that reads "Get help choosing topics"
    expect(label).toHaveLength(2);
    expect(screen.getByText(/Dancing but too fast/i)).toBeVisible();
    expect(screen.getByText(/dancing but too slow/i)).toBeVisible();
  });
});
