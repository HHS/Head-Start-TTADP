import { render, screen, waitFor } from '@testing-library/react';
import fetchMock from 'fetch-mock';
import React from 'react';
import UserContext from '../../../../UserContext';
import EmailVerifier from '../../EmailVerifier';

describe('EmailVerifier', () => {
  const token = '123';
  const verifyUrl = `/api/users/verify-email/${token}`;

  const unvalidatedUser = () => ({
    id: 1,
    name: 'user1',
    validationStatus: [{ type: 'email', validatedAt: null }],
  });

  const renderVerifier = (props = {}, user = unvalidatedUser()) =>
    render(
      <UserContext.Provider value={{ user }}>
        <EmailVerifier updateUser={jest.fn()} {...props} />
      </UserContext.Provider>
    );

  afterEach(() => fetchMock.restore());

  it('renders nothing and does not call the endpoint without a token', () => {
    const { container } = renderVerifier();
    expect(container).toBeEmptyDOMElement();
    expect(fetchMock.called()).toBe(false);
  });

  it('shows a pending message while verifying', () => {
    fetchMock.post(verifyUrl, new Promise(() => {}));
    renderVerifier({ token });
    expect(screen.getByText(/please wait while your email is being verified/i)).toBeVisible();
  });

  it('verifies the token, shows a success alert, and updates the user', async () => {
    fetchMock.post(verifyUrl, 200);
    const updateUser = jest.fn();
    renderVerifier({ token, updateUser });

    expect(await screen.findByText(/your email has been verified/i)).toBeVisible();
    expect(fetchMock.called(verifyUrl)).toBe(true);
    expect(updateUser).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 1,
        validationStatus: [{ type: 'email', validatedAt: true }],
      })
    );
  });

  it('shows an error alert when the token is invalid', async () => {
    fetchMock.post(verifyUrl, 400);
    const updateUser = jest.fn();
    renderVerifier({ token, updateUser });

    expect(await screen.findByText(/your email could not be verified/i)).toBeVisible();
    expect(screen.queryByText(/account management/i)).toBeNull();
    await waitFor(() => expect(updateUser).not.toHaveBeenCalled());
  });
});
