import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import CitationDrawerContent from '../CitationDrawerContent';
import AppLoadingContext from '../../AppLoadingContext';

describe('CitationDrawerContent', () => {
  afterEach(() => fetchMock.restore());

  const renderTest = () => {
    render(
      <AppLoadingContext.Provider value={{ setIsAppLoading: jest.fn() }}>
        <CitationDrawerContent citations={[
          {
            citation: 'citation1',
            text: 'text1',
          },
          {
            citation: 'citation2',
            text: 'text2',
          },
        ]}
        />
      </AppLoadingContext.Provider>,
    );
  };

  it('fetches citations', async () => {
    renderTest();

    expect(await screen.findByText('citation1')).toBeInTheDocument();
    expect(await screen.findByText('text1')).toBeInTheDocument();
    expect(await screen.findByText('citation2')).toBeInTheDocument();
    expect(await screen.findByText('text2')).toBeInTheDocument();
  });
});
