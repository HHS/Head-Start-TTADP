import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen, fireEvent, waitFor, within,
} from '@testing-library/react';

import ActivityReport from '../index';

const formData = () => ({
  'activity-method': ['in-person'],
  'activity-type': ['training'],
  duration: '1',
  'end-date': new Date(),
  grantees: 'Grantee Name 1',
  'number-of-participants': '1',
  'participant-category': 'grantee',
  participants: 'CEO / CFO / Executive',
  reason: 'reason 1',
  requester: 'grantee',
  'resources-used': 'eclkcurl',
  'start-date': new Date(),
  topics: 'first',
});

describe('ActivityReport', () => {
  describe('grantee select', () => {
    describe('changes the participant selection to', () => {
      it('Grantee', async () => {
        render(<ActivityReport />);

        const information = await waitFor(() => screen.getByRole('group', { name: 'General Information' }));
        const grantee = within(information).getByLabelText('Grantee');
        fireEvent.click(grantee);
        expect(await screen.findByDisplayValue('Select a Grantee...')).toBeVisible();
      });

      it('Non-grantee', async () => {
        render(<ActivityReport />);

        const information = await waitFor(() => screen.getByRole('group', { name: 'General Information' }));
        const nonGrantee = within(information).getByLabelText('Non-Grantee');
        fireEvent.click(nonGrantee);
        expect(await screen.findByDisplayValue('Select a Non-grantee...')).toBeVisible();
      });
    });

    it('enables the participant selection', async () => {
      render(<ActivityReport />);

      expect(await screen.findByDisplayValue('Select a Grantee...')).toBeDisabled();

      const information = await waitFor(() => screen.getByRole('group', { name: 'General Information' }));
      const grantee = within(information).getByLabelText('Grantee');
      fireEvent.click(grantee);
      expect(await screen.findByDisplayValue('Select a Grantee...')).not.toBeDisabled();
    });
  });

  describe('method checkboxes', () => {
    it('require a single selection for the form to be valid', async () => {
      const data = formData();
      delete data['activity-method'];

      render(<ActivityReport initialData={data} />);
      expect(await waitFor(() => screen.getByText('Submit'))).toBeDisabled();
      const box = await waitFor(() => screen.getByLabelText('Virtual'));
      fireEvent.click(box);
      await waitFor(() => expect(screen.getByText('Submit')).not.toBeDisabled());
    });
  });

  describe('tta checkboxes', () => {
    it('requires a single selection for the form to be valid', async () => {
      const data = formData();
      delete data['activity-type'];

      render(<ActivityReport initialData={data} />);
      expect(await waitFor(() => screen.getByText('Submit'))).toBeDisabled();
      const box = await waitFor(() => screen.getByLabelText('Training'));
      fireEvent.click(box);
      await waitFor(() => expect(screen.getByText('Submit')).not.toBeDisabled());
    });
  });
});
