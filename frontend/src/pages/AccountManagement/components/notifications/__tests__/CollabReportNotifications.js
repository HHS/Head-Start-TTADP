import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import CollabReportNotifications from '../CollabReportNotifications';

function renderComponent() {
  function Wrapper() {
    const methods = useForm();
    return (
      <FormProvider {...methods}>
        <CollabReportNotifications />
      </FormProvider>
    );
  }

  render(<Wrapper />);
}

describe('CollabReportNotifications', () => {
  it('renders column headers', () => {
    renderComponent();

    expect(screen.getByText('Event')).toBeInTheDocument();
    expect(screen.getByText('In-app')).toBeInTheDocument();
    expect(screen.getAllByText('Email').length).toBeGreaterThan(0);
  });

  it('renders group controller label', () => {
    renderComponent();

    expect(
      screen.getByText('Set preferences for all Collaboration Report notifications')
    ).toBeInTheDocument();
  });

  it('renders expected row labels', () => {
    renderComponent();

    expect(
      screen.getByText('Someone submits a Collaboration Report for my approval.')
    ).toBeInTheDocument();
    expect(
      screen.getByText("I'm added as a collaborator on a Collaboration report.")
    ).toBeInTheDocument();
  });
});
