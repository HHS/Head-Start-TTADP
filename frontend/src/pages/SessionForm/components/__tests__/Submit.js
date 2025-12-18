/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable react/prop-types */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import Submit from '../Submit';
import UserContext from '../../../../UserContext';
import useEventAndSessionStaff from '../../../../hooks/useEventAndSessionStaff';

jest.mock('../../../../hooks/useEventAndSessionStaff');

const FormWrapper = ({ defaultValues, children }) => {
  const hookForm = useForm({
    mode: 'onChange',
    defaultValues,
  });

  return (
    <FormProvider {...hookForm}>
      {children}
    </FormProvider>
  );
};

const renderSubmit = (props, defaultValues = {}, user = { id: 1 }) => {
  render(
    <UserContext.Provider value={{ user }}>
      <FormWrapper defaultValues={defaultValues}>
        <Submit {...props} />
      </FormWrapper>
    </UserContext.Provider>,
  );
};

describe('Submit', () => {
  const defaultProps = {
    onSaveDraft: jest.fn(),
    onUpdatePage: jest.fn(),
    onSubmit: jest.fn(),
    onFormReview: jest.fn(),
    reviewSubmitPagePosition: 5,
    pages: [
      { position: 1, label: 'Page 1', state: 'Complete' },
      { position: 2, label: 'Page 2', state: 'Complete' },
    ],
    isPoc: false,
    isAdmin: false,
  };

  const mockApprovers = [
    { id: 1, fullName: 'Approver One' },
    { id: 2, fullName: 'Approver Two' },
    { id: 3, fullName: 'Approver Three' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    useEventAndSessionStaff.mockReturnValue({
      trainerOptions: mockApprovers,
      optionsForValue: mockApprovers,
    });
  });

  describe('Approver filtering (lines 49-51)', () => {
    it('filters out current user from approver list when isAdmin is false', () => {
      const defaultValues = {
        facilitation: 'regional_tta_staff',
        event: { data: { eventOrganizer: 'REGIONAL_PD_WITH_NATIONAL_CENTERS' } },
        pageState: { 1: 'Complete' },
      };

      // Current user has id: 2, which matches the second approver
      const user = { id: 2 };

      renderSubmit(defaultProps, defaultValues, user);

      // The dropdown should be visible
      expect(screen.getByRole('combobox', { name: /Approving manager/i })).toBeInTheDocument();

      // Approver Two (id: 2, matches user.id) should NOT be in the dropdown
      expect(screen.queryByRole('option', { name: 'Approver Two' })).not.toBeInTheDocument();

      // Other approvers should be visible
      expect(screen.getByRole('option', { name: 'Approver One' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Approver Three' })).toBeInTheDocument();
    });

    it('includes current user in approver list when isAdmin is true', () => {
      const defaultValues = {
        facilitation: 'regional_tta_staff',
        event: { data: { eventOrganizer: 'REGIONAL_PD_WITH_NATIONAL_CENTERS' } },
        pageState: { 1: 'Complete' },
      };

      // Current user has id: 2, which matches the second approver
      const user = { id: 2 };

      renderSubmit(
        { ...defaultProps, isAdmin: true },
        defaultValues,
        user,
      );

      // The dropdown should be visible
      expect(screen.getByRole('combobox', { name: /Approving manager/i })).toBeInTheDocument();

      // Approver Two (id: 2, matches user.id) SHOULD be in the dropdown because isAdmin is true
      expect(screen.getByRole('option', { name: 'Approver Two' })).toBeInTheDocument();

      // All approvers should be visible
      expect(screen.getByRole('option', { name: 'Approver One' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Approver Three' })).toBeInTheDocument();
    });

    it('shows all approvers when current user id does not match any approver (isAdmin false)', () => {
      const defaultValues = {
        facilitation: 'regional_tta_staff',
        event: { data: { eventOrganizer: 'REGIONAL_PD_WITH_NATIONAL_CENTERS' } },
        pageState: { 1: 'Complete' },
      };

      // Current user has id: 999, which does not match any approver
      const user = { id: 999 };

      renderSubmit(defaultProps, defaultValues, user);

      // The dropdown should be visible
      expect(screen.getByRole('combobox', { name: /Approving manager/i })).toBeInTheDocument();

      // All approvers should be visible (none filtered out)
      expect(screen.getByRole('option', { name: 'Approver One' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Approver Two' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Approver Three' })).toBeInTheDocument();
    });
  });
});
