import '@testing-library/jest-dom';
import React from 'react';
import reactSelectEvent from 'react-select-event';
import { act } from 'react-dom/test-utils';
import {
  render, screen, fireEvent, waitFor, within,
} from '@testing-library/react';
import moment from 'moment';

import { withText } from '../../../testHelpers';
import ActivityReport from '../index';

const formData = () => ({
  'activity-method': 'in-person',
  'activity-type': ['training'],
  duration: '1',
  'end-date': moment(),
  grantees: 'Grantee Name 1',
  'number-of-participants': '1',
  'participant-category': 'grantee',
  participants: ['CEO / CFO / Executive'],
  'program-types': ['type 1'],
  requester: 'grantee',
  'resources-used': 'eclkcurl',
  'start-date': moment(),
  'target-populations': ['target 1'],
  topics: 'first',
});

describe('ActivityReport', () => {
  describe('grantee select', () => {
    describe('changes the participant selection to', () => {
      it('Grantee', async () => {
        await act(async () => {
          render(<ActivityReport />);
          const information = await waitFor(() => screen.getByRole('group', { name: 'Who was the activity for?' }));
          const grantee = within(information).getByLabelText('Grantee');
          fireEvent.click(grantee);
          const granteeSelectbox = await screen.getByRole('textbox', { name: 'Grantee name(s)' });
          reactSelectEvent.openMenu(granteeSelectbox);
        });
        expect(await waitFor(() => screen.getByText(withText('Grantee Name 1')))).toBeVisible();
      });

      it('Non-grantee', async () => {
        await act(async () => {
          render(<ActivityReport />);
          const information = await waitFor(() => screen.getByRole('group', { name: 'Who was the activity for?' }));
          const nonGrantee = within(information).getByLabelText('Non-Grantee');
          fireEvent.click(nonGrantee);
          const granteeSelectbox = await screen.getByRole('textbox', { name: 'Grantee name(s)' });
          reactSelectEvent.openMenu(granteeSelectbox);
        });
        expect(await waitFor(() => screen.getByText(withText('QRIS System')))).toBeVisible();
      });
    });

    it('when non-grantee is selected', async () => {
      await act(async () => {
        render(<ActivityReport />);
        const enabled = await screen.getByRole('textbox', { name: 'Grantee name(s)' });
        expect(enabled).toBeDisabled();
        const information = await waitFor(() => screen.getByRole('group', { name: 'Who was the activity for?' }));
        const grantee = within(information).getByLabelText('Grantee');
        fireEvent.click(grantee);
        const disabled = await screen.getByRole('textbox', { name: 'Grantee name(s)' });
        expect(disabled).not.toBeDisabled();
      });
    });
  });

  describe('method checkboxes', () => {
    it('require a single selection for the form to be valid', async () => {
      await act(async () => {
        const data = formData();
        delete data['activity-method'];

        render(<ActivityReport initialData={data} />);
        expect(await waitFor(() => screen.getByText('Continue'))).toBeDisabled();
        const box = await waitFor(() => screen.getByLabelText('Virtual'));
        fireEvent.click(box);
      });
      await waitFor(() => expect(screen.getByText('Continue')).not.toBeDisabled());
    });
  });

  describe('tta checkboxes', () => {
    it('requires a single selection for the form to be valid', async () => {
      const data = formData();
      delete data['activity-type'];

      render(<ActivityReport initialData={data} />);
      expect(await waitFor(() => screen.getByText('Continue'))).toBeDisabled();
      const box = await waitFor(() => screen.getByLabelText('Training'));
      fireEvent.click(box);
      await waitFor(() => expect(screen.getByText('Continue')).not.toBeDisabled());
    });
  });
});
