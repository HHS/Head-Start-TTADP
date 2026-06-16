/* eslint-disable react/prop-types */
/* eslint-disable react/jsx-props-no-spreading */

import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';
import NotificationsGroupController from '../NotificationsGroupController';
import NotificationsRow from '../NotificationsRow';

function FieldRegistrar({ ids }) {
  const { register } = useFormContext();
  return (
    <>
      {ids.map((id) => (
        <input
          key={id}
          type="checkbox"
          name={`inApp${id}`}
          ref={register}
          style={{ display: 'none' }}
        />
      ))}
    </>
  );
}

describe('NotificationsGroupController', () => {
  const defaultProps = {
    groupName: 'ReportUpdates',
    ids: ['ReportSubmitted', 'ReportApproved', 'ReportChanged'],
    label: 'Report updates',
  };

  const renderNotificationsGroupController = (props = {}, formProps = {}) => {
    let setValueSpy;
    const setDisplayAlert = jest.fn();
    const formRef = {};
    const mergedProps = { ...defaultProps, ...props };

    function Wrapper({ children }) {
      const methods = useForm(formProps);
      setValueSpy = jest.spyOn(methods, 'setValue');
      formRef.methods = methods;

      return (
        <FormProvider {...methods}>
          <FieldRegistrar ids={mergedProps.ids} />
          {children}
        </FormProvider>
      );
    }

    const utils = render(
      <Wrapper>
        <NotificationsGroupController
          emailVerified={true}
          setDisplayAlert={setDisplayAlert}
          {...mergedProps}
        />
      </Wrapper>
    );

    return { ...utils, setValueSpy, setDisplayAlert, formRef };
  };

  const renderWithRows = (props = {}, formProps = {}) => {
    const setDisplayAlert = jest.fn();
    const formRef = {};
    const mergedProps = { ...defaultProps, ...props };

    function Wrapper() {
      const methods = useForm(formProps);
      formRef.methods = methods;

      return (
        <FormProvider {...methods}>
          <NotificationsGroupController
            emailVerified={true}
            setDisplayAlert={setDisplayAlert}
            {...mergedProps}
          />
          {mergedProps.ids.map((id) => (
            <NotificationsRow
              key={id}
              id={id}
              label={`Row ${id}`}
              emailVerified={true}
              setDisplayAlert={setDisplayAlert}
            />
          ))}
        </FormProvider>
      );
    }

    const utils = render(<Wrapper />);
    return { ...utils, setDisplayAlert, formRef, ids: mergedProps.ids };
  };

  it('renders the label text', () => {
    renderNotificationsGroupController();

    expect(screen.getByText(defaultProps.label)).toBeInTheDocument();
  });

  it('renders the checkbox with the group id', () => {
    renderNotificationsGroupController();

    expect(screen.getByRole('checkbox')).toHaveAttribute('id', `inApp${defaultProps.groupName}`);
  });

  it('renders the dropdown with the group id', () => {
    renderNotificationsGroupController();

    expect(screen.getByRole('combobox')).toHaveAttribute('id', `email${defaultProps.groupName}`);
  });

  it('initializes the email dropdown to the empty placeholder option', () => {
    renderNotificationsGroupController();

    const dropdown = screen.getByRole('combobox');
    expect(dropdown).toHaveValue('');

    const firstOption = dropdown.querySelector('option');
    expect(firstOption).toHaveValue('');
    expect(firstOption).toHaveTextContent('- Select -');
  });

  it('renders all frequency options in the dropdown plus the placeholder', () => {
    renderNotificationsGroupController();

    expect(screen.getAllByRole('option', { hidden: true })).toHaveLength(6);
    expect(screen.getByRole('option', { name: 'Do not notify me' })).toHaveValue('never');
    expect(screen.getByRole('option', { name: 'Immediately' })).toHaveValue('immediately');
    expect(screen.getByRole('option', { name: 'Daily digest' })).toHaveValue('today');
    expect(screen.getByRole('option', { name: 'Weekly digest' })).toHaveValue('this week');
    expect(screen.getByRole('option', { name: 'Monthly digest' })).toHaveValue('this month');
  });

  it('toggles the checkbox and calls setValue for each id with the correct boolean value', () => {
    const initialValues = defaultProps.ids.reduce((acc, id) => {
      acc[`inApp${id}`] = false;
      return acc;
    }, {});
    const { setValueSpy } = renderNotificationsGroupController(
      {},
      { defaultValues: initialValues }
    );
    const checkbox = screen.getByRole('checkbox');

    fireEvent.click(checkbox);

    expect(checkbox).toBeChecked();
    expect(setValueSpy).toHaveBeenCalledTimes(defaultProps.ids.length);
    defaultProps.ids.forEach((id, index) => {
      expect(setValueSpy).toHaveBeenNthCalledWith(index + 1, `inApp${id}`, true);
    });

    fireEvent.click(checkbox);

    expect(checkbox).not.toBeChecked();
    expect(setValueSpy).toHaveBeenCalledTimes(defaultProps.ids.length * 2);
    defaultProps.ids.forEach((id, index) => {
      expect(setValueSpy).toHaveBeenNthCalledWith(
        defaultProps.ids.length + index + 1,
        `inApp${id}`,
        false
      );
    });
  });

  it('changes the dropdown and calls setValue for each id with the selected value', () => {
    const { setValueSpy } = renderNotificationsGroupController();
    const dropdown = screen.getByRole('combobox');

    fireEvent.change(dropdown, { target: { value: 'this week' } });

    expect(dropdown).toHaveValue('this week');
    expect(setValueSpy).toHaveBeenCalledTimes(defaultProps.ids.length);
    defaultProps.ids.forEach((id, index) => {
      expect(setValueSpy).toHaveBeenNthCalledWith(index + 1, `email${id}`, 'this week');
    });
  });

  describe('email verification gating', () => {
    it('does not update form state and shows the alert when email is unverified', () => {
      const { setValueSpy, setDisplayAlert } = renderNotificationsGroupController({
        emailVerified: false,
      });
      const dropdown = screen.getByRole('combobox');

      fireEvent.change(dropdown, { target: { value: 'this week' } });

      expect(setDisplayAlert).toHaveBeenCalledWith(true);
      const emailSetValueCalls = setValueSpy.mock.calls.filter(([key]) => key.startsWith('email'));
      expect(emailSetValueCalls).toHaveLength(0);
    });
  });

  describe('checkbox sync with child rows', () => {
    const allCheckedDefaults = (ids) =>
      ids.reduce((acc, id) => {
        acc[`inApp${id}`] = true;
        return acc;
      }, {});

    it('reflects the checked state of every child row on mount', () => {
      const { container } = renderWithRows(
        {},
        { defaultValues: allCheckedDefaults(defaultProps.ids) }
      );

      const groupCheckbox = container.querySelector(`#inApp${defaultProps.groupName}`);
      expect(groupCheckbox).toBeChecked();

      defaultProps.ids.forEach((id) => {
        expect(container.querySelector(`#inApp${id}`)).toBeChecked();
      });
    });

    it('unchecks the group when a single child checkbox is unchecked', () => {
      const { container } = renderWithRows(
        {},
        { defaultValues: allCheckedDefaults(defaultProps.ids) }
      );

      const groupCheckbox = container.querySelector(`#inApp${defaultProps.groupName}`);
      const firstChild = container.querySelector(`#inApp${defaultProps.ids[0]}`);

      expect(groupCheckbox).toBeChecked();

      fireEvent.click(firstChild);

      expect(firstChild).not.toBeChecked();
      expect(groupCheckbox).not.toBeChecked();
    });

    it('re-checks the group when the last unchecked child is checked', () => {
      const initialValues = allCheckedDefaults(defaultProps.ids);
      initialValues[`inApp${defaultProps.ids[0]}`] = false;

      const { container } = renderWithRows({}, { defaultValues: initialValues });

      const groupCheckbox = container.querySelector(`#inApp${defaultProps.groupName}`);
      const firstChild = container.querySelector(`#inApp${defaultProps.ids[0]}`);

      expect(groupCheckbox).not.toBeChecked();
      expect(firstChild).not.toBeChecked();

      fireEvent.click(firstChild);

      expect(firstChild).toBeChecked();
      expect(groupCheckbox).toBeChecked();
    });

    it('toggles every child row when the group checkbox is clicked', () => {
      const { container } = renderWithRows(
        {},
        { defaultValues: allCheckedDefaults(defaultProps.ids) }
      );

      const groupCheckbox = container.querySelector(`#inApp${defaultProps.groupName}`);

      act(() => {
        fireEvent.click(groupCheckbox);
      });

      expect(groupCheckbox).not.toBeChecked();
      defaultProps.ids.forEach((id) => {
        expect(container.querySelector(`#inApp${id}`)).not.toBeChecked();
      });

      act(() => {
        fireEvent.click(groupCheckbox);
      });

      expect(groupCheckbox).toBeChecked();
      defaultProps.ids.forEach((id) => {
        expect(container.querySelector(`#inApp${id}`)).toBeChecked();
      });
    });
  });
});
