/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import join from 'url-join';
import {
  render,
  screen,
  act,
  waitFor,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import { useForm, FormProvider } from 'react-hook-form';
import userEvent from '@testing-library/user-event';
import selectEvent from 'react-select-event';
import participants, { isPageComplete } from '../participants';
import NetworkContext from '../../../../NetworkContext';
import { NOT_STARTED } from '../../../../components/Navigator/constants';
import AppLoadingContext from '../../../../AppLoadingContext';

const sessionsUrl = join('/', 'api', 'session-reports');
const participantsUrl = join(sessionsUrl, 'participants', '1');

function mockRecipients(howMany) {
  const mock = [];
  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < howMany; i++) {
    mock.push({
      id: i,
      name: `R${i}`,
      grants: [
        {
          id: i,
          name: `R${i} G${i}`,
        },
        {
          id: i,
          name: `R${i} G${i + 1}`,
        },
      ],
    });
  }

  return mock;
}

describe('participants', () => {
  describe('isPageComplete', () => {
    it('returns true if form state is valid', () => {
      expect(isPageComplete({
        getValues: jest.fn(() => ({ recipients: [1], participants: [1] })),
      })).toBe(true);
    });

    it('returns false otherwise', () => {
      expect(isPageComplete({ getValues: jest.fn(() => false) })).toBe(false);
    });
  });
  describe('review', () => {
    it('renders correctly', async () => {
      act(() => {
        render(<>{participants.reviewSection()}</>);
      });

      expect(await screen.findByRole('heading', { name: /event summary/i })).toBeInTheDocument();
    });
  });
  describe('render', () => {
    const onSaveDraft = jest.fn();

    const defaultFormValues = {
      id: 1,
      ownerId: null,
      eventId: 'sdfgsdfg',
      eventDisplayId: 'event-display-id',
      eventName: 'Event name',
      regionId: 1,
      status: 'In progress',
      pageState: {
        1: NOT_STARTED,
        2: NOT_STARTED,
      },
    };

    // eslint-disable-next-line react/prop-types
    const RenderParticipants = ({ formValues = defaultFormValues }) => {
      const hookForm = useForm({
        mode: 'onBlur',
        defaultValues: formValues,
      });

      return (
        <AppLoadingContext.Provider value={{
          setIsAppLoading: jest.fn(), setAppLoadingText: jest.fn(),
        }}
        >
          <FormProvider {...hookForm}>
            <NetworkContext.Provider value={{ connectionActive: true }}>
              {participants.render(
                null,
                defaultFormValues,
                1,
                false,
                jest.fn(),
                onSaveDraft,
                jest.fn(),
                false,
                'key',
                jest.fn(),
                () => <></>,
              )}
            </NetworkContext.Provider>
          </FormProvider>
        </AppLoadingContext.Provider>
      );
    };

    beforeEach(async () => {
      fetchMock.get(participantsUrl, mockRecipients(3));
    });

    afterEach(async () => {
      fetchMock.restore();
    });

    it('renders participants', async () => {
      act(() => {
        render(<RenderParticipants />);
      });
      await waitFor(() => expect(fetchMock.called(participantsUrl)).toBeTruthy());
      await selectEvent.select(screen.getByLabelText(/recipients/i), 'R0');
      await selectEvent.select(screen.getByLabelText(/Recipient participants/i), 'Home Visitor');

      act(() => {
        userEvent.click(
          screen.getByLabelText(/in person/i),
        );
      });

      act(() => {
        userEvent.type(
          screen.getByLabelText(/number of participants/i),
          '1',
        );
      });

      act(() => {
        userEvent.click(
          screen.getByLabelText(/hybrid/i),
        );
      });

      act(() => {
        userEvent.type(
          screen.getByLabelText(/Number of participants attending in person/i),
          '1.75',
        );
      });

      act(() => {
        userEvent.type(
          screen.getByLabelText(/Number of participants attending virtually/i),
          '2',
        );
      });
    });
  });
});
