import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';

import PrintableObjective from '../PrintableObjective';

describe('PrintableObjective', () => {
  const renderPrintableObjective = (objective) => render(
    <PrintableObjective objective={objective} />,
  );

  it('will display an objective with an uncertain status', async () => {
    const objective = {
      arId: 1,
      status: 'Uncertain',
      title: 'This is a title',
      grantNumber: '3',
      endDate: '2020-01-01',
      reasons: [],
      activityReports: [],
    };
    renderPrintableObjective(objective);
    expect(await screen.findByText('Uncertain')).toBeInTheDocument();
  });

  it('will display an objective with no status', async () => {
    const objective = {
      arId: 1,
      title: 'This is a title',
      grantNumber: '3',
      endDate: '2020-01-01',
      reasons: [],
      activityReports: [],
    };
    renderPrintableObjective(objective);
    expect(await screen.findByText(/Needs Status/i)).toBeInTheDocument();
  });
});
