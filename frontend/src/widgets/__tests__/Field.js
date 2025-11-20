/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Field } from '../DashboardOverview';

describe('Field component', () => {
  const baseProps = {
    label: 'Test Label',
    data: 'Test Data',
    icon: 'test-icon',
    iconColor: 'test-color',
    backgroundColor: 'test-bg-color',
  };

  it('renders without tooltip', () => {
    render(<Field {...baseProps} showTooltip={false} />);
    expect(screen.queryByTestId('tooltip')).not.toBeInTheDocument();
  });

  it('renders with tooltip', () => {
    render(<Field {...baseProps} showTooltip />);
    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
  });
});
