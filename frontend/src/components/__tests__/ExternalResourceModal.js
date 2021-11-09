import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import join from 'url-join';

import ExternalLink from '../ExternalResourceModal';
import { isExternalURL, isValidURL } from '../../utils';
import { GOVERNMENT_HOSTNAME_EXTENSION } from '../../Constants';

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

    // Then they try to close with delete key
    userEvent.type(modal, '{del}', { skipClick: true });
    expect(screen.queryByTestId('modal')).toBeTruthy();

    // And they can close the modal via the escape key
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

  it('shows internal goverment link when ok is pressed', async () => {
    windowSpy.mockReturnValue();
    const url = `https://shrek${GOVERNMENT_HOSTNAME_EXTENSION}`;

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

// For mocking `process.env`, I got it from https://stackoverflow.com/a/48042799
describe('utility functions', () => {
  const OLD_WINDOW = global.window;

  beforeEach(() => {
    jest.resetModules(); // it clears the cache
    delete global.window.location;
    global.window = Object.create(window);
    global.window.location = {
      host: 'government.gov',
    };
  });

  afterAll(() => {
    global.window.location = OLD_WINDOW;
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
      const internal = join(`${url}${GOVERNMENT_HOSTNAME_EXTENSION}`, 'some-internal', 'url');
      // When we check if its valid
      // Then we see it is
      expect(isExternalURL(internal)).not.toBeTruthy();
    });
  });
});
