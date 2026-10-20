import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import fetchMock from 'fetch-mock';
import moment from 'moment';
import React from 'react';
import useTtaRequestCitations from '../useTtaRequestCitations';

const CITATIONS = [
  {
    standardId: 100,
    citation: '1302.91(e)(1)',
    grants: [
      {
        grantId: 1,
        findingType: 'Area of Noncompliance',
        name: 'ANC - 1302.91(e)(1) - Monitoring and Implementing Quality Ed',
        citation: '1302.91(e)(1)',
      },
    ],
  },
  {
    standardId: 101,
    citation: '1302.92(b)',
    grants: [
      {
        grantId: 1,
        findingType: 'Deficiency',
        name: 'DEF - 1302.92(b) - Training and Professional Development',
        citation: '1302.92(b)',
      },
    ],
  },
];

function TestComponent({ regionId, grantIds, isMonitoringGoal }) {
  const { citationOptions, citationNames } = useTtaRequestCitations(
    regionId,
    grantIds,
    isMonitoringGoal
  );

  return (
    <>
      <div data-testid="names">{citationNames.join(', ')}</div>
      <ul>
        {citationOptions.map((group) => (
          <li key={group.label}>
            {group.label}
            <ul>
              {group.options.map((option) => (
                <li key={option.value}>{option.label}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </>
  );
}

const renderHook = (props) =>
  render(<TestComponent regionId={14} grantIds={[1]} isMonitoringGoal {...props} />);

describe('useTtaRequestCitations', () => {
  afterEach(() => {
    fetchMock.restore();
  });

  it('asks for the citations active today, grouped by finding type', async () => {
    fetchMock.get('begin:/api/citations/region/14', CITATIONS);

    renderHook();

    await waitFor(() => {
      expect(fetchMock.called('begin:/api/citations/region/14')).toBe(true);
    });

    // the endpoint returns the citations whose review window covers the date it is given
    expect(fetchMock.lastUrl()).toContain(`reportStartDate=${moment().format('YYYY-MM-DD')}`);
    expect(fetchMock.lastUrl()).toContain('grantIds=1');

    expect(await screen.findByText('Area of Noncompliance')).toBeVisible();
    expect(screen.getByText('Deficiency')).toBeVisible();
    expect(
      screen.getByText('ANC - 1302.91(e)(1) - Monitoring and Implementing Quality Ed')
    ).toBeVisible();
    expect(screen.getByTestId('names')).toHaveTextContent('1302.91(e)(1), 1302.92(b)');
  });

  it('asks for nothing when the goal is not the monitoring goal', async () => {
    fetchMock.get('begin:/api/citations/region/14', CITATIONS);

    renderHook({ isMonitoringGoal: false });

    await waitFor(() => {
      expect(screen.getByTestId('names')).toHaveTextContent('');
    });
    expect(fetchMock.called('begin:/api/citations/region/14')).toBe(false);
    expect(screen.queryByText('Deficiency')).toBeNull();
  });

  it('asks for nothing until a grant has been chosen', async () => {
    fetchMock.get('begin:/api/citations/region/14', CITATIONS);

    renderHook({ grantIds: [] });

    await waitFor(() => {
      expect(screen.getByTestId('names')).toHaveTextContent('');
    });
    expect(fetchMock.called('begin:/api/citations/region/14')).toBe(false);
  });

  it('asks for nothing until the region is known', async () => {
    fetchMock.get('begin:/api/citations/region', CITATIONS);

    renderHook({ regionId: null });

    await waitFor(() => {
      expect(screen.getByTestId('names')).toHaveTextContent('');
    });
    expect(fetchMock.called('begin:/api/citations/region')).toBe(false);
  });

  it('comes back empty when the response has no body', async () => {
    fetchMock.get('begin:/api/citations/region/14', { body: 'null', status: 200 });

    renderHook();

    await waitFor(() => {
      expect(fetchMock.called('begin:/api/citations/region/14')).toBe(true);
    });
    expect(screen.getByTestId('names')).toHaveTextContent('');
    expect(screen.queryByText('Deficiency')).toBeNull();
  });

  it('comes back empty when the citations cannot be read', async () => {
    fetchMock.get('begin:/api/citations/region/14', 403);

    renderHook();

    await waitFor(() => {
      expect(fetchMock.called('begin:/api/citations/region/14')).toBe(true);
    });
    expect(screen.getByTestId('names')).toHaveTextContent('');
    expect(screen.queryByText('Deficiency')).toBeNull();
  });
});
