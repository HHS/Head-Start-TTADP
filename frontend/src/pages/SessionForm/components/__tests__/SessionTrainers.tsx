/* eslint-disable react/prop-types */
/* eslint-disable react/jsx-props-no-spreading */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';
import selectEvent from 'react-select-event';
import { TRAINING_EVENT_ORGANIZER } from '../../../../Constants';
import useEventAndSessionStaff from '../../../../hooks/useEventAndSessionStaff';
import SessionTrainers from '../SessionTrainers';

jest.mock('../../../../hooks/useEventAndSessionStaff');

const defaultEvent = {
  regionId: 1,
  data: {
    endDate: '01/01/2026',
    eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS,
    facilitation: 'regional_tta_staff',
  },
};

const defaultTrainerOptions = [
  {
    label: 'Regional trainers',
    options: [
      { id: 1, fullName: 'Regional Trainer 1' },
      { id: 2, fullName: 'Regional Trainer 2' },
    ],
  },
];

function FormStateHarness() {
  const { setValue } = useFormContext();

  return (
    <button
      type="button"
      onClick={() => setValue('trainers', [{ id: 1, fullName: 'Regional Trainer 1' }])}
    >
      remove other trainer
    </button>
  );
}

function RenderSessionTrainers({
  event = defaultEvent,
  defaultValues = { trainers: [], otherTrainers: '' },
  showHarness = false,
}) {
  const hookForm = useForm({
    mode: 'onBlur',
    defaultValues,
  });

  return (
    <FormProvider {...hookForm}>
      <SessionTrainers event={event} />
      {showHarness ? <FormStateHarness /> : null}
    </FormProvider>
  );
}

describe('SessionTrainers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useEventAndSessionStaff as jest.Mock).mockReturnValue({
      trainerOptions: defaultTrainerOptions,
      optionsForValue: defaultTrainerOptions,
    });
  });

  it('renders trainer selector', async () => {
    render(<RenderSessionTrainers />);
    expect(await screen.findByLabelText(/Who provided the TTA/i)).toBeInTheDocument();
  });

  it('includes "Other" trainer option for regional PD with national centers', async () => {
    render(<RenderSessionTrainers />);

    const trainers = await screen.findByLabelText(/Who provided the TTA/i);
    userEvent.click(trainers);

    expect(await screen.findByText('Other')).toBeInTheDocument();
  });

  it('does not include "Other" trainer option for regional TTA with no national centers', async () => {
    render(
      <RenderSessionTrainers
        event={{
          ...defaultEvent,
          data: {
            ...defaultEvent.data,
            eventOrganizer: TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS,
          },
        }}
      />
    );

    const trainers = await screen.findByLabelText(/Who provided the TTA/i);
    userEvent.click(trainers);

    expect(screen.queryByText('Other')).not.toBeInTheDocument();
  });

  it('shows the "Other trainers" textarea when selecting Other', async () => {
    render(<RenderSessionTrainers />);

    const trainers = await screen.findByLabelText(/Who provided the TTA/i);
    await selectEvent.select(trainers, ['Other']);

    expect(await screen.findByLabelText(/Other trainers/i)).toBeInTheDocument();
  });

  it('hides otherTrainers input when Other is no longer selected', async () => {
    render(
      <RenderSessionTrainers
        defaultValues={{
          trainers: [{ id: 'other', fullName: 'Other' }],
          otherTrainers: 'Custom Trainer',
        }}
        showHarness
      />
    );

    expect(await screen.findByLabelText(/Other trainers/i)).toBeInTheDocument();

    userEvent.click(screen.getByRole('button', { name: /remove other trainer/i }));

    await waitFor(() => {
      expect(screen.queryByLabelText(/Other trainers/i)).not.toBeInTheDocument();
    });
  });
});
