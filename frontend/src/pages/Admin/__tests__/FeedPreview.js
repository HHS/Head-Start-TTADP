import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen, act,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fetchMock from 'fetch-mock';
import join from 'url-join';
import FeedPreview from '../FeedPreview';
import { mockRSSData } from '../../../testHelpers';

const tagUrl = join('/', 'api', 'feeds', 'item', '?tag=tag');

describe('FeedPreview', () => {
  const renderTest = () => {
    render(<FeedPreview />);
  };

  afterEach(() => fetchMock.restore());

  it('renders page and submits form', async () => {
    fetchMock.get(tagUrl, mockRSSData());
    act(() => {
      renderTest();
    });

    userEvent.type(await screen.findByLabelText('Tag'), 'tag');
    userEvent.type(await screen.findByLabelText('Title'), 'title');
    userEvent.type(await screen.findByLabelText('Content selector'), 'contentSelector');
    userEvent.type(await screen.findByLabelText('CSS class'), 'cssClass');

    userEvent.click(await screen.findByRole('button', { name: 'Reset' }));

    expect(await screen.findByLabelText('Tag')).toHaveValue('');
    expect(await screen.findByLabelText('Title')).toHaveValue('');
    expect(await screen.findByLabelText('Content selector')).toHaveValue('');
    expect(await screen.findByLabelText('CSS class')).toHaveValue('');

    userEvent.type(await screen.findByLabelText('Tag'), 'tag');
    userEvent.type(await screen.findByLabelText('Title'), 'title');
    userEvent.type(await screen.findByLabelText('Content selector'), 'contentSelector');
    userEvent.type(await screen.findByLabelText('CSS class'), 'cssClass');

    act(() => {
      userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    });

    await waitFor(() => expect(fetchMock.called(tagUrl)).toBe(true));
  });
});
