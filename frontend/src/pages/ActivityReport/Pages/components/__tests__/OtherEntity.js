/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import fetchMock from 'fetch-mock';
import { FormProvider, useForm } from 'react-hook-form';
import OtherEntity from '../OtherEntity';
import UserContext from '../../../../../UserContext';

let setError;

// eslint-disable-next-line react/prop-types
const RenderOtherEntity = ({ objectivesWithoutGoals }) => {
  const hookForm = useForm({
    mode: 'onChange',
    defaultValues: {
      objectivesWithoutGoals,
    },
  });

  setError = hookForm.setError;

  return (
    <UserContext.Provider value={{ user: { flags: [] } }}>
      <FormProvider {...hookForm}>
        <OtherEntity recipientIds={[]} onSaveDraft={jest.fn()} reportId="123" />
      </FormProvider>
    </UserContext.Provider>
  );
};

const objectives = [
  {
    title: 'title',
    ttaProvided: 'tta',
    status: 'In Progress',
    topics: [],
    resources: [],
  },
  {
    title: 'title two',
    ttaProvided: 'tta two',
    status: 'In Progress',
    topics: [],
    resources: [],
  },
];

describe('OtherEntity', () => {
  beforeEach(async () => {
    fetchMock.restore();
    fetchMock.get('/api/topic', []);
    fetchMock.get('/api/feeds/item?tag=ttahub-topic', `<feed xmlns="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
    <title>Whats New</title>
    <link rel="alternate" href="https://acf-ohs.atlassian.net/wiki" />
    <subtitle>Confluence Syndication Feed</subtitle>
    <id>https://acf-ohs.atlassian.net/wiki</id></feed>`);
  });
  it('renders created objectives', async () => {
    render(<RenderOtherEntity objectivesWithoutGoals={objectives} />);

    const title = await screen.findByText('title', { selector: 'textarea' });
    expect(title).toBeVisible();
  });

  it('renders without roles', async () => {
    render(<RenderOtherEntity objectivesWithoutGoals={objectives} />);
    const title = await screen.findByText('title', { selector: 'textarea' });
    expect(title).toBeVisible();
  });

  it('the button adds a new objective', async () => {
    render(<RenderOtherEntity objectivesWithoutGoals={[]} />);
    const button = await screen.findByRole('button', { name: /Add new objective/i });
    userEvent.click(button);
    expect(screen.queryAllByText(/objective status/i).length).toBe(1);
    userEvent.click(button);
    await waitFor(() => expect(screen.queryAllByText(/objective status/i).length).toBe(2));
  });

  it('displays errors', async () => {
    render(<RenderOtherEntity objectivesWithoutGoals={[]} />);
    const button = await screen.findByRole('button', { name: /Add new objective/i });
    userEvent.click(button);
    expect(screen.queryAllByText(/objective status/i).length).toBe(1);
    userEvent.click(button);
    await waitFor(() => expect(screen.queryAllByText(/objective status/i).length).toBe(2));

    setError('objectivesWithoutGoals[0].title', { type: 'required', message: 'ENTER A TITLE' });
    await waitFor(() => expect(screen.queryByText(/ENTER A TITLE/i)).toBeVisible());
  });
});
