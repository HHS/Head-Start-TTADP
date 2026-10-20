import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import fetchMock from 'fetch-mock';
import React from 'react';
import AppLoadingContext from '../../../../../AppLoadingContext';
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
    render(
      <AppLoadingContext.Provider value={{ setIsAppLoading: jest.fn() }}>
        <CitationDrawer citationNumber={['citation1']} />
      </AppLoadingContext.Provider>
    );
  };

  it('fetches citations', async () => {
    fetchMock.get(citationUrl, mockCitations);

    renderTest();

    expect(fetchMock.called(citationUrl)).toBe(true);

    const button = await screen.findByRole('button', { name: 'citation1' });

    expect(button).toBeVisible();
    expect(await screen.findByText('text1')).not.toBeVisible();
  });

  it('handles errors', async () => {
    fetchMock.get(citationUrl, 500);

    renderTest();

    expect(fetchMock.called(citationUrl)).toBe(true);
    expect(screen.queryByText('citation1', { selector: 'button' })).toBeInTheDocument();
    expect(screen.queryByText('text1')).not.toBeInTheDocument();
  });
});
