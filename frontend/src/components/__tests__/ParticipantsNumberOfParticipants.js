/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import PropTypes from 'prop-types';
import {
  render, screen,
} from '@testing-library/react';
import { useForm, FormProvider } from 'react-hook-form';
import ParticipantsNumberOfParticipants from '../ParticipantsNumberOfParticipants';

describe('ParticipantsNumberOfParticipants', () => {
  const TestComponent = ({ isHybrid, isDeliveryMethodSelected }) => {
    const hookForm = useForm({
      mode: 'onBlur',
      defaultValues: {},
    });

    return (
      <FormProvider {...hookForm}>
        <ParticipantsNumberOfParticipants
          isHybrid={isHybrid}
          isDeliveryMethodSelected={isDeliveryMethodSelected}
          register={hookForm.register}
        />
      </FormProvider>
    );
  };

  TestComponent.propTypes = {
    isHybrid: PropTypes.bool.isRequired,
    isDeliveryMethodSelected: PropTypes.bool.isRequired,
  };

  const renderTest = (
    isHybrid,
    isDeliveryMethodSelected,
  ) => {
    render(<TestComponent
      isHybrid={isHybrid}
      isDeliveryMethodSelected={isDeliveryMethodSelected}
    />);
  };

  it('renders nothing is "isDeliveryMethodSelected" is false', () => {
    renderTest(false, false);
    expect(document.querySelector('label')).toBeNull();
  });

  it('renders two input type number if the delivery method is hybrid', () => {
    renderTest(true, true);
    expect(screen.getAllByRole('spinbutton')).toHaveLength(2);
  });

  it('renders one input type number if the delivery method is not hybrid', () => {
    renderTest(false, true);
    expect(screen.getAllByRole('spinbutton')).toHaveLength(1);
  });
});
