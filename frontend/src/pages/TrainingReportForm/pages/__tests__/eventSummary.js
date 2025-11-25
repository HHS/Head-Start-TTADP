/* eslint-disable react/prop-types */
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
import EventSummary from '../eventSummary';
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
  describe('render', () => {
    const onSaveDraft = jest.fn();

    const defaultFormValues = {
      eventId: 'Event-id-1',
      eventName: 'Event-name-1',
      ownerName: 'Owner-name-1',
      pocIds: [1],
      reasons: ['Complaint'],
      targetPopulations: ['target population1', 'target population2'],
      vision: 'This is a sample vision.',
      eventIntendedAudience: 'recipient',
      eventOrganizer: 'Sample organizer',
      owner: {
        name: 'Owner-name-1',
      },
    };

    const RenderEventSummary = ({
      user = defaultUser,
      creators = [
        { id: 1, name: 'IST 1', nameWithNationalCenters: 'IST 1' },
        { id: 2, name: 'IST 2', nameWithNationalCenters: 'IST 2' },
      ],
    }) => {
      const hookForm = useForm({
        mode: 'onBlur',
        defaultValues: defaultFormValues,
      });

      const additionalData = {
        users: {
          pointOfContact: [{
            id: 1,
            fullName: 'Ted User',
            nameWithNationalCenters: 'Ted User',
          }],
          collaborators: [
            {
              id: 2,
              fullName: 'Tedwina User',
              nameWithNationalCenters: 'Tedwina User',
            },
          ],
          creators,
        },
      };

      // set the hook form data that is returned from getValues().
      hookForm.getValues = () => defaultFormValues;

      return (
        <FormProvider {...hookForm}>
          <UserContext.Provider value={{ user }}>
            <NetworkContext.Provider value={{ connectionActive: true }}>
              <EventSummary
                additionalData={additionalData}
                reportId={1}
                isAppLoading={false}
                onFormSubmit={jest.fn()}
                onSaveDraft={onSaveDraft}
                onUpdatePage={jest.fn()}
                weAreAutoSaving={false}
                datePickerKey="key"
                Alert={() => <></>}
                showSubmitModal={jest.fn()}
              />
            </NetworkContext.Provider>
          </UserContext.Provider>
        </FormProvider>
      );
    };

    it('renders event summary', async () => {
      const adminUser = {
        ...defaultUser,
        permissions: [
          { regionId: 1, scopeId: ADMIN },
        ],
      };
      act(() => {
        render(<RenderEventSummary user={adminUser} />);
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
      await selectEvent.select(screen.getByLabelText(/Event collaborators/i), []);
      userEvent.tab();

      // confirm the blur event fires and the validation message is present
      expect(await screen.findByText('Select at least one collaborator')).toBeInTheDocument();

      await selectEvent.select(screen.getByLabelText(/Event collaborators/i), ['Tedwina User']);
      await selectEvent.select(screen.getByLabelText(/target populations/i), ['Expectant families']);
      await selectEvent.select(screen.getByLabelText(/event organizer/i), 'IST TTA/Visit');

      const saveDraftButton = await screen.findByRole('button', { name: /save draft/i });
      userEvent.click(saveDraftButton);
      expect(onSaveDraft).toHaveBeenCalled();
    });

    it('admin users can edit all fields', async () => {
      const adminUser = {
        ...defaultUser,
        permissions: [
          { regionId: 1, scopeId: ADMIN },
        ],
      };
      act(() => {
        render(<RenderEventSummary user={adminUser} />);
      });

      // Event ID.
      expect(await screen.findByRole('textbox', { name: /event id required/i })).toBeInTheDocument();

      // Event Name.
      expect(await screen.findByRole('textbox', { name: /event name required/i })).toBeInTheDocument();

      // Event creator.
      const creator = await screen.findByLabelText(/Event creator/i);
      expect(creator).toBeInTheDocument();

      await selectEvent.select(creator, ['IST 2']);

      // Event Organizer.
      expect(await screen.findByRole('combobox', { name: /event organizer/i })).toBeInTheDocument();

      // Event Collaborator.
      expect(await screen.findByRole('combobox', { name: /event collaborators required select\.\.\./i })).toBeInTheDocument();

      // Event Point of Contact.
      expect(await screen.findByRole('combobox', { name: /event region point of contact/i })).toBeInTheDocument();

      // Event Intended Audience.
      expect(await screen.findByRole('group', { name: /event intended audience required/i })).toBeInTheDocument();

      // Event Training Type.
      expect(await screen.findByRole('combobox', { name: /training type/i })).toBeInTheDocument();

      // Event Target Population.
      expect(await screen.findByRole('combobox', { name: /target populations addressed required target population1 target population2/i })).toBeInTheDocument();

      // Event Vision.
      expect(await screen.findByRole('textbox', { name: /event vision required/i })).toBeInTheDocument();
    });

    it('non admin users cant edit certain fields', async () => {
      const nonAdminUser = {
        ...defaultUser,
        permissions: [
          { regionId: 1, scopeId: READ_WRITE_TRAINING_REPORTS },
        ],
      };
      act(() => {
        render(<RenderEventSummary user={nonAdminUser} />);
      });

      // Event Collaborator.
      expect(await screen.findByRole('combobox', { name: /event collaborators required select\.\.\./i })).toBeInTheDocument();

      // Nine additional read only fields.
      expect(screen.queryAllByTestId('read-only-label').length).toBe(9);
    });
    it('handles null creators', async () => {
      const adminUser = {
        ...defaultUser,
        permissions: [
          { regionId: 1, scopeId: ADMIN },
        ],
      };
      act(() => {
        render(<RenderEventSummary user={adminUser} creators={null} />);
      });

      const creator = await screen.findByLabelText(/Event creator/i);

      // Event creator.
      expect(creator).toBeInTheDocument();
    });
  });
});
