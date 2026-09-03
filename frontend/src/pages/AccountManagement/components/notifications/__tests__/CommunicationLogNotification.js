import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import CommunicationLogNotification from '../CommunicationLogNotification';

function renderComponent() {
  function Wrapper() {
    const methods = useForm();
    return (
      <FormProvider {...methods}>
        <CommunicationLogNotification />
      </FormProvider>
    );
  }

  render(<Wrapper />);
}

describe('CommunicationLogNotification', () => {
  it('renders column headers', () => {
    renderComponent();

    expect(screen.getByText('Event')).toBeInTheDocument();
    expect(screen.getByText('In-app')).toBeInTheDocument();
    expect(screen.getAllByText('Email').length).toBeGreaterThan(0);
  });

  it('renders group controller label', () => {
    renderComponent();

    expect(
      screen.getByText('Set preferences for all Communication Log notifications')
    ).toBeInTheDocument();
  });

  it('renders expected row labels', () => {
    renderComponent();

    expect(screen.getByText("I'm added as TTA staff on a Communication Log.")).toBeInTheDocument();
    expect(
      screen.getByText(/A Communication Log was entered for a recipient in one of .*My groups.*\./)
    ).toBeInTheDocument();
  });
});
