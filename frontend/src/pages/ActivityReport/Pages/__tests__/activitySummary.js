/* eslint-disable react/prop-types */
/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm } from 'react-hook-form';
import NetworkContext from '../../../../NetworkContext';
import activitySummary, { isPageComplete } from '../activitySummary';

const RenderActivitySummary = ({ passedGroups = null }) => {
  const hookForm = useForm({
    mode: 'onChange',
    defaultValues: {
      goals: [],
      objectivesWithoutGoals: [],
      participants: [],
      activityRecipients: [],
      targetPopulations: [],
      activityReportCollaborators: [],
      reason: [],
    },
  });

  const additionalData = {
    recipients: { grants: [], otherEntities: [] },
    collaborators: [{ id: 1, name: 'test', roles: [] }, { id: 2, name: 'test2', roles: [] }],
    availableApprovers: [],
    groups: passedGroups || [{ id: 1, name: 'group 1' }, { id: 2, name: 'group 2' }],
  };

  return (
    <NetworkContext.Provider value={{ connectionActive: true, localStorageAvailable: true }}>
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
    </NetworkContext.Provider>
  );
};

describe('activity summary', () => {
  describe('duration validation', () => {
    it('shows an error for values < 0.5', async () => {
      const { container } = render(<RenderActivitySummary />);
      const input = container.querySelector('#duration');
      userEvent.type(input, '0');
      expect(await screen.findByText('Duration must be greater than 0 hours')).toBeInTheDocument();
    });

    it('shows an error for numbers > 99', async () => {
      const { container } = render(<RenderActivitySummary />);
      const input = container.querySelector('#duration');
      userEvent.type(input, '99.5');
      expect(await screen.findByText('Duration must be less than or equal to 99 hours')).toBeInTheDocument();
    });
  });
});

describe('groups', () => {
  it('correctly shows and hides all group options', async () => {
    render(<RenderActivitySummary />);

    // Click 'recipient' radio button.
    const recipientCheckBox = screen.queryAllByRole('radio', { name: /recipient/i });
    await act(() => {
      userEvent.click(recipientCheckBox[0]);
    });

    // CLick the use group checkbox.
    let useGroupCheckbox = screen.getByRole('checkbox', { name: /use group/i });
    await act(() => {
      userEvent.click(useGroupCheckbox);
    });

    // Correctly shows the group drop down.
    const groupOption = screen.getByRole('combobox', { name: /group name required/i });
    expect(groupOption).toBeInTheDocument();

    // Uncheck the use group checkbox.
    useGroupCheckbox = screen.getByRole('checkbox', { name: /use group/i });
    await act(() => {
      userEvent.click(useGroupCheckbox);
    });

    // Assert that the group drop down is no longer visible.
    expect(groupOption).not.toBeInTheDocument();

    // Click the other-entity radio button.
    const otherEntityCheckBox = screen.queryAllByRole('radio', { name: /other entity/i });
    await act(() => {
      userEvent.click(otherEntityCheckBox[0]);
    });

    // Verify the use group checkbox is not visible.
    expect(useGroupCheckbox).not.toBeInTheDocument();
  });

  it('hides the use group check box if we dont have any groups', async () => {
    render(<RenderActivitySummary passedGroups={[]} />);

    // Click 'recipient' radio button.
    const recipientCheckBox = screen.queryAllByRole('radio', { name: /recipient/i });
    await act(() => {
      userEvent.click(recipientCheckBox[0]);
    });

    // expect the use group check box not to be visible.
    const useGroupCheckbox = screen.queryByRole('checkbox', { name: /use group/i });
    expect(useGroupCheckbox).not.toBeInTheDocument();
  });
});

describe('isPageComplete', () => {
  const FORM_DATA = {
    activityRecipientType: 'specialist',
    requester: 'specialist',
    deliveryMethod: 'test',
    virtualDeliveryType: '',
    activityRecipients: [{}],
    targetPopulations: ['people'],
    reason: ['reason'],
    ttaType: ['tta'],
    participants: ['participant'],
    duration: 1,
    numberOfParticipants: 3,
    startDate: '09/01/2020',
    endDate: '09/01/2020',
  };

  it('returns true if validated by hook form', async () => {
    const result = isPageComplete({}, { isValid: true });
    expect(result).toBe(true);
  });

  it('validates strings', async () => {
    const result = isPageComplete({ ...FORM_DATA, requester: null }, { isValid: false });
    expect(result).toBe(false);
  });

  it('validates arrays', async () => {
    const result = isPageComplete({ ...FORM_DATA, activityRecipients: [] }, { isValid: false });
    expect(result).toBe(false);
  });

  it('validates numbers', async () => {
    const result = isPageComplete({ ...FORM_DATA, duration: null }, { isValid: false });
    expect(result).toBe(false);
  });

  it('validates dates', async () => {
    const result = isPageComplete({ ...FORM_DATA, startDate: null }, { isValid: false });
    expect(result).toBe(false);
  });

  it('validates delivery method', async () => {
    const result = isPageComplete({ ...FORM_DATA, deliveryMethod: 'virtual' }, { isValid: false });
    expect(result).toBe(true);
  });
});
