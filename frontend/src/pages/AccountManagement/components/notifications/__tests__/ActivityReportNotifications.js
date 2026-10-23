import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import UserContext from '../../../../../UserContext';
import ActivityReportNotifications from '../ActivityReportNotifications';

function renderComponent(user = { roles: [] }) {
  function Wrapper() {
    const methods = useForm();
    return (
      <UserContext.Provider value={{ user }}>
        <FormProvider {...methods}>
          <ActivityReportNotifications />
        </FormProvider>
      </UserContext.Provider>
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
        'A manager requests changes to an Activity Report that I created, collaborated on, or am assigned to approve.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText("I'm added as a collaborator on an activity report.")
    ).toBeInTheDocument();
  });

  it('renders the new WhenCollaboratorReportSubmittedForReview row', () => {
    renderComponent();

    expect(
      screen.getByText(
        'Someone submits an Activity Report for approval that I am a collaborator on.'
      )
    ).toBeInTheDocument();
  });

  it('renders the new WhenCreatorReportSubmittedForReview row', () => {
    renderComponent();

    expect(
      screen.getByText('Someone submits an Activity Report for approval that I created.')
    ).toBeInTheDocument();
  });

  const PS_LABEL = "One of my recipients' activity reports is available.";

  it.each(['PS', 'SPS', 'GMS'])('renders the program specialist row for %s users', (role) => {
    renderComponent({ roles: [{ name: role }] });

    expect(screen.getByText(PS_LABEL)).toBeInTheDocument();
  });

  it('does not render the program specialist row for other users', () => {
    renderComponent({ roles: [{ name: 'ECM' }] });

    expect(screen.queryByText(PS_LABEL)).not.toBeInTheDocument();
  });
});
