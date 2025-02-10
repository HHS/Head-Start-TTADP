import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import join from 'url-join';

import ExternalLink from '../ExternalResourceModal';
import { isExternalURL, isValidURL } from '../../utils';
import { HEAD_START_GOVERNMENT_HOSTNAME_EXTENSION } from '../../Constants';
import { mockWindowProperty } from '../../testHelpers';

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
    const modal = document.querySelector('#ExternalResourceModal');
    expect(modal).toHaveClass('is-visible');
  });

  it('closes modal when cancel button is pressed', async () => {
    // Given an external link
    render(<ExternalLink to="https://www.google.com">something</ExternalLink>);
    const link = await screen.findByText('something');

    // When the users clicks it
    userEvent.click(link);
    let modal = document.querySelector('#ExternalResourceModal');
    expect(modal).toHaveClass('is-visible');

    // Then the user can make the modal disappear via the cancel button
    const cancelButton = await screen.findByText('Cancel');
    userEvent.click(cancelButton);

    modal = document.querySelector('#ExternalResourceModal');
    expect(modal).toHaveClass('is-hidden');
  });

  it('closes modal when escape key is pressed', async () => {
    // Given an external link
    render(<ExternalLink to="https://www.google.com">something</ExternalLink>);
    const link = await screen.findByText('something');

    // When the users clicks it
    userEvent.click(link);
    let modal = document.querySelector('#ExternalResourceModal');
    expect(modal).toHaveClass('is-visible');

    // Then they try to close with delete key
    const modalWindow = await screen.findByRole('heading', { name: /external resources disclaimer/i, hidden: true });
    userEvent.type(modalWindow, '{del}', { skipClick: true });

    modal = document.querySelector('#ExternalResourceModal');
    expect(modal).toHaveClass('is-visible');

    // And they can close the modal via the escape key
    userEvent.type(modal, '{esc}', { skipClick: true });
    modal = document.querySelector('#ExternalResourceModal');
    expect(modal).toHaveClass('is-hidden');
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
    const modal = document.querySelector('#ExternalResourceModal');
    expect(modal).toHaveClass('is-hidden');

    // And a new tab has been opened
    expect(windowSpy).toHaveBeenCalledWith('https://www.google.com', '_blank');
  });

  it('shows internal goverment link when ok is pressed', async () => {
    windowSpy.mockReturnValue();
    const url = `https://shrek${HEAD_START_GOVERNMENT_HOSTNAME_EXTENSION}`;

    // Given an external link
    render(<ExternalLink to={url}>something</ExternalLink>);
    const link = await screen.findByText('something');

    // When the users clicks it
    userEvent.click(link);

    // Then we see no modal
    expect(screen.queryByTestId('modal')).not.toBeTruthy();

    // And a new tab has been opened
    expect(windowSpy).toHaveBeenCalledWith(url, '_blank');
  });

  it('shows normal non-hyperlink text with non-url', async () => {
    // Given a normal chunk of text
    render(<ExternalLink to="hakuna matata">The mighty lion sleeps tonight</ExternalLink>);

    // When the user tries to click it
    const text = await screen.findByText('hakuna matata');
    userEvent.click(text);

    // Then nothing will happen b/c its plain text
    expect(screen.queryByTestId('modal')).not.toBeTruthy();
  });
});

describe('utility functions', () => {
  mockWindowProperty('location', {
    host: 'government.gov',
  });

  it('utility function correctly assumes external URLs', () => {
    // Given a url
    const url = join('https://fiona.com', 'some-internal', 'url');

    // When we check if it's external
    // Then we see it is
    expect(isExternalURL(url)).toBeTruthy();
  });

  it('utility function correctly assumes NON-external URLs', () => {
    // Given a url
    const url = join('http://government.gov', 'some-internal', 'url');

    // When we check if it's external
    // Then we see it is not
    expect(isExternalURL(url)).toBeFalsy();
  });

  it('utility function correctly validates internal urls', () => {
    // Given an internal url
    const internal = join('http://government.gov', 'some-internal', 'url');

    // When we check if its valid
    // Then we see it is
    expect(isValidURL(internal)).toBeTruthy();
  });

  it('utility function correctly validates other govemernt urls', () => {
    const urls = ['https://shrek', 'https://www.fiona', 'http://donkey'];

    // Given an internal url
    urls.forEach((url) => {
      const internal = join(`${url}${HEAD_START_GOVERNMENT_HOSTNAME_EXTENSION}`, 'some-internal', 'url');
      // When we check if its valid
      // Then we see it is
      expect(isExternalURL(internal)).not.toBeTruthy();
    });
  });
});
