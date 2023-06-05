/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { useForm, FormProvider } from 'react-hook-form';
import userEvent from '@testing-library/user-event';
import selectEvent from 'react-select-event';
import eventSummary from '../eventSummary';
import NetworkContext from '../../../../NetworkContext';

describe('eventSummary', () => {
  describe('render', () => {
    const onSaveDraft = jest.fn();

    const defaultFormValues = {
      eventId: 'Event-id-1',
      eventName: 'Event-name-1',
    };

    const RenderEventSummary = () => {
      const hookForm = useForm({
        mode: 'onBlur',
        defaultValues: defaultFormValues,
      });

      return (
        <FormProvider {...hookForm}>
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
                },
              },
              defaultFormValues,
              1,
              false,
              jest.fn(),
              onSaveDraft,
              jest.fn(),
            )}
          </NetworkContext.Provider>
        </FormProvider>
      );
    };

    it('renders event summary', async () => {
      act(() => {
        render(<RenderEventSummary />);
      });

      const startDate = await screen.findByLabelText(/Event start Date/i, { selector: '#startDate' });
      userEvent.type(startDate, '01/01/2021');

      const endDate = await screen.findByLabelText(/Event end Date/i, { selector: '#endDate' });
      userEvent.type(endDate, '01/01/2021');

      await selectEvent.select(screen.getByLabelText(/Event region point of contact/i), 'Ted User');
      await selectEvent.select(screen.getByLabelText(/Event collaborators/i), ['Tedwina User']);

      await selectEvent.select(screen.getByLabelText(/target populations/i), ['Pregnant Women']);
      await selectEvent.select(screen.getByLabelText(/reasons/i), ['Complaint']);

      const saveDraftButton = await screen.findByRole('button', { name: /save draft/i });
      userEvent.click(saveDraftButton);
      expect(onSaveDraft).toHaveBeenCalled();
    });
  });
});
