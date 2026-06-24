import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import ActivityReportNotifications from '../ActivityReportNotifications';

function renderComponent() {
  function Wrapper() {
    const methods = useForm();
    return (
      <FormProvider {...methods}>
        <ActivityReportNotifications />
      </FormProvider>
    );
  }

  render(<Wrapper />);
}

describe('ActivityReportNotifications', () => {
  it('renders column headers', () => {
    renderComponent();

    expect(screen.getByText('Event')).toBeInTheDocument();
    expect(screen.getByText('In-app')).toBeInTheDocument();
    expect(screen.getAllByText('Email').length).toBeGreaterThan(0);
  });

  it('renders group controller label', () => {
    renderComponent();

    expect(
      screen.getByText('Set preferences for all Activity Report notifications')
    ).toBeInTheDocument();
  });

  it('renders expected row labels', () => {
    renderComponent();

    expect(
      screen.getByText('Someone submits an Activity Report for my approval.')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'A manager requests changes to an activity report that I created or collaborated on.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText("I'm added as a collaborator on an activity report.")
    ).toBeInTheDocument();
  });
});
