import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fetchMock from 'fetch-mock';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import selectEvent from 'react-select-event';
import { TTA_REQUEST_FIELDS } from '../../constants';
import { GoalAndContextFields } from '../goalAndContext';

// eslint-disable-next-line react/prop-types
jest.mock('focus-trap-react', () => ({ children }) => <>{children}</>);

jest.mock(
  '../../../../components/RichEditor',
  () =>
    function MockRichEditor({ ariaLabel, value, onChange }) {
      return (
        <textarea
          aria-label={ariaLabel}
          value={value || ''}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    }
);

const GRANT_ONE = {
  id: 1,
  regionId: 14,
  status: 'Active',
  numberWithProgramTypes: '14HP1234 - EHS',
  name: 'Children and Families First - 14HP1234 - EHS',
};

const MONITORING_GOAL = {
  id: 1,
  name: '(Monitoring) The recipient will develop and implement a QIP/CAP',
  standard: 'Monitoring',
};

const OTHER_GOAL = {
  id: 2,
  name: 'The recipient will improve health services',
  standard: 'Health',
};

const CITATIONS = [
  {
    standardId: 100,
    citation: '1302.91(e)(1)',
    grants: [
      {
        grantId: 1,
        findingType: 'Area of Noncompliance',
        name: 'ANC - 1302.91(e)(1) - Monitoring and Implementing Quality Ed',
        citation: '1302.91(e)(1)',
      },
    ],
  },
];

function Wrapper({ regionId = 14 }) {
  const hookForm = useForm({
    mode: 'onBlur',
    defaultValues: {
      [TTA_REQUEST_FIELDS.GRANTS]: [GRANT_ONE],
      [TTA_REQUEST_FIELDS.GOAL]: null,
      [TTA_REQUEST_FIELDS.CITATIONS]: [],
      [TTA_REQUEST_FIELDS.CONTEXT]: '',
    },
  });
  return (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <FormProvider {...hookForm}>
      <GoalAndContextFields regionId={regionId} />
    </FormProvider>
  );
}

describe('GoalAndContextFields', () => {
  beforeEach(() => {
    fetchMock.get('begin:/api/goal-templates', [MONITORING_GOAL, OTHER_GOAL]);
    fetchMock.get('begin:/api/citations/region', CITATIONS);
  });

  afterEach(() => {
    fetchMock.restore();
  });

  it('shows citations only for the monitoring goal', async () => {
    render(<Wrapper />);

    expect(screen.queryByText('Citations being addressed')).toBeNull();

    await selectEvent.select(screen.getByLabelText(/select goal/i), MONITORING_GOAL.name);

    expect(await screen.findByText('Citations being addressed')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Get help choosing citations' })).toBeVisible();

    await selectEvent.select(screen.getByLabelText(/select goal/i), OTHER_GOAL.name);

    await waitFor(() => {
      expect(screen.queryByText('Citations being addressed')).toBeNull();
    });
  });

  it('opens the goal help drawer', async () => {
    render(<Wrapper />);

    userEvent.click(screen.getByRole('button', { name: 'Get help selecting a goal' }));

    expect(await screen.findByRole('heading', { name: 'Goal guidance' })).toBeVisible();
  });
});
