/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import PropTypes from 'prop-types';
import fetchMock from 'fetch-mock';
import { FormProvider, useForm } from 'react-hook-form';
import OtherEntity from '../OtherEntity';
import UserContext from '../../../../../UserContext';
import { OBJECTIVE_STATUS } from '../../../../../Constants';

let setError;

const RenderOtherEntity = ({ objectivesWithoutGoals, recipientIds }) => {
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
        <OtherEntity recipientIds={recipientIds} onSaveDraft={jest.fn()} reportId="123" />
      </FormProvider>
    </UserContext.Provider>
  );
};

RenderOtherEntity.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  objectivesWithoutGoals: PropTypes.arrayOf(PropTypes.object).isRequired,
  recipientIds: PropTypes.arrayOf(PropTypes.number).isRequired,
};

const objectives = [
  {
    title: 'title',
    ttaProvided: 'tta',
    status: OBJECTIVE_STATUS.IN_PROGRESS,
    topics: [],
    resources: [],
    objectiveCreatedHere: true,
  },
  {
    title: 'title two',
    ttaProvided: 'tta two',
    status: OBJECTIVE_STATUS.IN_PROGRESS,
    topics: [],
    resources: [],
    objectiveCreatedHere: true,
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
    render(<RenderOtherEntity objectivesWithoutGoals={objectives} recipientIds={[1]} />);

    const title = await screen.findByText('title', { selector: 'textarea' });
    expect(title).toBeVisible();
  });

  it('renders without roles', async () => {
    render(<RenderOtherEntity objectivesWithoutGoals={objectives} recipientIds={[1]} />);
    const title = await screen.findByText('title', { selector: 'textarea' });
    expect(title).toBeVisible();
  });

  it('the button adds a new objective', async () => {
    render(<RenderOtherEntity objectivesWithoutGoals={[]} recipientIds={[1]} />);
    const button = await screen.findByRole('button', { name: /Add new objective/i });
    userEvent.click(button);
    expect(screen.queryAllByText(/objective status/i).length).toBe(1);
    userEvent.click(button);
    await waitFor(() => expect(screen.queryAllByText(/objective status/i).length).toBe(2));
  });

  it('displays errors', async () => {
    render(<RenderOtherEntity objectivesWithoutGoals={[]} recipientIds={[1]} />);
    const button = await screen.findByRole('button', { name: /Add new objective/i });
    userEvent.click(button);
    expect(screen.queryAllByText(/objective status/i).length).toBe(1);
    userEvent.click(button);
    await waitFor(() => expect(screen.queryAllByText(/objective status/i).length).toBe(2));

    setError('objectivesWithoutGoals[0].title', { type: 'required', message: 'ENTER A TITLE' });
    await waitFor(() => expect(screen.queryByText(/ENTER A TITLE/i)).toBeVisible());
  });

  it('hides plus button when there are no recipients selected errors', async () => {
    render(<RenderOtherEntity objectivesWithoutGoals={[]} recipientIds={[]} />);
    const button = screen.queryByRole('button', { name: /Add new objective/i });
    expect(button).toBeNull();
  });
});
