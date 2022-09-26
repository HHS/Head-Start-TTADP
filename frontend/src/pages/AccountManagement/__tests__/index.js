import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import AccountManagement from '..';
import UserContext from '../../../UserContext';

describe('AccountManagement', () => {
  const now = new Date();

  const normalUser = {
    name: 'user1',
    lastLogin: now,
  };

  const keys = [
    'emailWhenAppointedCollaborator',
    'emailWhenChangeRequested',
    'emailWhenReportApproval',
    'emailWhenReportSubmittedForReview',
  ];

  const vals = [
    'immediately',
    'never',
    'this month',
    'this week',
    'today',
  ];

  const unsub = keys.map((key) => ({ key, value: 'never' }));
  const sub = keys.map((key) => ({ key, value: 'immediately' }));
  const cust = keys.map((key, index) => ({ key, value: vals[index] }));

  const renderAM = (u) => {
    const user = u || normalUser;

    render(
      <UserContext.Provider value={{ user }}>
        <AccountManagement
          user={user}
        />
      </UserContext.Provider>,
    );
  };

  describe('email preferences', () => {
    describe('unsubscribed', () => {
      beforeEach(async () => {
        fetchMock.get('/api/settings/email', unsub);
        fetchMock.put('/api/settings/email/unsubscribe', 204);
        renderAM();
        await screen.findByText('Account Management');
      });

      afterEach(() => fetchMock.restore());

      it('radio button should be automatically selected', async () => {
        const radio = screen.getByTestId('radio-unsubscribe');
        expect(radio).toBeChecked();
      });

      it('save button hits unsubscribe endpoint', async () => {
        expect(fetchMock.calls().length).toBe(1);
        const button = screen.getByTestId('email-prefs-submit');

        await act(async () => {
          fireEvent.click(button);
          await waitFor(() => {
            const success = screen.getByTestId('email-prefs-save-success-message');
            expect(success).toBeVisible();
          });
        });

        expect(fetchMock.called('/api/settings/email/unsubscribe')).toBeTruthy();
        expect(fetchMock.calls().length).toBe(2);
      });
    });

    describe('subscribed', () => {
      beforeEach(async () => {
        fetchMock.get('/api/settings/email', sub);
        fetchMock.put('/api/settings/email/subscribe', 204);
        renderAM();
        await screen.findByText('Account Management');
      });

      afterEach(() => fetchMock.restore());

      it('radio button should be automatically selected', async () => {
        const radio = screen.getByTestId('radio-subscribe');
        expect(radio).toBeChecked();
      });

      it('save button hits subscribe endpoint', async () => {
        expect(fetchMock.calls().length).toBe(1);
        const button = screen.getByTestId('email-prefs-submit');

        await act(async () => {
          fireEvent.click(button);
          await waitFor(() => {
            const success = screen.getByTestId('email-prefs-save-success-message');
            expect(success).toBeVisible();
          });
        });

        expect(fetchMock.called('/api/settings/email/subscribe')).toBeTruthy();
        expect(fetchMock.calls().length).toBe(2);
      });
    });

    describe('custom', () => {
      beforeEach(async () => {
        fetchMock.get('/api/settings/email', cust);
        fetchMock.put('/api/settings', 204);
        renderAM();
        await screen.findByText('Account Management');
      });

      afterEach(() => fetchMock.restore());

      it('radio button should be automatically selected', async () => {
        const radio = screen.getByTestId('radio-customized');
        expect(radio).toBeChecked();
      });

      it('dropdowns should have the right values', async () => {
        // for each key value pair of cust, expect the dropdown with
        // the data-testid that matches `${key}-dropdown` to have a value
        // that matches `${val}`
        cust.forEach((c) => {
          const dropdown = screen.getByTestId(`${c.key}-dropdown`);
          expect(dropdown).toHaveValue(c.value);
        });
      });

      it('save button hits updateSettings endpoint', async () => {
        expect(fetchMock.calls().length).toBe(1);
        const button = screen.getByTestId('email-prefs-submit');

        await act(async () => {
          fireEvent.click(button);
          await waitFor(() => {
            const success = screen.getByTestId('email-prefs-save-success-message');
            expect(success).toBeVisible();
          });
        });

        expect(fetchMock.called('/api/settings')).toBeTruthy();
        expect(fetchMock.calls().length).toBe(2);
      });
    });

    describe('failure', () => {
      beforeEach(async () => {
        fetchMock.get('/api/settings/email', cust);
        fetchMock.put('/api/settings', 400);
        renderAM();
        await screen.findByText('Account Management');
      });

      afterEach(() => fetchMock.restore());

      it('fetch failure shows error message', async () => {
        expect(fetchMock.calls().length).toBe(1);
        const button = screen.getByTestId('email-prefs-submit');

        await act(async () => {
          fireEvent.click(button);
          await waitFor(() => {
            const success = screen.getByTestId('email-prefs-save-fail-message');
            expect(success).toBeVisible();
          });
        });

        expect(fetchMock.called('/api/settings')).toBeTruthy();
        expect(fetchMock.calls().length).toBe(2);
      });
    });
  });
});
