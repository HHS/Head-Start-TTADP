import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import fetchMock from 'fetch-mock';
import join from 'url-join';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import userEvent from '@testing-library/user-event';
import NationalCenters from '../NationalCenters';

describe('National Centers page', () => {
  const nationalCenterUrl = join('api', 'national-center');
  const nationalCenterAdminUrl = join('api', 'admin', 'national-center');
  beforeEach(() => {
    fetchMock.get(nationalCenterUrl, [
      'DTL',
      'HBHS',
      'PFCE',
      'PFMO',
    ].map((name, id) => ({ id: (id + 1).toString(), name })));
  });

  afterEach(() => {
    fetchMock.restore();
  });
  it('renders without nationalCenterId match param', async () => {
    const history = createMemoryHistory();
    render(<Router history={history}><NationalCenters match={{ params: {}, path: '', url: '' }} /></Router>);
    expect(await screen.findByText(/National Centers/i)).toBeVisible();
  });
  it('renders with nationalCenterId match param', async () => {
    const history = createMemoryHistory();
    render(<Router history={history}><NationalCenters match={{ params: { nationalCenterId: '1' }, path: '', url: '' }} /></Router>);
    expect(await screen.findByText(/National Centers/i)).toBeVisible();
  });
  it('can fail to fetch centers', async () => {
    fetchMock.restore();
    fetchMock.get(nationalCenterUrl, 500);
    const history = createMemoryHistory();
    render(<Router history={history}><NationalCenters match={{ params: {}, path: '', url: '' }} /></Router>);
    expect(await screen.findByText(/Error fetching national centers/i)).toBeVisible();
  });

  it('can create a new national center', async () => {
    const history = createMemoryHistory();
    render(<Router history={history}><NationalCenters match={{ params: { nationalCenterId: 'new' }, path: '', url: '' }} /></Router>);
    expect(await screen.findByText(/National Centers/i)).toBeVisible();

    fetchMock.post(nationalCenterAdminUrl, { name: 'New Center', id: 5 });
    userEvent.type(screen.getByLabelText(/National center name/i), 'New Center');
    userEvent.click(screen.getByText(/Save/i));

    expect(await screen.findByText('Center created successfully')).toBeVisible();
  });

  it('can update an existing national center', async () => {
    const history = createMemoryHistory();
    render(<Router history={history}><NationalCenters match={{ params: { nationalCenterId: '1' }, path: '', url: '' }} /></Router>);
    expect(await screen.findByText(/National Centers/i)).toBeVisible();

    fetchMock.put(join(nationalCenterAdminUrl, '1'), { name: 'New Center', id: 5 });
    userEvent.type(screen.getByLabelText(/National center name/i), '1');
    userEvent.click(screen.getByText(/Save/i));

    expect(await screen.findByText('Center updated successfully')).toBeVisible();
  });

  it('handles an error to create or update a national center', async () => {
    const history = createMemoryHistory();
    render(<Router history={history}><NationalCenters match={{ params: { nationalCenterId: '1' }, path: '', url: '' }} /></Router>);
    expect(await screen.findByText(/National Centers/i)).toBeVisible();

    fetchMock.put(join(nationalCenterAdminUrl, '1'), 500);
    userEvent.type(screen.getByLabelText(/National center name/i), '1');
    userEvent.click(screen.getByText(/Save/i));

    expect(await screen.findByText('Error saving national center')).toBeVisible();
  });

  it('you can delete a national center', async () => {
    const history = createMemoryHistory();
    render(<Router history={history}><NationalCenters match={{ params: { nationalCenterId: '1' }, path: '', url: '' }} /></Router>);
    expect(await screen.findByText(/National Centers/i)).toBeVisible();

    fetchMock.delete(join(nationalCenterAdminUrl, '1'), { message: 'Center deleted successfully' });
    userEvent.click(screen.getByText('Delete'));

    userEvent.click(screen.getByText('Yes'));

    expect(await screen.findByText('Center deleted successfully')).toBeVisible();
  });
  it('handles an error to delete a national center', async () => {
    const history = createMemoryHistory();
    render(<Router history={history}><NationalCenters match={{ params: { nationalCenterId: '1' }, path: '', url: '' }} /></Router>);
    expect(await screen.findByText(/National Centers/i)).toBeVisible();

    fetchMock.delete(join(nationalCenterAdminUrl, '1'), 500);
    userEvent.click(screen.getByText('Delete'));

    userEvent.click(screen.getByText('Yes'));

    expect(await screen.findByText('Error deleting national center')).toBeVisible();
  });
});
