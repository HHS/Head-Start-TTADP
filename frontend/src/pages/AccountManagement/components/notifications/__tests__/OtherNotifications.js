import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import OtherNotifications from '../OtherNotifications';

function renderComponent() {
  function Wrapper() {
    const methods = useForm();
    return (
      <FormProvider {...methods}>
        <OtherNotifications />
      </FormProvider>
    );
  }

  render(<Wrapper />);
}

describe('OtherNotifications', () => {
  it('renders column headers', () => {
    renderComponent();

    expect(screen.getByText('Event')).toBeInTheDocument();
    expect(screen.getByText('In-app')).toBeInTheDocument();
    expect(screen.getAllByText('Email').length).toBeGreaterThan(0);
  });

  it('renders expected row labels', () => {
    renderComponent();

    expect(
      screen.getByText(
        "New monitoring details are added for recipients in my region where I'm the TTAC or Manager."
      )
    ).toBeInTheDocument();
    expect(screen.getByText(/I'm added as a Co-owner of a .*My group.*\./)).toBeInTheDocument();
    expect(screen.getByText(/Some shares their .*My group.* with me\./)).toBeInTheDocument();
  });
});
