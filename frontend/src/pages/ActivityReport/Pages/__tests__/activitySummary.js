/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm } from 'react-hook-form/dist/index.ie11';
import NetworkContext from '../../../../NetworkContext';
import activitySummary from '../activitySummary';

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
    it('shows an error for negative values', async () => {
      const { container } = render(<RenderActivitySummary />);
      const input = container.querySelector('#duration');
      userEvent.type(input, '-1');
      expect(await screen.findByText('Duration can not be negative')).toBeInTheDocument();
    });

    it('shows an error for numbers higher than 99.5', async () => {
      const { container } = render(<RenderActivitySummary />);
      const input = container.querySelector('#duration');
      userEvent.type(input, '100');
      expect(await screen.findByText('Duration must be less than 100 hours')).toBeInTheDocument();
    });
  });
});
