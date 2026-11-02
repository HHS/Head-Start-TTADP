import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import TrainingReportNotifications from '../TrainingReportNotifications';

function renderComponent() {
  function Wrapper() {
    const methods = useForm();
    return (
      <FormProvider {...methods}>
        <TrainingReportNotifications />
      </FormProvider>
    );
  }

  render(<Wrapper />);
}

describe('TrainingReportNotifications', () => {
  it('renders column headers', () => {
    renderComponent();

    expect(screen.getByText('Event')).toBeInTheDocument();
    expect(screen.getByText('In-app')).toBeInTheDocument();
    expect(screen.getAllByText('Email').length).toBeGreaterThan(0);
  });

  it('renders group controller label', () => {
    renderComponent();

    expect(
      screen.getByText('Set preferences for all Training Report notifications')
    ).toBeInTheDocument();
  });

  it('renders expected row labels', () => {
    renderComponent();

    expect(
      screen.getByText("I'm added as a Regional point of contact on a Training Report.")
    ).toBeInTheDocument();
    expect(screen.getByText('Someone submits an event session for my review.')).toBeInTheDocument();
  });

  it('renders the session submitted collaborator row after the added as collaborator row', () => {
    renderComponent();

    const labels = [
      "I'm added as a collaborator on a Training Report.",
      'Someone submits a Training Report session for approval that I am a collaborator on.',
      'Someone submits an event session for my review.',
    ].map((label) => screen.getByText(label));

    labels.slice(1).forEach((label, index) => {
      expect(
        labels[index].compareDocumentPosition(label) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    });
  });
});
