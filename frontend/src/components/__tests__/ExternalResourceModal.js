import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ExternalLink } from '../ExternalResourceModal';

let windowSpy;

describe('External Resources', () => {
  beforeEach(() => {
    windowSpy = jest.spyOn(window, 'open');
  });

  afterEach(() => {
    windowSpy.mockRestore();
  });

  it('shows modal when an external link is clicked', async () => {
    // Given a external link
    render(<ExternalLink to="https://www.google.com">something</ExternalLink>);
    const link = await screen.findByText('something');

    // when a users preses the link
    userEvent.click(link);

    // Then we see the modal
    expect(await screen.findByTestId('modal')).toBeVisible();
  });

  it('closes modal when cancel button is pressed', async () => {
    // Given an external link
    render(<ExternalLink to="https://www.google.com">something</ExternalLink>);
    const link = await screen.findByText('something');

    // When the users clicks it
    userEvent.click(link);
    expect(await screen.findByTestId('modal')).toBeVisible();

    // Then the user can make the modal disappear via the cancel button
    const cancelButton = await screen.findByText('Cancel');
    userEvent.click(cancelButton);
    expect(screen.queryByTestId('modal')).not.toBeTruthy();
  });

  it('closes modal when escape key is pressed', async () => {
    // Given an external link
    render(<ExternalLink to="https://www.google.com">something</ExternalLink>);
    const link = await screen.findByText('something');

    // When the users clicks it
    userEvent.click(link);
    const modal = await screen.findByTestId('modal');
    expect(modal).toBeVisible();

    // Then they can close the modal via the escape key
    userEvent.type(modal, '{esc}', { skipClick: true });
    expect(screen.queryByTestId('modal')).not.toBeTruthy();
  });

  it('shows external link when ok is pressed', async () => {
    windowSpy.mockReturnValue();

    // Given an external link
    render(<ExternalLink to="https://www.google.com">something</ExternalLink>);
    const link = await screen.findByText('something');

    // When the users clicks it
    userEvent.click(link);
    const acceptButton = await screen.findByText('View External Resource');
    userEvent.click(acceptButton);

    // Then we hide the modal
    expect(screen.queryByTestId('modal')).not.toBeTruthy();

    // And a new tab has been opened
    expect(windowSpy).toHaveBeenCalledWith('https://www.google.com', '_blank');
  });
});
