import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GrantStatus, { displayGrantsStatus } from '../GrantStatus';

const { findByRole } = screen;

describe('displayCdiGrantStatus', () => {
  it('returns the correct string for active', () => {
    expect(displayGrantsStatus('active')).toEqual('Active');
  });

  it('returns the correct string for inactive', () => {
    expect(displayGrantsStatus('inactive')).toEqual('Inactive');
  });

  it('returns the correct string for interim-management-cdi', () => {
    expect(displayGrantsStatus('interim-management-cdi')).toEqual('Interim management (CDI)');
  });

  it('returns an empty string for an empty string', () => {
    expect(displayGrantsStatus('')).toEqual('');
  });
});

describe('CdiGrantFilter', () => {
  const renderCdiGrantSelect = (appliedType, onApply) => (
    render(
      <GrantStatus
        onApply={onApply}
        inputId="cdiGrantFilter"
        appliedTTAType={appliedType}
      />,
    ));

  it('calls the on apply handler', async () => {
    const onApply = jest.fn();
    renderCdiGrantSelect('inactive', onApply);
    const select = await findByRole('combobox', { name: /Select grant status to filter by/i });
    userEvent.selectOptions(select, 'active');
    expect(onApply).toHaveBeenCalled();
  });
});
