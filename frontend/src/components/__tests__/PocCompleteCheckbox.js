/* eslint-disable react/prop-types */
/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, FormProvider } from 'react-hook-form';
import { SCOPE_IDS } from '@ttahub/common';
import moment from 'moment';
import PocCompleteCheckbox from '../PocCompleteCheckbox';
import UserContext from '../../UserContext';
import { NOT_STARTED } from '../Navigator/constants';

describe('PocCompleteCheckbox', () => {
  const userId = 1;

  const defaultFormValues = {
    id: 1,
    ownerId: null,
    eventId: 'sdfgsdfg',
    eventDisplayId: 'event-display-id',
    eventName: 'Event name',
    regionId: 1,
    status: 'In progress',
    pageState: {
      1: NOT_STARTED,
      2: NOT_STARTED,
    },
    event: {
      pocIds: [],
    },

  };

  const defaultUser = { user: { id: userId, roles: [{ name: 'GSM' }] } };

  const RenderPocCompleteCheckbox = ({
    formValues = defaultFormValues,
    user = defaultUser,
    isPoc = true,
  }) => {
    const hookForm = useForm({
      mode: 'onBlur',
      defaultValues: formValues,
    });

    return (
      <UserContext.Provider value={user}>
        <FormProvider {...hookForm}>
          <PocCompleteCheckbox
            userId={userId}
            isPoc={isPoc}
          />
        </FormProvider>
      </UserContext.Provider>

    );
  };

  it('should update form values when checkbox is checked', () => {
    act(() => {
      render(<RenderPocCompleteCheckbox />);
    });

    const checkbox = screen.getByLabelText('Email the event creator and collaborator to let them know my work is complete.');

    userEvent.click(checkbox);

    const pocCompleteId = document.querySelector('#pocCompleteId');
    const pocCompleteDate = document.querySelector('#pocCompleteDate');

    expect(pocCompleteId).toHaveValue(String(userId));
    expect(pocCompleteDate).toHaveValue(moment().format('YYYY-MM-DD'));
  });

  it('unchecking sets hidden inputs to null', () => {
    act(() => {
      render(<RenderPocCompleteCheckbox />);
    });

    const checkbox = screen.getByLabelText('Email the event creator and collaborator to let them know my work is complete.');

    userEvent.click(checkbox);
    userEvent.click(checkbox); // second toggles it off

    const pocCompleteId = document.querySelector('#pocCompleteId');
    const pocCompleteDate = document.querySelector('#pocCompleteDate');

    expect(pocCompleteId).toHaveValue('');
    expect(pocCompleteDate).toHaveValue('');
  });

  it('does not show checkbox for invalid email roles', () => {
    const user = { user: { id: userId, roles: [{ name: 'invalid role' }] } };

    act(() => {
      render(<RenderPocCompleteCheckbox user={user} />);
    });

    const checkbox = screen.queryByLabelText('Email the event creator and collaborator to let them know my work is complete.');

    expect(checkbox).not.toBeInTheDocument();
  });

  it('does not show checkbox for non-poc users', () => {
    act(() => {
      render(<RenderPocCompleteCheckbox isPoc={false} />);
    });

    const checkbox = screen.queryByLabelText('Email the event creator and collaborator to let them know my work is complete.');

    expect(checkbox).not.toBeInTheDocument();
  });

  it('admin users see the checkbox as well', () => {
    const user = {
      user: {
        id: userId,
        roles: [{ name: 'invalid role' }],
        permissions: [{
          scopeId: SCOPE_IDS.ADMIN,
          regionId: 14,
        }],
      },
    };

    act(() => {
      render(<RenderPocCompleteCheckbox user={user} />);
    });

    const checkbox = screen.queryByLabelText('Email the event creator and collaborator to let them know my work is complete.');

    expect(checkbox).toBeInTheDocument();
  });
});
