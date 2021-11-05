import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import fetchMock from 'fetch-mock';
import TTAHistory from '../TTAHistory';

describe('Grantee Record - TTA History', () => {
  const response = {
    numReports: '1', numGrants: '1', inPerson: '0', sumDuration: '1.0', numParticipants: '1',
  };

  const filtersToApply = [
    {
      id: '1',
      topic: 'region',
      condition: 'Contains',
      query: ['400', '401'],
    },
    {
      id: '2',
      topic: 'granteeId',
      condition: 'Contains',
      query: '100',
    },
    {
      id: '3',
      topic: 'modelType',
      condition: 'Is',
      query: 'grant',
    },
  ];

  const renderTTAHistory = (filters = filtersToApply) => {
    render(<TTAHistory onApplyFilters={jest.fn()} filters={filters} />);
  };

  beforeEach(async () => {
    const url = '/api/widgets/overview?region.in[]=400&region.in[]=401&granteeId.in[]=100&modelType.is=grant';
    fetchMock.get(url, response);
  });

  afterEach(() => {
    fetchMock.restore();
  });

  it('renders the TTA History page appropriately', async () => {
    act(() => renderTTAHistory());
    const onePointOh = await screen.findByText('1.0');
    expect(onePointOh).toBeInTheDocument();
  });
});
