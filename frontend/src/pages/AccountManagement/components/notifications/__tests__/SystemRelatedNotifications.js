import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import SystemRelatedNotifications from '../SystemRelatedNotifications';

function renderComponent() {
  function Wrapper() {
    const methods = useForm();
    return (
      <FormProvider {...methods}>
        <SystemRelatedNotifications />
      </FormProvider>
    );
  }

  render(<Wrapper />);
}

describe('SystemRelatedNotifications', () => {
  it('renders column headers', () => {
    renderComponent();

    expect(screen.getByText('Event')).toBeInTheDocument();
    expect(screen.getByText('In-app')).toBeInTheDocument();
    expect(screen.getAllByText('Email').length).toBeGreaterThan(0);
  });

  it('renders expected row labels', () => {
    renderComponent();

    expect(screen.getByText('Planned system outage alerts.')).toBeInTheDocument();
    expect(screen.getByText('Unplanned system outage alerts.')).toBeInTheDocument();
  });

  it('does not render an in-app checkbox for unplanned outage alerts', () => {
    renderComponent();

    expect(document.getElementById('inAppWhenUnplannedOutage')).not.toBeInTheDocument();
  });
});
