import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import CitationDrawer from '../components/CitationDrawer';

describe('CitationDrawer', () => {
  const citationUrl = '/api/citations/text?citationIds=citation1';
  const mockCitations = [
    {
      citation: 'citation1',
      text: 'text1',
    },
    {
      citation: 'citation2',
      text: 'text2',
    },
  ];
  afterEach(() => fetchMock.restore());

  const renderTest = () => {
    render(<CitationDrawer citationNumber="citation1" />);
  };

  it('fetches citations', async () => {
    fetchMock.get(citationUrl, mockCitations);

    renderTest();

    expect(fetchMock.called(citationUrl)).toBe(true);

    const button = await screen.findByRole('button', { name: 'citation1' });

    expect(button).toBeVisible();
    expect(await screen.findByText('text1')).not.toBeVisible();
  });
});
