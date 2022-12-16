import React from 'react';
import {
  act,
  render,
  screen,
  waitFor,
  fireEvent,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import { MemoryRouter, Route } from 'react-router';
import AccountManagement from '../..';
import UserContext from '../../../../UserContext';

describe('AccountManagement', () => {
  const now = new Date();

  const validatedUser = {
    name: 'user1',
    lastLogin: now,
    validationStatus: [{ type: 'email', validatedAt: now }],
  };

  const unvalidatedUser = {
    name: 'user1',
    lastLogin: now,
    validationStatus: [],
  };

  const token = 123;
  const verifyUrl = `/account/verify-email/${token}`;
  const accountUrl = '/account';

  const renderAM = (user, pth) => {
    render(
      <MemoryRouter initialEntries={[pth]}>
        <Route path="/account/verify-email/:token" exact>
          <UserContext.Provider value={{ user }}>
            <AccountManagement updateUser={() => {}} />
          </UserContext.Provider>
        </Route>
        <Route path="/account" exact>
          <UserContext.Provider value={{ user }}>
            <AccountManagement updateUser={() => {}} />
          </UserContext.Provider>
        </Route>
      </MemoryRouter>,
    );
  };

  beforeAll(() => {
    fetchMock.get('/api/settings/email', 200);
  });

  afterAll(() => {
    fetchMock.restore();
  });

  describe('email verification', () => {
    describe('when token is present, endpoint is called', () => {
      beforeAll(async () => {
        fetchMock.post(`/api/users/verify-email/${token}`, 200);
        act(() => renderAM(unvalidatedUser, verifyUrl));
      });

      afterAll(() => fetchMock.restore());

      it('calls endpoint', async () => {
        expect(fetchMock.called(`/api/users/verify-email/${token}`)).toBe(true);
      });

      describe('when visiting /account, show verif. button', () => {
        beforeEach(async () => {
          act(() => renderAM(unvalidatedUser, accountUrl));
          await screen.findByText(/account management/i);
        });

        it('shows verify button', async () => {
          expect(screen.queryByTestId('send-verification-email-button')).toBeInTheDocument();
        });

        it('calls the endpoint when clicked', async () => {
          fetchMock.post('/api/users/send-verification-email', {});
          expect(screen.queryByTestId('send-verification-email-button')).toBeInTheDocument();
          await act(async () => {
            fireEvent.click(screen.getByTestId('send-verification-email-button'));
          });

          await waitFor(() => {
            expect(fetchMock.called('/api/users/send-verification-email')).toBe(true);
          });

          fetchMock.restore();
        });
      });
    });

    describe('success / good token', () => {
      beforeAll(async () => {
        fetchMock.post(`/api/users/verify-email/${token}`, 200);
        act(() => renderAM(validatedUser, verifyUrl));
      });

      afterAll(() => fetchMock.restore());

      it('should show a success alert', async () => {
        expect(fetchMock.called(`/api/users/verify-email/${token}`)).toBe(true);
        await waitFor(() => {
          expect(screen.queryByText(/your email has been verified/i)).toBeInTheDocument();
          expect(screen.queryByTestId('email-preferences-form')).toBeInTheDocument();
        });
      });
    });

    describe('failure / bad token', () => {
      beforeAll(async () => {
        fetchMock.post(`/api/users/verify-email/${token}`, 400);
        act(() => renderAM(unvalidatedUser, verifyUrl));
        await screen.findByText(/account management/i);
      });

      afterAll(() => fetchMock.restore());

      it('should show an error alert', async () => {
        expect(fetchMock.called(`/api/users/verify-email/${token}`)).toBe(true);
        await waitFor(() => {
          expect(screen.queryByText(/your email could not be verified/i)).toBeInTheDocument();
        });
      });
    });

    describe('already validated user visits /account', () => {
      beforeAll(async () => {
        act(() => renderAM(validatedUser, accountUrl));
        await screen.findByText(/account management/i);
      });

      it('should not show verify button', async () => {
        expect(screen.queryByText(/send verification email/i)).not.toBeInTheDocument();
      });
    });
  });
});
