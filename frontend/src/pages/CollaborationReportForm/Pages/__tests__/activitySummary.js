/* eslint-disable react/prop-types */
/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import '@testing-library/jest-dom';
import {
  render, screen, act,
} from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import userEvent from '@testing-library/user-event';

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
            false,
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

describe('CollabReport ActivitySummary Review Section', () => {
  const RenderReview = ({
    networkActive = true,
  }) => {
    const defaultValues = {
      collabReportSpecialists: [],
      name: '',
      startDate: '',
      endDate: '',
      duration: 0,
      description: '',
      reportReasons: [],
      isStateActivity: 'false',
      activityStates: [],
      method: '',
    };
    const hookForm = useForm({
      mode: 'onChange',
      defaultValues,
    });

    return (
      <NetworkContext.Provider
        value={{ connectionActive: networkActive, localStorageAvailable: true }}
      >
        <UserContext.Provider value={{ user: { id: 1, permissions: [], name: 'Ted User' } }}>
          <FormProvider {...hookForm}>
            {activitySummary.reviewSection()}
          </FormProvider>
        </UserContext.Provider>
      </NetworkContext.Provider>
    );
  };

  it('renders', async () => {
    render(<RenderReview />);

    expect(await screen.findByText('Activity name')).toBeInTheDocument();
  });
});

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

  it('updates end date', async () => {
    render(<RenderActivitySummary defaultValues={{ startDate: '01/01/2024', endDate: '01/02/2024' }} />);

    // I wrote this this way to account for the weird HTML while also preserving the desired pattern
    // of accessing inputs the same way the user would, via the label text
    // TODO: determine if the nested strategy of the FormItem component
    // presents an accessibility issue
    let endDate = document.querySelector(`#${(await screen.findByText(/End date/i)).parentElement.getAttribute('for')}`);
    userEvent.clear(endDate);
    userEvent.type(endDate, '01/04/2025');
    endDate = document.querySelector(`#${(await screen.findByText(/End date/i)).parentElement.getAttribute('for')}`);
    expect(endDate).toHaveValue('01/04/2025');
  });

  describe('isPageComplete function', () => {
    it('returns false when required strings are missing', () => {
      const hookForm = {
        formState: { isValid: false },
        getValues: () => ({
          name: '',
          description: 'test',
          activityReasons: ['participate'],
          conductMethod: 'virtual',
          activityName: '',
          activityDescription: 'test',
          reportReasons: ['participate'],
          deliveryMethods: ['virtual'],
          duration: 1.5,
          isStateActivity: 'false',
          startDate: '01/01/2024',
          endDate: '01/02/2024',
        }),
      };

      expect(isPageComplete(hookForm)).toBe(false);
    });

    it('returns false when required arrays are empty', () => {
      const hookForm = {
        formState: { isValid: false },
        getValues: () => ({
          name: 'Test Activity',
          description: 'test',
          activityReasons: [],
          conductMethod: 'virtual',
          activityName: 'Test Activity',
          activityDescription: 'test',
          reportReasons: [],
          deliveryMethods: ['virtual'],
          duration: 1.5,
          isStateActivity: 'false',
          startDate: '01/01/2024',
          endDate: '01/02/2024',
        }),
      };

      expect(isPageComplete(hookForm)).toBe(false);
    });

    it('returns false when statesInvolved is empty for state activity', () => {
      const hookForm = {
        formState: { isValid: false },
        getValues: () => ({
          name: 'Test Activity',
          description: 'test',
          activityReasons: ['participate'],
          conductMethod: 'virtual',
          activityName: 'Test Activity',
          activityDescription: 'test',
          reportReasons: ['participate'],
          deliveryMethods: ['virtual'],
          duration: 1.5,
          isStateActivity: 'true',
          statesInvolved: [],
          startDate: '01/01/2024',
          endDate: '01/02/2024',
        }),
      };

      expect(isPageComplete(hookForm)).toBe(false);
    });

    it('returns false when duration is invalid', () => {
      const hookForm = {
        formState: { isValid: false },
        getValues: () => ({
          name: 'Test Activity',
          description: 'test',
          activityReasons: ['participate'],
          conductMethod: 'virtual',
          activityName: 'Test Activity',
          activityDescription: 'test',
          reportReasons: ['participate'],
          deliveryMethods: ['virtual'],
          duration: NaN,
          isStateActivity: 'false',
          startDate: '01/01/2024',
          endDate: '01/02/2024',
        }),
      };

      expect(isPageComplete(hookForm)).toBe(false);
    });

    it('returns false when dates are invalid', () => {
      const hookForm = {
        formState: { isValid: false },
        getValues: () => ({
          name: 'Test Activity',
          description: 'test',
          activityReasons: ['participate'],
          conductMethod: 'virtual',
          activityName: 'Test Activity',
          activityDescription: 'test',
          reportReasons: ['participate'],
          deliveryMethods: ['virtual'],
          duration: 1.5,
          isStateActivity: 'false',
          startDate: 'invalid-date',
          endDate: '01/02/2024',
        }),
      };

      expect(isPageComplete(hookForm)).toBe(false);
    });

    it('returns true when all required fields are filled correctly', () => {
      const hookForm = {
        formState: { isValid: false },
        getValues: () => ({
          name: 'Test Activity',
          description: 'test',
          reportReasons: ['participate'],
          conductMethod: 'virtual',
          duration: 1.5,
          isStateActivity: 'false',
          startDate: '01/01/2024',
          endDate: '01/02/2024',
        }),
      };

      expect(isPageComplete(hookForm)).toBe(true);
    });

    it('returns true when state activity has statesInvolved filled', () => {
      const hookForm = {
        formState: { isValid: false },
        getValues: () => ({
          name: 'Test Activity',
          description: 'test',
          reportReasons: ['participate'],
          conductMethod: 'virtual',
          duration: 1.5,
          isStateActivity: 'true',
          statesInvolved: ['CA'],
          startDate: '01/01/2024',
          endDate: '01/02/2024',
        }),
      };

      expect(isPageComplete(hookForm)).toBe(true);
    });

    it('returns true when regional activity without statesInvolved', () => {
      const hookForm = {
        formState: { isValid: false },
        getValues: () => ({
          name: 'Test Activity',
          description: 'test',
          activityReasons: ['participate'],
          reportReasons: ['participate'],
          conductMethod: 'virtual',
          duration: 1.5,
          isStateActivity: 'false',
          startDate: '01/01/2024',
          endDate: '01/02/2024',
        }),
      };

      expect(isPageComplete(hookForm)).toBe(true);
    });

    it('returns false when name is missing', () => {
      const hookForm = {
        formState: { isValid: false },
        getValues: () => ({
          name: '',
          description: 'test',
          activityReasons: ['participate'],
          conductMethod: 'virtual',
          duration: 1.5,
          isStateActivity: 'false',
          startDate: '01/01/2024',
          endDate: '01/02/2024',
        }),
      };

      expect(isPageComplete(hookForm)).toBe(false);
    });

    it('returns false when description is missing', () => {
      const hookForm = {
        formState: { isValid: false },
        getValues: () => ({
          name: 'Test Activity',
          description: '',
          activityReasons: ['participate'],
          reportReasons: ['participate'],
          conductMethod: 'virtual',
          duration: 1.5,
          isStateActivity: 'false',
          startDate: '01/01/2024',
          endDate: '01/02/2024',
        }),
      };

      expect(isPageComplete(hookForm)).toBe(false);
    });

    it('returns false when conductMethod is null', () => {
      const hookForm = {
        formState: { isValid: false },
        getValues: () => ({
          name: 'Test Activity',
          description: 'test',
          activityReasons: ['participate'],
          reportReasons: ['participate'],
          conductMethod: null,
          duration: 1.5,
          isStateActivity: 'false',
          startDate: '01/01/2024',
          endDate: '01/02/2024',
        }),
      };

      expect(isPageComplete(hookForm)).toBe(false);
    });

    it('returns false when duration is 0', () => {
      const hookForm = {
        formState: { isValid: false },
        getValues: () => ({
          name: 'Test Activity',
          description: 'test',
          activityReasons: ['participate'],
          conductMethod: 'virtual',
          reportReasons: ['participate'],
          duration: 0,
          isStateActivity: 'false',
          startDate: '01/01/2024',
          endDate: '01/02/2024',
        }),
      };

      expect(isPageComplete(hookForm)).toBe(false);
    });

    it('returns false when duration is null', () => {
      const hookForm = {
        formState: { isValid: false },
        getValues: () => ({
          name: 'Test Activity',
          description: 'test',
          activityReasons: ['participate'],
          reportReasons: ['participate'],
          conductMethod: 'virtual',
          duration: null,
          isStateActivity: 'false',
          startDate: '01/01/2024',
          endDate: '01/02/2024',
        }),
      };

      expect(isPageComplete(hookForm)).toBe(false);
    });

    it('returns false when both dates are invalid', () => {
      const hookForm = {
        formState: { isValid: false },
        getValues: () => ({
          name: 'Test Activity',
          description: 'test',
          activityReasons: ['participate'],
          conductMethod: 'virtual',
          reportReasons: ['participate'],
          duration: 1.5,
          isStateActivity: 'false',
          startDate: 'invalid-date',
          endDate: 'invalid-date',
        }),
      };

      expect(isPageComplete(hookForm)).toBe(false);
    });

    it('returns false when end date is invalid', () => {
      const hookForm = {
        formState: { isValid: false },
        getValues: () => ({
          name: 'Test Activity',
          description: 'test',
          activityReasons: ['participate'],
          reportReasons: ['participate'],
          conductMethod: 'virtual',
          duration: 1.5,
          isStateActivity: 'false',
          startDate: '01/01/2024',
          endDate: 'invalid-date',
        }),
      };

      expect(isPageComplete(hookForm)).toBe(false);
    });

    it('returns false when statesInvolved is null for state activity', () => {
      const hookForm = {
        formState: { isValid: false },
        getValues: () => ({
          name: 'Test Activity',
          description: 'test',
          reportReasons: ['participate'],
          conductMethod: 'virtual',
          duration: 1.5,
          isStateActivity: 'true',
          statesInvolved: null,
          startDate: '01/01/2024',
          endDate: '01/02/2024',
        }),
      };

      expect(isPageComplete(hookForm)).toBe(false);
    });
  });

  describe('State activity conditional rendering', () => {
    it('shows states fieldset when state activity is selected', async () => {
      render(
        <RenderActivitySummary
          defaultValues={{ isStateActivity: 'true' }}
        />,
      );

      expect(screen.getByText('Choose the states involved')).toBeInTheDocument();
    });

    it('hides states fieldset when regional activity is selected', async () => {
      render(
        <RenderActivitySummary
          defaultValues={{ isStateActivity: 'false' }}
        />,
      );

      expect(screen.queryByText('Choose the states involved')).not.toBeInTheDocument();
    });

    it('hides states fieldset by default when no value is set', async () => {
      render(<RenderActivitySummary />);

      expect(screen.queryByText('Choose the states involved')).not.toBeInTheDocument();
    });

    it('renders StateMultiSelect component when states fieldset is shown', async () => {
      render(
        <RenderActivitySummary
          defaultValues={{ isStateActivity: 'true' }}
        />,
      );

      expect(screen.getByText('Choose the states involved')).toBeInTheDocument();
      // StateMultiSelect should render - we can verify by checking for the multi-select structure
      const statesField = screen.getByText('Choose the states involved').closest('fieldset');
      expect(statesField).toBeInTheDocument();
    });

    it('shows states fieldset when user selects state radio button', async () => {
      render(<RenderActivitySummary />);

      // Initially, states fieldset should not be visible
      expect(screen.queryByText('Choose the states involved')).not.toBeInTheDocument();

      const stateRadio = screen.getByLabelText('State');

      await act(async () => {
        userEvent.click(stateRadio);
      });

      expect(await screen.findByText('Choose the states involved')).toBeInTheDocument();
    });

    it('hides states fieldset when user selects regional radio button', async () => {
      render(
        <RenderActivitySummary
          defaultValues={{ isStateActivity: 'true' }}
        />,
      );

      // Verify states fieldset is initially shown
      expect(screen.getByText('Choose the states involved')).toBeInTheDocument();

      const regionalRadio = screen.getByLabelText('Regional');

      await act(async () => {
        userEvent.click(regionalRadio);
      });

      expect(screen.queryByText('Choose the states involved')).not.toBeInTheDocument();
    });
  });
});
