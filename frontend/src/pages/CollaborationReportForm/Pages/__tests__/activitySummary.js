/* eslint-disable react/prop-types */
/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import '@testing-library/jest-dom';
import {
  render, screen,
} from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import NetworkContext from '../../../../NetworkContext';
import activitySummary, { isPageComplete } from '../activitySummary';
import UserContext from '../../../../UserContext';

const RenderActivitySummary = ({
  networkActive = true,
  collaborators = [{ id: 1, name: 'test', roles: [] }, { id: 2, name: 'test2', roles: [] }],
  defaultValues = {},
}) => {
  const hookForm = useForm({
    mode: 'onChange',
    defaultValues,
  });

  const additionalData = {
    collaborators,
  };

  return (
    <NetworkContext.Provider
      value={{ connectionActive: networkActive, localStorageAvailable: true }}
    >
      <UserContext.Provider value={{ user: { id: 1, permissions: [], name: 'Ted User' } }}>
        <FormProvider {...hookForm}>
          {activitySummary.render(
            additionalData,
            {},
            1,
            null,
            jest.fn(),
            jest.fn(),
            jest.fn(),
            false,
            '',
            jest.fn(),
            () => <></>,
          )}
        </FormProvider>
      </UserContext.Provider>
    </NetworkContext.Provider>
  );
};

describe('CollabReport Activity Summary Page', () => {
  it('renders', () => {
    render(<RenderActivitySummary />);

    expect(screen.getByText('Activity name')).toBeInTheDocument();
  });

  it('shows connection error when network is inactive', () => {
    render(<RenderActivitySummary networkActive={false} />);

    expect(screen.getByText(/Connection error/i)).toBeInTheDocument();
  });

  it('renders collaborators with roles mapping', () => {
    const collaboratorsWithRoles = [
      {
        id: 1,
        name: 'John Doe',
        roles: [{ fullName: 'Health Specialist' }, { fullName: 'Education Specialist' }],
      },
      {
        id: 2,
        name: 'Jane Smith',
        roles: [{ fullName: 'Family Engagement Specialist' }],
      },
    ];

    render(<RenderActivitySummary collaborators={collaboratorsWithRoles} />);

    expect(screen.getByText('Activity name')).toBeInTheDocument();
  });

  it('renders start and end date pickers with proper setup', () => {
    render(<RenderActivitySummary defaultValues={{ startDate: '01/01/2024', endDate: '01/02/2024' }} />);

    expect(screen.getByText('Start date')).toBeInTheDocument();
    expect(screen.getByText('End date')).toBeInTheDocument();
  });

  describe('isPageComplete function', () => {
    it('returns true when form is valid', () => {
      const formState = { isValid: true };
      const formData = {};

      expect(isPageComplete(formData, formState)).toBe(true);
    });

    it('returns false when required strings are missing', () => {
      const formState = { isValid: false };
      const formData = {
        activityName: '',
        activityDescription: 'test',
        activityReasons: ['participate'],
        deliveryMethods: ['virtual'],
        duration: 1.5,
        regionalOrState: 'regional',
        startDate: '01/01/2024',
        endDate: '01/02/2024',
      };

      expect(isPageComplete(formData, formState)).toBe(false);
    });

    it('returns false when required arrays are empty', () => {
      const formState = { isValid: false };
      const formData = {
        activityName: 'Test Activity',
        activityDescription: 'test',
        activityReasons: [],
        deliveryMethods: ['virtual'],
        duration: 1.5,
        regionalOrState: 'regional',
        startDate: '01/01/2024',
        endDate: '01/02/2024',
      };

      expect(isPageComplete(formData, formState)).toBe(false);
    });

    it('returns false when statesInvolved is empty for state activity', () => {
      const formState = { isValid: false };
      const formData = {
        activityName: 'Test Activity',
        activityDescription: 'test',
        activityReasons: ['participate'],
        deliveryMethods: ['virtual'],
        duration: 1.5,
        regionalOrState: 'state',
        statesInvolved: [],
        startDate: '01/01/2024',
        endDate: '01/02/2024',
      };

      expect(isPageComplete(formData, formState)).toBe(false);
    });

    it('returns false when duration is invalid', () => {
      const formState = { isValid: false };
      const formData = {
        activityName: 'Test Activity',
        activityDescription: 'test',
        activityReasons: ['participate'],
        deliveryMethods: ['virtual'],
        duration: NaN,
        regionalOrState: 'regional',
        startDate: '01/01/2024',
        endDate: '01/02/2024',
      };

      expect(isPageComplete(formData, formState)).toBe(false);
    });

    it('returns false when dates are invalid', () => {
      const formState = { isValid: false };
      const formData = {
        activityName: 'Test Activity',
        activityDescription: 'test',
        activityReasons: ['participate'],
        deliveryMethods: ['virtual'],
        duration: 1.5,
        regionalOrState: 'regional',
        startDate: 'invalid-date',
        endDate: '01/02/2024',
      };

      expect(isPageComplete(formData, formState)).toBe(false);
    });

    it('returns true when all required fields are filled correctly', () => {
      const formState = { isValid: false };
      const formData = {
        activityName: 'Test Activity',
        activityDescription: 'test',
        activityReasons: ['participate'],
        deliveryMethods: ['virtual'],
        duration: 1.5,
        regionalOrState: 'regional',
        startDate: '01/01/2024',
        endDate: '01/02/2024',
      };

      expect(isPageComplete(formData, formState)).toBe(true);
    });

    it('returns true when state activity has statesInvolved filled', () => {
      const formState = { isValid: false };
      const formData = {
        activityName: 'Test Activity',
        activityDescription: 'test',
        activityReasons: ['participate'],
        deliveryMethods: ['virtual'],
        duration: 1.5,
        regionalOrState: 'state',
        statesInvolved: ['CA'],
        startDate: '01/01/2024',
        endDate: '01/02/2024',
      };

      expect(isPageComplete(formData, formState)).toBe(true);
    });
  });
});
