/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import {
  render, screen, act, fireEvent,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import { useForm, FormProvider } from 'react-hook-form';
import userEvent from '@testing-library/user-event';
import selectEvent from 'react-select-event';
import sessionSummary, { isPageComplete } from '../sessionSummary';
import NetworkContext from '../../../../NetworkContext';
import { NOT_STARTED } from '../../../../components/Navigator/constants';

describe('sessionSummary', () => {
  describe('isPageComplete', () => {
    it('returns true if form state is valid', () => {
      expect(isPageComplete({ getValues: jest.fn(() => true) })).toBe(true);
    });

    it('returns false otherwise', () => {
      expect(isPageComplete({ getValues: jest.fn(() => false) })).toBe(false);
    });
  });
  describe('review', () => {
    it('renders correctly', async () => {
      act(() => {
        render(<>{sessionSummary.reviewSection()}</>);
      });

      expect(await screen.findByRole('heading', { name: /event summary/i })).toBeInTheDocument();
    });
  });
  describe('render', () => {
    const onSaveDraft = jest.fn();

    const defaultFormValues = {
      id: 0,
      ownerId: null,
      eventId: '',
      eventDisplayId: 'event-dispplay-id',
      eventName: 'Event name',
      regionId: 0,
      status: 'In progress',
      pageState: {
        1: NOT_STARTED,
        2: NOT_STARTED,
      },
    };

    const RenderSessionSummary = () => {
      const hookForm = useForm({
        mode: 'onBlur',
        defaultValues: defaultFormValues,
      });

      return (
        <FormProvider {...hookForm}>
          <NetworkContext.Provider value={{ connectionActive: true }}>
            {sessionSummary.render(
              null,
              defaultFormValues,
              1,
              false,
              jest.fn(),
              onSaveDraft,
              jest.fn(),
              false,
              'key',
            )}
          </NetworkContext.Provider>
        </FormProvider>
      );
    };

    beforeEach(async () => {
      fetchMock.get('/api/topic', [
        { id: 1, name: 'Behavioral Health' },
        { id: 2, name: 'Complaint' },
      ]);
    });

    it('renders session summary', async () => {
      act(() => {
        render(<RenderSessionSummary />);
      });

      const sessionName = await screen.findByLabelText(/session name/i);
      act(() => {
        fireEvent.focus(sessionName);
        userEvent.tab();
        userEvent.type(sessionName, 'Session name');
      });

      const startDate = await screen.findByLabelText(/session start Date/i, { selector: '#startDate' });
      act(() => {
        userEvent.type(startDate, '01/01/2021');
      });

      const endDate = await screen.findByLabelText(/session end Date/i, { selector: '#endDate' });
      act(() => {
        userEvent.type(endDate, '01/02/2021');
      });

      act(() => {
        userEvent.clear(startDate);
        userEvent.type(startDate, '01/03/2021');
      });

      const duration = await screen.findByLabelText(/duration/i);
      act(() => {
        userEvent.type(duration, '1.25');
      });

      const sessionObjective = await screen.findByLabelText(/session objective/i);
      act(() => {
        userEvent.type(sessionObjective, 'Session objective');
      });

      await selectEvent.select(screen.getByLabelText(/topics/i), ['Complaint']);
      const trainers = await screen.findByLabelText(/Who were the trainers for this session?/i);
      await selectEvent.select(trainers, ['PFCE']);

      const resourceOne = await screen.findByLabelText(/resource 1/i);
      act(() => {
        userEvent.type(resourceOne, 'http://www.resource.com');
      });

      const addNewResource = await screen.findByRole('button', { name: /add new resource/i });
      act(() => {
        userEvent.click(addNewResource);
      });

      const resourceTwo = await screen.findByLabelText(/resource 2/i);
      act(() => {
        userEvent.type(resourceTwo, 'http://www.resource2.com');
      });

      const removeResourceOne = await screen.findByRole('button', { name: /remove resource 1/i });
      act(() => {
        userEvent.click(removeResourceOne);
      });

      const yesOnTheFilesSir = document.querySelector('#addObjectiveFilesYes');
      act(() => {
        userEvent.click(yesOnTheFilesSir);
      });

      const supportType = await screen.findByLabelText(/support type/i);
      act(() => {
        userEvent.selectOptions(supportType, 'Planning');
      });

      const saveDraftButton = await screen.findByRole('button', { name: /save session/i });
      userEvent.click(saveDraftButton);
      expect(onSaveDraft).toHaveBeenCalled();
    });
  });
});
