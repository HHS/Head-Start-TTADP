/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import {
  render,
  screen,
  act,
  fireEvent,
} from '@testing-library/react';
import { useForm, FormProvider } from 'react-hook-form';
import userEvent from '@testing-library/user-event';
import selectEvent from 'react-select-event';
import { SCOPE_IDS } from '@ttahub/common';
import eventSummary, { isPageComplete } from '../eventSummary';
import NetworkContext from '../../../../NetworkContext';
import UserContext from '../../../../UserContext';

const { ADMIN, READ_WRITE_TRAINING_REPORTS } = SCOPE_IDS;

const defaultUser = {
  name: 'name',
  id: 1,
  flags: [],
  roles: [],
  permissions: [],
};

describe('eventSummary', () => {
  describe('isPageComplete', () => {
    it('returns true if form state is valid', () => {
      expect(isPageComplete({
        getValues: jest.fn(() => ({
          pocIds: [1],
          collaboratorIds: [1],
          reasons: [1],
          targetPopulations: [1],
        })),
      })).toBe(true);
    });

    it('returns false otherwise', () => {
      expect(isPageComplete({ getValues: jest.fn(() => false) })).toBe(false);
    });
  });
  describe('review', () => {
    it('renders correctly', async () => {
      act(() => {
        render(<>{eventSummary.reviewSection()}</>);
      });

      expect(await screen.findByRole('heading', { name: /event summary/i })).toBeInTheDocument();
    });
  });
  describe('render', () => {
    const onSaveDraft = jest.fn();

    const defaultFormValues = {
      eventId: 'Event-id-1',
      eventName: 'Event-name-1',
    };

    const RenderEventSummary = (user = defaultUser) => {
      const hookForm = useForm({
        mode: 'onBlur',
        defaultValues: defaultFormValues,
      });

      return (
        <FormProvider {...hookForm}>
          <UserContext.Provider value={user}>
            <NetworkContext.Provider value={{ connectionActive: true }}>
              {eventSummary.render(
                {
                  users: {
                    pointOfContact: [{
                      id: 1,
                      fullName: 'Ted User',
                    }],
                    collaborators: [
                      {
                        id: 2,
                        fullName: 'Tedwina User',
                      },
                    ],
                    creators: [
                      { id: 1, name: 'IST 1' },
                      { id: 2, name: 'IST 2' },
                    ],
                  },
                },
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
          </UserContext.Provider>
        </FormProvider>
      );
    };

    it('renders event summary', async () => {
      act(() => {
        render(<RenderEventSummary />);
      });

      const selections = document.querySelectorAll('button, input, textarea, select, a');
      Array.from(selections).forEach((selection) => {
        fireEvent.focus(selection);
        fireEvent.blur(selection);
      });

      const startDate = await screen.findByLabelText(/Event start Date/i, { selector: '#startDate' });
      userEvent.type(startDate, '01/01/2021');

      const endDate = await screen.findByLabelText(/Event end Date/i, { selector: '#endDate' });
      userEvent.type(endDate, '01/02/2021');

      userEvent.clear(startDate);
      userEvent.type(startDate, '01/03/2021');

      await selectEvent.select(screen.getByLabelText(/Event region point of contact/i), 'Ted User');
      await selectEvent.select(screen.getByLabelText(/Event collaborators/i), ['Tedwina User']);
      await selectEvent.select(screen.getByLabelText(/target populations/i), ['Pregnant Women / Pregnant Persons']);
      await selectEvent.select(screen.getByLabelText(/reasons/i), ['Complaint']);
      await selectEvent.select(screen.getByLabelText(/event organizer/i), 'IST TTA/Visit');

      const saveDraftButton = await screen.findByRole('button', { name: /save draft/i });
      userEvent.click(saveDraftButton);
      expect(onSaveDraft).toHaveBeenCalled();
    });

    it('admin users can edit title and owner fields', async () => {
      const adminUser = {
        ...defaultUser,
        permissions: [
          { regionId: 1, scopeId: ADMIN },
        ],
      };
      act(() => {
        render(<RenderEventSummary user={adminUser} />);
      });

      // Event name.
      const eventName = await screen.findByRole('textbox', { name: /event name required/i });
      expect(eventName).toBeInTheDocument();

      // Change the value in the event name field.
      const creatorSelect = await screen.findByTestId('creator-select');
      expect(creatorSelect).toBeInTheDocument();

      // Update event name field.
      userEvent.clear(eventName);
      userEvent.type(eventName, 'Event name 2');

      // Assert new event name.
      expect(eventName).toHaveValue('Event name 2');
    });

    it('non admin users cant edit title and owner fields', async () => {
      const adminUser = {
        ...defaultUser,
        permissions: [
          { regionId: 1, scopeId: READ_WRITE_TRAINING_REPORTS },
        ],
      };
      act(() => {
        render(<RenderEventSummary user={adminUser} />);
      });
      expect(screen.queryAllByRole('textbox', { name: /event name required/i }).length).toBe(0);
      expect(screen.queryAllByTestId('creator-select').length).toBe(0);
    });
  });
});
