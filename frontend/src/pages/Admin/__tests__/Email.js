import '@testing-library/jest-dom';
import React from 'react';
import join from 'url-join';
import {
  render, act, screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fetchMock from 'fetch-mock';
import Email from '../Email';

describe('Email', () => {
  const renderTest = () => {
    render(<Email />);
  };

  afterEach(() => fetchMock.restore());

  it('renders page and submits form', async () => {
    act(() => {
      renderTest();
    });

    const toInput = await screen.findByLabelText('To');
    userEvent.type(toInput, 'test@test.com');
    const subjectInput = await screen.findByLabelText('Subject');
    userEvent.type(subjectInput, 'Test Subject');

    const submit = await screen.findByRole('button', { name: 'Send test email' });

    fetchMock.post(join('/', 'api', 'admin', 'email'), { message: 'success' });

    act(() => {
      userEvent.click(submit);
    });

    expect(await screen.findByText('Email successfully sent')).toBeInTheDocument();
  });

  it('handles form error', async () => {
    act(() => {
      renderTest();
    });

    const toInput = await screen.findByLabelText('To');
    userEvent.type(toInput, 'test@test.com');
    const subjectInput = await screen.findByLabelText('Subject');
    userEvent.type(subjectInput, 'Test Subject');

    const submit = await screen.findByRole('button', { name: 'Send test email' });

    fetchMock.post(join('/', 'api', 'admin', 'email'), 500);

    act(() => {
      userEvent.click(submit);
    });

    expect(await screen.findByText('Error attempting to send email')).toBeInTheDocument();
  });
});
