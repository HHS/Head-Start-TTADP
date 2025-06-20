import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fetchMock from 'fetch-mock';
import AlertReview from '../AlertReview';

import { DEFAULT_ALERT } from '../../SiteAlerts';

describe('AlertReview', () => {
  afterEach(() => fetchMock.restore());
  const renderAlertReview = (alert, onDelete = jest.fn()) => {
    render(<div className="smart-hub-header has-alerts"><AlertReview alert={alert} onDelete={onDelete} /></div>);
  };

  it('renders a new alert', () => {
    renderAlertReview(DEFAULT_ALERT);
    expect(screen.getByRole('checkbox', { name: 'Edit?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('renders an existing alert', () => {
    renderAlertReview({ ...DEFAULT_ALERT, id: 1 });
    expect(screen.getByRole('checkbox', { name: 'Edit?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('calls the create endpoint', async () => {
    const newAlert = {
      title: 'Test Alert',
      message: 'This is a test alert',
      startDate: '01/01/2020',
      endDate: '01/01/2050',
      status: 'Published',
    };

    fetchMock.post('/api/admin/alerts', { ...newAlert, id: 1 });

    renderAlertReview({ ...DEFAULT_ALERT, message: newAlert.message });

    const titleInput = screen.getByLabelText(/Title/i);
    act(() => userEvent.type(titleInput, newAlert.title));

    const startDateInput = screen.getByLabelText(/Start date/i);
    act(() => userEvent.type(startDateInput, newAlert.startDate));

    const endDateInput = screen.getByLabelText(/End date/i);
    act(() => userEvent.type(endDateInput, newAlert.endDate));

    const statusInput = screen.getByRole('combobox', { name: /Status/i });
    act(() => userEvent.selectOptions(statusInput, newAlert.status));

    expect(fetchMock.called()).toBe(false);
    const saveButton = screen.getByRole('button', { name: 'Save changes' });
    act(() => userEvent.click(saveButton));

    expect(fetchMock.called()).toBe(true);
  });

  it('calls the update endpoint', async () => {
    const newAlert = {
      title: 'Test Alert',
      message: 'This is a test alert',
      startDate: '01/01/2020',
      endDate: '01/01/2050',
      status: 'Published',
      id: 1,
    };

    fetchMock.put('/api/admin/alerts/1', { ...newAlert, status: 'Unpublished' });

    renderAlertReview(newAlert);

    const edit = screen.getByRole('checkbox', { name: 'Edit?' });
    act(() => userEvent.click(edit));

    const statusInput = screen.getByRole('combobox', { name: /Status/i });
    act(() => userEvent.selectOptions(statusInput, 'Unpublished'));

    expect(fetchMock.called()).toBe(false);
    const saveButton = screen.getByRole('button', { name: 'Save changes' });
    act(() => userEvent.click(saveButton));

    expect(fetchMock.called()).toBe(true);
  });

  it('calls the delete function', async () => {
    const newAlert = {
      title: 'Test Alert',
      message: 'This is a test alert',
      startDate: '01/01/2020',
      endDate: '01/01/2050',
      status: 'Published',
      id: 1,
    };

    const onDelete = jest.fn();
    renderAlertReview(newAlert, onDelete);

    const edit = screen.getByRole('checkbox', { name: 'Edit?' });
    act(() => userEvent.click(edit));

    const deleteButton = screen.getByRole('button', { name: 'Delete' });
    act(() => userEvent.click(deleteButton));

    expect(onDelete).toHaveBeenCalledWith(newAlert);
  });
});
