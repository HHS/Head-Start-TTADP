import '@testing-library/jest-dom';
import React from 'react';
import { act } from 'react-dom/test-utils';
import {
  render, screen, fireEvent, waitFor, within,
} from '@testing-library/react';
import moment from 'moment';

import ActivityReport from '../index';

const formData = () => ({
  'activity-method': ['in-person'],
  'activity-type': ['training'],
  duration: '1',
  'end-date': moment(),
  grantees: ['Grantee Name 1'],
  'number-of-participants': '1',
  'participant-category': 'grantee',
  participants: ['CEO / CFO / Executive'],
  reason: ['reason 1'],
  requester: 'grantee',
  'resources-used': 'eclkcurl',
  'start-date': moment(),
  topics: ['first'],
});

const enableParticipantSelect = async (target) => {
  render(<ActivityReport />);

  const enabled = await screen.findByRole('textbox', { name: 'Who was this activity for?' });
  expect(enabled).toBeDisabled();

  const information = await screen.findByRole('group', { name: 'General Information' });
  const grantee = within(information).getByLabelText(target);
  fireEvent.click(grantee);
};

describe('ActivityReport', () => {
  describe('participant selection is enabled', () => {
    it('when grantee is selected', async () => {
      await act(async () => {
        await enableParticipantSelect('Grantee');
        const disabled = await screen.findByRole('textbox', { name: 'Who was this activity for?' });
        expect(disabled).not.toBeDisabled();
      });
    });

    it('when non-grantee is selected', async () => {
      await act(async () => {
        await enableParticipantSelect('Non-Grantee');
        const disabled = await screen.findByRole('textbox', { name: 'Who was this activity for?' });
        expect(disabled).not.toBeDisabled();
      });
    });
  });

  describe('method checkboxes', () => {
    it('require a single selection for the form to be valid', async () => {
      const data = formData();
      delete data['activity-method'];

      render(<ActivityReport initialData={data} />);
      expect(await screen.findByText('Submit')).toBeDisabled();
      const box = await screen.findByLabelText('Virtual');
      fireEvent.click(box);
      await waitFor(() => expect(screen.getByText('Submit')).not.toBeDisabled());
    });
  });

  describe('tta checkboxes', () => {
    it('requires a single selection for the form to be valid', async () => {
      const data = formData();
      delete data['activity-type'];

      render(<ActivityReport initialData={data} />);
      expect(await screen.findByText('Submit')).toBeDisabled();
      const box = await screen.findByLabelText('Training');
      fireEvent.click(box);
      await waitFor(() => expect(screen.getByText('Submit')).not.toBeDisabled());
    });
  });
});
