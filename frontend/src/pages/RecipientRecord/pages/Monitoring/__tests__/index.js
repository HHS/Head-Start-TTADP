import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen, act,
} from '@testing-library/react';
import join from 'url-join';
import fetchMock from 'fetch-mock';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import userEvent from '@testing-library/user-event';
import Monitoring from '../index';
import { citationData, reviewData } from '../testHelpers/mockData';
import UserContext from '../../../../../UserContext';
import AppLoadingContext from '../../../../../AppLoadingContext';

describe('Monitoring', () => {
  const recipientId = 1;
  const regionId = 1;
  const monitoringUrl = join('/', 'api', 'monitoring');

  const citationUrl = join(
    monitoringUrl,
    String(recipientId),
    'region',
    String(regionId),
    'tta',
    'citation',
  );

  const reviewUrl = join(
    monitoringUrl,
    String(recipientId),
    'region',
    String(regionId),
    'tta',
    'review',
  );
  const history = createMemoryHistory();
  const renderTest = (currentPage = '') => {
    render(
      <AppLoadingContext.Provider value={{
        setIsAppLoading: jest.fn(),
        setAppLoadingText: jest.fn(),
      }}
      >
        <UserContext.Provider value={{ user: { id: 1 } }}>
          <Router history={history}>
            <Monitoring
              match={{
                params: {
                  currentPage,
                  recipientId,
                  regionId,
                },
                path: '',
                url: '',
              }}
            />
          </Router>
        </UserContext.Provider>
      </AppLoadingContext.Provider>,
    );
  };

  beforeEach(() => {
    fetchMock.get(citationUrl, citationData);
    fetchMock.get(reviewUrl, reviewData);

    // citation drawer content fetchers
    fetchMock.get('/api/citations/text?citationIds=1302.47%28b%29%285%29%28iv%29', []);
    fetchMock.get('/api/citations/text?citationIds=1392.47%28b%29%285%29%28i%29', []);
    fetchMock.get('/api/citations/text?citationIds=1302.91%28a%29', []);
    fetchMock.get('/api/citations/text?citationIds=1302.12%28m%29', []);
    fetchMock.get('/api/citations/text?citationIds=1302.47%28b%29%285%29%28i%29', []);
  });

  afterEach(() => {
    fetchMock.restore();
  });

  it('forwards to the correct monitoring page', async () => {
    expect(history.location.pathname).toBe('/');
    act(() => {
      renderTest();
    });
    expect(history.location.pathname).toBe(`/recipient-tta-records/${recipientId}/region/${regionId}/monitoring/review`);
  });

  it('renders the review page', async () => {
    act(() => {
      renderTest('review');
    });

    expect(fetchMock.called(reviewUrl)).toBe(true);

    expect(await screen.findAllByTestId('review-card')).toHaveLength(3);
    let toggles = await screen.findAllByRole('button', { name: 'View TTA activity' });
    expect(toggles).toHaveLength(3);
    const [toggle] = toggles;
    act(() => {
      userEvent.click(toggle);
    });

    toggles = await screen.findAllByRole('button', { name: 'View TTA activity' });
    expect(toggles).toHaveLength(2);

    const hideButton = screen.getByRole('button', { name: 'Hide TTA activity' });
    expect(hideButton).toBeInTheDocument();

    expect(await screen.findByText('Monitoring data by review loaded.')).toBeInTheDocument();
  });

  it('renders the citation page', async () => {
    act(() => {
      renderTest('citation');
    });

    expect(fetchMock.called(citationUrl)).toBe(true);

    expect(await screen.findAllByTestId('citation-card')).toHaveLength(4);
    let toggles = await screen.findAllByRole('button', { name: 'View TTA activity' });
    expect(toggles).toHaveLength(4);
    const [toggle] = toggles;
    act(() => {
      userEvent.click(toggle);
    });

    toggles = await screen.findAllByRole('button', { name: 'View TTA activity' });
    expect(toggles).toHaveLength(3);

    const hideButton = screen.getByRole('button', { name: 'Hide TTA activity' });
    expect(hideButton).toBeInTheDocument();
    expect(await screen.findByText('Monitoring data by citation loaded.')).toBeInTheDocument();
  });
});
