/* eslint-disable react/prop-types */
/* eslint-disable react/jsx-props-no-spreading */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import NotificationsGroupController from '../NotificationsGroupController';

describe('NotificationsGroupController', () => {
  const defaultProps = {
    groupName: 'ReportUpdates',
    ids: ['ReportSubmitted', 'ReportApproved', 'ReportChanged'],
    label: 'Report updates',
  };

  const renderNotificationsGroupController = (props = {}) => {
    let setValueSpy;

    function Wrapper({ children }) {
      const methods = useForm();
      setValueSpy = jest.spyOn(methods, 'setValue');

      return <FormProvider {...methods}>{children}</FormProvider>;
    }

    render(
      <Wrapper>
        <NotificationsGroupController {...defaultProps} {...props} />
      </Wrapper>
    );

    return { setValueSpy };
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

  it('renders all frequency options in the dropdown', () => {
    renderNotificationsGroupController();

    expect(screen.getAllByRole('option')).toHaveLength(5);
    expect(screen.getByRole('option', { name: 'Do not notify me' })).toHaveValue('never');
    expect(screen.getByRole('option', { name: 'Immediately' })).toHaveValue('immediately');
    expect(screen.getByRole('option', { name: 'Daily digest' })).toHaveValue('today');
    expect(screen.getByRole('option', { name: 'Weekly digest' })).toHaveValue('this week');
    expect(screen.getByRole('option', { name: 'Monthly digest' })).toHaveValue('this month');
  });

  it('toggles the checkbox and calls setValue for each id with the correct boolean value', () => {
    const { setValueSpy } = renderNotificationsGroupController();
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
});
