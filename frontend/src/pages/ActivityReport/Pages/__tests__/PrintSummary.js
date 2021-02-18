/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import PrintSummary from '../PrintSummary';

describe('PrintSummary', () => {
  it('when a reportCreator with name and role is provided, it renders that', () => {
    const reportCreator = { name: 'Lois Lane', role: 'Reporter' };

    render(
      <PrintSummary reportCreator={reportCreator} />,
    );

    const expectedResult = 'Lois Lane, Reporter';
    const result = screen.getByText(expectedResult);

    expect(result).not.toBeNull();
    expect(screen.queryByText('Report Creator')).not.toBeNull();
  });

  it('when a reportCreator with name but no role is provided, it renders the name', () => {
    const reportCreator = { name: 'Clark Kent' };

    render(
      <PrintSummary reportCreator={reportCreator} />,
    );

    const expectedResult = 'Clark Kent';
    const result = screen.getByText(expectedResult);

    expect(result).not.toBeNull();
    expect(screen.queryByText('Clark Kent,')).toBeNull();
    expect(screen.queryByText('Report Creator')).not.toBeNull();
  });

  it('when a reportCreator is empty or not provided, it does not render the report creator row', () => {
    render(
      <PrintSummary />,
    );
    expect(screen.queryByText('Report Creator')).toBeNull();

    render(
      <PrintSummary reportCreator={{}} />,
    );
    expect(screen.queryByText('Report Creator')).toBeNull();
  });

  it('when a reportCreator has empty name and role strings, it does not render the report creator row', () => {
    const emptyCreator = { name: '', role: '' };
    render(
      <PrintSummary reportCreator={emptyCreator} />,
    );
    expect(screen.queryByText('Report Creator')).toBeNull();

    const roleWithoutAName = { name: '', role: 'Ghost' };
    render(
      <PrintSummary reportCreator={roleWithoutAName} />,
    );
    expect(screen.queryByText('Report Creator')).toBeNull();
  });
});
