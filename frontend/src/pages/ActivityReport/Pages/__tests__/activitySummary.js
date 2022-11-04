/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm } from 'react-hook-form/dist/index.ie11';
import NetworkContext from '../../../../NetworkContext';
import activitySummary, { isPageComplete } from '../activitySummary';

const RenderActivitySummary = () => {
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
    collaborators: [],
    availableApprovers: [],
  };

  return (
    <NetworkContext.Provider value={{ connectionActive: true, localStorageAvailable: true }}>
      <FormProvider {...hookForm}>
        {activitySummary.render(additionalData)}
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
    expect(result).toBe(false);
  });
});
