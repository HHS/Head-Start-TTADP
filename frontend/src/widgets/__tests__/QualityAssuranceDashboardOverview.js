/* eslint-disable jest/no-disabled-tests */
import '@testing-library/jest-dom';
import React from 'react';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { render, screen } from '@testing-library/react';
import { QualityAssuranceDashboardOverview } from '../QualityAssuranceDashboardOverview';

const renderQualityAssuranceDashboardOverview = (props) => {
  const history = createMemoryHistory();

  render(
    <Router history={history}>
      <QualityAssuranceDashboardOverview loading={props.loading} data={props.data} />
    </Router>,
  );
};

describe('Quality Assurance Dashboard Overview Widget', () => {
  it('handles undefined data', async () => {
    renderQualityAssuranceDashboardOverview({ data: undefined });
    expect(screen.getByText(/Recipients with no TTA/i)).toBeInTheDocument();
    expect(screen.getByText(/Recipients with OHS standard FEI goal/i)).toBeInTheDocument();
    expect(screen.getByText(/Recipients with OHS standard CLASS goal/i)).toBeInTheDocument();
  });

  it('shows the correct data', async () => {
    const data = {
      recipientsWithNoTTA: {
        pct: '11%',
        filterApplicable: true,
      },
      recipientsWithOhsStandardFeiGoals: {
        pct: '22%',
        filterApplicable: true,
      },
      recipientsWithOhsStandardClass: {
        pct: '33.5%',
        filterApplicable: false,
      },
    };

    renderQualityAssuranceDashboardOverview({ data });

    expect(screen.getByText(/Recipients with no TTA/i)).toBeInTheDocument();
    expect(screen.getByText(/Recipients with OHS standard FEI goal/i)).toBeInTheDocument();
    expect(screen.getByText(/Recipients with OHS standard CLASS goal/i)).toBeInTheDocument();

    expect(await screen.findByText(/11%/)).toBeVisible();
    expect(await screen.findByText(/22%/)).toBeVisible();
    expect(await screen.findByText(/33.5%/)).toBeVisible();
    expect(await screen.findByText(/One or more of the selected filters cannot be applied to this data./)).toBeVisible();
  });

  it('shows no results message', async () => {
    const data = {
      recipientsWithNoTTA: {
        pct: '0',
        filterApplicable: true,
      },
      recipientsWithOhsStandardFeiGoals: {
        pct: '0',
        filterApplicable: true,
      },
      recipientsWithOhsStandardClass: {
        pct: '0',
        filterApplicable: true,
      },
    };

    renderQualityAssuranceDashboardOverview({ data });

    expect(screen.getByText(/Recipients with no TTA/i)).toBeInTheDocument();
    expect(screen.getByText(/Recipients with OHS standard FEI goal/i)).toBeInTheDocument();
    expect(screen.getByText(/Recipients with OHS standard CLASS goal/i)).toBeInTheDocument();

    expect(screen.queryAllByText(/No results/i).length).toBe(3);
    expect(screen.queryAllByText(/display details/i).length).toBe(0);
  });
});
