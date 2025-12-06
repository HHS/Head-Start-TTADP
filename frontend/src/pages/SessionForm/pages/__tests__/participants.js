/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import join from 'url-join';
import moment from 'moment';
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
import { TRAINING_REPORT_STATUSES } from '@ttahub/common/src/constants';
import participants, { isPageComplete } from '../participants';
import NetworkContext from '../../../../NetworkContext';
import UserContext from '../../../../UserContext';
import { NOT_STARTED } from '../../../../components/Navigator/constants';
import AppLoadingContext from '../../../../AppLoadingContext';

const sessionsUrl = join('/', 'api', 'session-reports');
const participantsUrl = join(sessionsUrl, 'participants', '1');
const groupsUrl = join(sessionsUrl, 'groups', '?region=1');
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
          id: i + 1,
          name: `R${i} G${i + 1}`,
        },
        {
          id: i + 2,
          name: `R${i} G${i + 2}`,
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
        getValues: jest.fn(() => ({ recipients: [1], participants: [1], language: ['Mermish'] })),
      })).toBe(true);
    });

    it('returns false otherwise', () => {
      expect(isPageComplete({ getValues: jest.fn(() => false) })).toBe(false);
    });
  });

  describe('render', () => {
    const userId = 1;
    const todaysDate = moment().format('YYYY-MM-DD');
    const onSaveDraft = jest.fn();

    const defaultFormValues = {
      id: 1,
      ownerId: null,
      eventId: 'sdfgsdfg',
      eventDisplayId: 'event-display-id',
      eventName: 'Event name',
      regionId: 1,
      status: 'In progress',
      isIstVisit: 'no',
      recipients: [],
      pageState: {
        1: NOT_STARTED,
        2: NOT_STARTED,
      },
    };

    // eslint-disable-next-line react/prop-types
    const RenderParticipants = ({ formValues = defaultFormValues, additionalData = { status: 'In progress' } }) => {
      const hookForm = useForm({
        mode: 'onBlur',
        defaultValues: formValues,
      });

      return (
        <AppLoadingContext.Provider value={{
          setIsAppLoading: jest.fn(), setAppLoadingText: jest.fn(),
        }}
        >
          <UserContext.Provider value={{ user: { id: userId } }}>
            <FormProvider {...hookForm}>
              <NetworkContext.Provider value={{ connectionActive: true }}>
                {participants.render(
                  additionalData,
                  formValues,
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
          </UserContext.Provider>
        </AppLoadingContext.Provider>
      );
    };

    beforeEach(async () => {
      // Mock recipients.
      fetchMock.get(participantsUrl, mockRecipients(3));
      // Mock groups.
      const mockGroups = [{ id: 1, name: 'group 1', grants: [{ id: 0 }, { id: 1 }] }, { id: 2, name: 'group 2', grants: [{ id: 2 }, { id: 3 }] }];
      fetchMock.get(groupsUrl, mockGroups);
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

    it('shows read only mode correctly for hybrid', async () => {
      const readOnlyFormValues = {
        ...defaultFormValues,
        pocComplete: true,
        pocCompleteId: userId,
        pocCompleteDate: todaysDate,
        event: {
          pocIds: [userId],
        },
        recipients: [
          {
            id: 1,
            label: 'R1 R1 G1',
          },
        ],
        deliveryMethod: 'hybrid',
        numberOfParticipants: 2,
        numberOfParticipantsInPerson: 1,
        numberOfParticipantsVirtually: 1,
        participants: ['Home Visitor'],
        language: ['English'],
        isIstVisit: 'no',
      };

      act(() => {
        render(<RenderParticipants formValues={readOnlyFormValues} />);
      });
      await waitFor(async () => expect(await screen.findByText('Home Visitor')).toBeVisible());

      // confirm hybrid is capitalized
      const inPerson = await screen.findByText('Hybrid');
      expect(inPerson).toBeVisible();

      // confirm data is "headed" correctly
      const inPersonLabel = await screen.findByText(/Number of participants attending in person/i);
      expect(inPersonLabel).toBeVisible();
      const virtuallyLabel = await screen.findByText(/Number of participants attending virtually/i);
      expect(virtuallyLabel).toBeVisible();
    });

    it('only shows the continue button when the session status is complete', async () => {
      const readOnlyFormValues = {
        ...defaultFormValues,
        pocComplete: true,
        pocCompleteId: userId,
        pocCompleteDate: todaysDate,
        event: {
          pocIds: [userId],
        },
        recipients: [
          {
            id: 1,
            label: 'R1 R1 G1',
          },
        ],
        deliveryMethod: 'hybrid',
        numberOfParticipants: 2,
        numberOfParticipantsInPerson: 1,
        numberOfParticipantsVirtually: 1,
        participants: ['Home Visitor'],
        language: ['English'],
        isIstVisit: 'no',
      };

      act(() => {
        render(<RenderParticipants
          formValues={readOnlyFormValues}
          additionalData={{ status: TRAINING_REPORT_STATUSES.COMPLETE }}
        />);
      });
      await waitFor(async () => expect(await screen.findByText('Home Visitor')).toBeVisible());
      expect(screen.queryByRole('button', { name: 'Save and continue' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Continue' })).toBeInTheDocument();
    });

    describe('groups', () => {
      it('correctly shows and hides all group options', async () => {
        render(<RenderParticipants />);

        // Click the use group checkbox.
        let useGroupCheckbox = await screen.findByRole('checkbox', { name: /use group/i });

        act(() => {
          userEvent.click(useGroupCheckbox);
        });

        // Correctly shows the group drop down.
        const groupOption = screen.getByRole('combobox', { name: /group name required/i });
        expect(groupOption).toBeInTheDocument();

        // Uncheck the use group checkbox.
        useGroupCheckbox = screen.getByRole('checkbox', { name: /use group/i });
        act(() => {
          userEvent.click(useGroupCheckbox);
        });

        // Assert that the group drop down is no longer visible.
        expect(groupOption).not.toBeInTheDocument();
      });

      it('hides the use group check box if we dont have any groups', async () => {
        fetchMock.get(groupsUrl, [], { overwriteRoutes: true });
        render(<RenderParticipants />);
        expect(screen.queryAllByRole('checkbox', { name: /use group/i }).length).toBe(0);
      });

      it('correctly shows message if group recipients are changed', async () => {
        act(() => {
          render(<RenderParticipants />);
        });
        await waitFor(() => expect(fetchMock.called(participantsUrl)).toBeTruthy());
        await waitFor(() => expect(fetchMock.called(groupsUrl)).toBeTruthy());

        await selectEvent.select(screen.getByLabelText(/recipients/i), 'R0 G0');
        expect(screen.getByText(/R0 G0/i)).toBeVisible();

        // Click the use group checkbox.
        const useGroupCheckbox = await screen.findByRole('checkbox', { name: /use group/i });
        act(() => {
          userEvent.click(useGroupCheckbox);
        });

        // Correctly shows the group drop down.
        const groupOption = screen.getByRole('combobox', { name: /group name required/i });
        expect(groupOption).toBeInTheDocument();

        await act(async () => {
          const groupSelectBox = await screen.findByRole('combobox', { name: /group name required/i });
          userEvent.selectOptions(groupSelectBox, 'group 1');
          await waitFor(() => {
          // expect Group 2 to be visible.
            expect(screen.getByText('group 1')).toBeVisible();
          });
        });

        await selectEvent.select(screen.getByLabelText(/recipients/i), 'R0 G2');
        expect(screen.getByText(/you've successfully modified the group/i)).toBeInTheDocument();

        // Make sure reset works.
        const resetButton = screen.getByRole('button', { name: /reset or select a different group\./i });
        userEvent.click(resetButton);

        // Assert use group check box is checked.
        expect(useGroupCheckbox).toBeChecked();
      });
    });

    it('uses event regionId when form regionId is not provided', async () => {
      const formValues = {
        id: 1,
        ownerId: null,
        eventId: 'test-event',
        eventDisplayId: 'event-display-id',
        eventName: 'Event name',
        regionId: undefined,
        status: 'In progress',
        isIstVisit: 'no',
        recipients: [],
        pageState: {
          1: NOT_STARTED,
          2: NOT_STARTED,
        },
        event: {
          regionId: 2,
        },
      };

      const additionalData = {
        status: 'In progress',
      };

      const participantsUrlRegion2 = join(sessionsUrl, 'participants', '2');
      fetchMock.get(participantsUrlRegion2, []);

      const groupsUrlRegion2 = join(sessionsUrl, 'groups', '?region=2');
      fetchMock.get(groupsUrlRegion2, []);

      act(() => {
        render(<RenderParticipants formValues={formValues} additionalData={additionalData} />);
      });

      await waitFor(() => {
        expect(fetchMock.called(groupsUrlRegion2)).toBe(true);
        expect(fetchMock.called(participantsUrlRegion2)).toBe(true);
      });
    });
  });

  describe('ReviewSection', () => {
    it('exports a reviewSection function', () => {
      expect(typeof participants.reviewSection).toBe('function');
      expect(participants.reviewSection).toBeDefined();
    });

    it('has the correct review property', () => {
      expect(participants.review).toBe(false);
    });
  });
});
