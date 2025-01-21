import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import CitationDrawerContent from '../CitationDrawerContent';

describe('CitationDrawerContent', () => {
  const citationUrl = '/api/citations/text?citationIds=citation1&citationIds=citation2';
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
    render(<CitationDrawerContent citations={['citation1', 'citation2']} />);
  };

  it('fetches citations', async () => {
    fetchMock.get(citationUrl, mockCitations);

    renderTest();

    expect(fetchMock.called(citationUrl)).toBe(true);

    expect(await screen.findByText('citation1')).toBeInTheDocument();
    expect(await screen.findByText('text1')).toBeInTheDocument();
    expect(await screen.findByText('citation2')).toBeInTheDocument();
    expect(await screen.findByText('text2')).toBeInTheDocument();
  });

  it('handles errors', async () => {
    fetchMock.get(citationUrl, 500);

    renderTest();

    expect(fetchMock.called(citationUrl)).toBe(true);
    expect(screen.queryByText('citation1')).not.toBeInTheDocument();
    expect(screen.queryByText('text1')).not.toBeInTheDocument();
    expect(screen.queryByText('citation2')).not.toBeInTheDocument();
    expect(screen.queryByText('text2')).not.toBeInTheDocument();
  });
});
