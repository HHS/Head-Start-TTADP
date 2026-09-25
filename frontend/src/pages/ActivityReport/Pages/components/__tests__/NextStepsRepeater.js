/* eslint-disable react/jsx-props-no-spreading */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { Router } from 'react-router';
import UserContext from '../../../../../UserContext';
import NextStepsRepeater from '../NextStepsRepeater';

const history = createMemoryHistory();

describe('NextStepsRepeater', () => {
  const TheRepeater = (props, hookFormValues) => {
    const hookForm = useForm({
      mode: 'onChange',
      defaultValues: {
        specialistNextSteps: [{ id: null, note: '' }],
        recipientNextSteps: [{ id: null, note: '' }],
      },
    });
    const formValues = { ...hookForm, ...hookFormValues };

    return (
      <Router history={history}>
        <UserContext.Provider value={{ user: { id: 1, flags: [] } }}>
          <FormProvider {...formValues}>
            <NextStepsRepeater {...props} />
          </FormProvider>
        </UserContext.Provider>
      </Router>
    );
  };

  const renderRepeater = (props, hookFormValues) => {
    const defaultProps = {
      name: 'specialistNextSteps',
      ariaName: 'Specialist Next Steps',
      recipientType: 'recipient',
      required: false,
    };
    const theProps = { ...defaultProps, ...props };
    render(<TheRepeater hookFormValues={hookFormValues} {...theProps} />);
  };

  it('renders without crashing', () => {
    renderRepeater();
    expect(screen.getByLabelText('Step 1')).toBeInTheDocument();
  });

  it('shows required asterisk when required is true', () => {
    renderRepeater({ required: true });
    expect(screen.getByLabelText('Step 1 *')).toBeInTheDocument();
  });

  it('requires next-step dates to be after the session start date', async () => {
    renderRepeater({ afterDate: '01/01/2024' });

    const dateInput = screen.getByRole('textbox', {
      name: /when do you anticipate completing step 1/i,
    });

    userEvent.type(dateInput, '01/01/2024');
    fireEvent.blur(dateInput);
    expect(
      await screen.findByText('Next step date must be after the session start date')
    ).toBeVisible();

    act(() => userEvent.clear(dateInput));
    userEvent.type(dateInput, '01/02/2024');
    fireEvent.blur(dateInput);
    await waitFor(() => {
      expect(
        screen.queryByText('Next step date must be after the session start date')
      ).not.toBeInTheDocument();
    });
  });
});
