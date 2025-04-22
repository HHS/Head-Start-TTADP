/* eslint-disable react/prop-types */
/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm } from 'react-hook-form';
import NetworkContext from '../../../../NetworkContext';
import activitySummary, { isPageComplete } from '../activitySummary';

const RenderActivitySummary = ({ passedGroups = null, passedGoals = [] }) => {
  const hookForm = useForm({
    mode: 'onChange',
    defaultValues: {
      goals: passedGoals,
      objectivesWithoutGoals: [],
      participants: [],
      activityRecipients: [],
      targetPopulations: [],
      activityReportCollaborators: [],
      activityReason: null,
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

  describe('start date citations validation', () => {
    it('correctly displays the start date citations validation', async () => {
      const passedGoalsWithCitations = [
        {
          id: 1,
          name: 'goal 1',
          standard: 'Monitoring',
          objectives: [
            {
              id: 1,
              title: 'objective 1',
              citations: [
                {
                  id: 1,
                  monitoringReferences: [{
                    reportDeliveryDate: '2024-08-07T04:00:00+00:00',
                  }],
                },
              ],
            },
          ],
        },
      ];
      const { container } = render(
        <RenderActivitySummary passedGoals={passedGoalsWithCitations} />,
      );
      const input = container.querySelector('#startDate');
      userEvent.type(input, '01/01/2024');
      // trigger blur.
      userEvent.tab();
      expect(await screen.findByText('The date entered is not valid with the selected citations.')).toBeInTheDocument();
    });

    it('does not show the start date citations validation when the date is valid', async () => {
      const passedGoalsWithCitations = [
        {
          id: 1,
          name: 'goal 1',
          standard: 'Monitoring',
          objectives: [
            {
              id: 1,
              title: 'objective 1',
              citations: [
                {
                  id: 1,
                  monitoringReferences: [{
                    reportDeliveryDate: '2024-08-07T04:00:00+00:00',
                  }],
                },
              ],
            },
          ],
        },
      ];
      const { container } = render(
        <RenderActivitySummary passedGoals={passedGoalsWithCitations} />,
      );
      const input = container.querySelector('#startDate');
      userEvent.type(input, '08/08/2024');
      // trigger blur.
      userEvent.tab();
      expect(screen.queryByText('The date entered is not valid with the selected citations.')).not.toBeInTheDocument();
    });
  });
});

describe('ReviewSection', () => {
  it('should display both participant fields when deliveryMethod is hybrid', () => {
    // Create a wrapper component to use the hook
    const TestComponent = () => {
      const hookForm = useForm({
        mode: 'onChange',
        defaultValues: {
          deliveryMethod: 'hybrid',
          numberOfParticipants: 10,
          numberOfParticipantsVirtually: 15,
        },
      });

      return (
        <FormProvider {...hookForm}>
          <NetworkContext.Provider value={{ connectionActive: true, localStorageAvailable: true }}>
            <activitySummary.reviewSection />
          </NetworkContext.Provider>
        </FormProvider>
      );
    };

    render(<TestComponent />);

    expect(screen.getByText('Number of participants attending in person')).toBeInTheDocument();
    expect(screen.getByText('Number of participants attending virtually')).toBeInTheDocument();

    const inPersonValue = screen.getByText('10');
    const virtualValue = screen.getByText('15');

    expect(inPersonValue).toBeInTheDocument();
    expect(virtualValue).toBeInTheDocument();
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
    ttaType: ['tta'],
    participants: ['participant'],
    duration: 1,
    numberOfParticipants: 3,
    startDate: '09/01/2020',
    endDate: '09/01/2020',
    language: ['English'],
    activityReason: 'recipient requested',
  };

  it('returns true if validated by hook form', async () => {
    const result = isPageComplete({}, { isValid: true });
    expect(result).toBe(true);
  });

  it('validates strings', async () => {
    const result = isPageComplete({ ...FORM_DATA, activityReason: null }, { isValid: false });
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

  it('validates language', async () => {
    const result = isPageComplete({ ...FORM_DATA, language: [] }, { isValid: false });
    expect(result).toBe(false);
  });

  it('validates language has value', async () => {
    const result = isPageComplete({ ...FORM_DATA, language: null }, { isValid: false });
    expect(result).toBe(false);
  });
});
