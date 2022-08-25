import React from 'react';
import { render, screen } from '@testing-library/react';
import fetchMock from 'fetch-mock';
import { MemoryRouter } from 'react-router';
import AccountManagement from '..';
import UserContext from '../../../UserContext';

describe('AccountManagement', () => {
  const now = new Date();

  const normalUser = {
    name: 'user1',
    lastLogin: now,
    validationStatus: [{ type: 'email', validatedAt: now }],
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
    'monthlyDigest',
    'weeklyDigest',
    'dailyDigest',
  ];

  const unsub = keys.map((key) => ({ key, value: 'never' }));
  const sub = keys.map((key) => ({ key, value: 'immediately' }));
  const cust = keys.map((key, index) => ({ key, value: vals[index] }));

  const renderAM = (u) => {
    const user = u || normalUser;

    render(
      <MemoryRouter>
        <UserContext.Provider value={{ user }}>
          <AccountManagement
            updateUser={() => {}}
          />
        </UserContext.Provider>
      </MemoryRouter>,
    );
  };

  describe('email preferences', () => {
    describe('unsubscribed', () => {
      beforeEach(async () => {
        fetchMock.get('/api/settings/email', unsub);
        renderAM();
        await screen.findByText('Account Management');
      });

      afterEach(() => fetchMock.restore());

      it('radio button should be automatically selected', async () => {
        const radio = screen.getByTestId('radio-unsubscribe');
        expect(radio).toBeChecked();
      });
    });
    describe('subscribed', () => {
      beforeEach(async () => {
        fetchMock.get('/api/settings/email', sub);
        renderAM();
        await screen.findByText('Account Management');
      });

      afterEach(() => fetchMock.restore());

      it('radio button should be automatically selected', async () => {
        const radio = screen.getByTestId('radio-subscribe');
        expect(radio).toBeChecked();
      });
    });
    describe('custom', () => {
      beforeEach(async () => {
        fetchMock.get('/api/settings/email', cust);
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
        // the name that matches `${key}-dropdown` to have the value
        // that matches `${val}`
        cust.forEach((c) => {
          const dropdown = screen.getByTestId(`${c.key}-dropdown`);
          expect(dropdown).toHaveValue(c.value);
        });
      });
    });
  });
});
