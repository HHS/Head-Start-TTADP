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

  it('renders the WhenCollaborationReportCollaboratorSubmitted row (renamed id)', () => {
    renderComponent();

    expect(
      screen.getByText(
        'A Collaborator submits an Collaboration Report for approval that I created.'
      )
    ).toBeInTheDocument();
  });

  it('does not render a row for the old WhenCreatorCollaborationReportCollaboratorSubmittedForReview id', () => {
    renderComponent();

    // The old id had this label (confirm it's gone)
    expect(
      screen.queryByText(
        'A Creator submits a Collaboration Report for approval that I am a Collaborator on.'
      )
    ).not.toBeNull(); // this label still exists for WhenCollaborationReportSubmittedForReview

    // But the specific old id key should not render a duplicate
    // Verify only one item with this label exists
    const items = screen.getAllByText(
      'A Creator submits a Collaboration Report for approval that I am a Collaborator on.'
    );
    expect(items).toHaveLength(1);
  });
});
