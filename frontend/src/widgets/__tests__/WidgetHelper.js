import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import FormatNumber from '../WidgetHelper';

const renderFormattedNumber = (number, decimalPlaces) => {
  render(<div>{FormatNumber(number, decimalPlaces)}</div>);
};

describe('Format Number', () => {
  it('renders with correct decimal places and separator', async () => {
    // Multiple Decimal Places with Thousands Separator.
    renderFormattedNumber(14258.25697, 5);
    expect(screen.getByText(/14,258\.25697/i)).toBeInTheDocument();

    // Undefined Decimal Places (defaults to 0).
    renderFormattedNumber(36);
    expect(screen.getByText(/36/i)).toBeInTheDocument();

    // Single Decimal Place Rounded.
    renderFormattedNumber(578.694, 1);
    expect(screen.getByText(/578\.7/i)).toBeInTheDocument();

    // Two Decimal Places Rounded.
    renderFormattedNumber(578.675, 2);
    expect(screen.getByText(/578\.68/i)).toBeInTheDocument();

    // Three Decimal Places Rounded.
    renderFormattedNumber(578976238.1237, 3);
    expect(screen.getByText(/578,976,238\.124/i)).toBeInTheDocument();

    // NaN Passed.
    renderFormattedNumber('100f');
    expect(screen.getByText(/0/i)).toBeInTheDocument();
  });
});
