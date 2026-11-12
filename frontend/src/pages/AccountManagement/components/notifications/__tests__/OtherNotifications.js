import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import UserContext from '../../../../../UserContext';
import OtherNotifications from '../OtherNotifications';

const MONITORING_LABEL =
  "A new monitoring report is added for recipients in my region where I'm the TTAC or Manager.";

const CO_OWNER_LABEL = /I'm added as a Co-owner of a .*My group.*\./;
const SHARED_GROUP_LABEL = /Someone shares their .*My group.* with me\./;

function Wrapper({ user }) {
  const methods = useForm();
  return (
    <UserContext.Provider value={{ user }}>
      <FormProvider {...methods}>
        <OtherNotifications />
      </FormProvider>
    </UserContext.Provider>
  );
}

function renderComponent(
  user = { roles: [{ name: 'TTAC' }], flags: ['actionable_notifications'] }
) {
  render(<Wrapper user={user} />);
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

    expect(screen.getByText(MONITORING_LABEL)).toBeInTheDocument();
    expect(screen.getByText(CO_OWNER_LABEL)).toBeInTheDocument();
    expect(screen.getByText(SHARED_GROUP_LABEL)).toBeInTheDocument();
  });

  it('hides the group rows without the actionable_notifications flag', () => {
    renderComponent({ roles: [{ name: 'TTAC' }], flags: [] });

    expect(screen.getByText(MONITORING_LABEL)).toBeInTheDocument();
    expect(screen.queryByText(CO_OWNER_LABEL)).not.toBeInTheDocument();
    expect(screen.queryByText(SHARED_GROUP_LABEL)).not.toBeInTheDocument();
  });

  it.each(['TTAC', 'ECM', 'GSM'])('shows the monitoring row to %s users', (role) => {
    renderComponent({ roles: [{ name: role }] });

    expect(screen.getByText(MONITORING_LABEL)).toBeInTheDocument();
  });

  it('hides the monitoring row from users without a TTAC or manager role', () => {
    renderComponent({
      roles: [{ name: 'GS' }, { name: 'SS' }],
      flags: ['actionable_notifications'],
    });

    expect(screen.queryByText(MONITORING_LABEL)).not.toBeInTheDocument();
    expect(screen.getByText(SHARED_GROUP_LABEL)).toBeInTheDocument();
  });

  it('hides the monitoring row when there is no user', () => {
    renderComponent(null);

    expect(screen.queryByText(MONITORING_LABEL)).not.toBeInTheDocument();
  });
});
