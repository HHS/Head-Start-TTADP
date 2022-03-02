import '@testing-library/jest-dom';
import { screen } from '@testing-library/react';
import moment from 'moment';
import fetchMock from 'fetch-mock';
import userEvent from '@testing-library/user-event';

import { mockWindowProperty } from '../../../testHelpers';

import {
  formData, renderActivityReport, recipients,
} from '../testHelpers';

describe('Local storage fallbacks', () => {
  const setItem = jest.fn();
  const getItem = jest.fn();

  const additionalData = {
    recipients: {
      grants: [],
      otherEntities: [],
    },
    collaborators: [],
    availableApprovers: [],
  };

  mockWindowProperty('localStorage', {
    setItem,
    getItem,
  });

  afterEach(() => fetchMock.restore());

  beforeEach(() => {
    fetchMock.get('/api/activity-reports/activity-recipients?region=1', recipients);
    fetchMock.get('/api/users/collaborators?region=1', []);
    fetchMock.get('/api/activity-reports/approvers?region=1', []);

    const savedToStorage = moment().toISOString();

    getItem
      .mockReturnValueOnce(JSON.stringify({ ...formData(), savedToStorage, id: 1 }))
      .mockReturnValueOnce(JSON.stringify(additionalData))
      .mockReturnValueOnce(JSON.stringify(true))
      .mockReturnValueOnce(JSON.stringify({ ...formData(), savedToStorage, id: 1 }))
      .mockReturnValueOnce(JSON.stringify(additionalData))
      .mockReturnValueOnce(JSON.stringify(true));
  });

  it('knows what to do when the local data is newer than the network data', async () => {
    const updatedAt = moment().subtract(1, 'day').toISOString();
    const d = {
      ...formData(), id: 1, updatedAt,
    };
    fetchMock.get('/api/activity-reports/1', d);

    renderActivityReport('1', 'activity-summary', true);
    await screen.findByRole('group', { name: 'Who was the activity for?' }, { timeout: 4000 });
    const [alert] = await screen.findAllByTestId('alert');
    expect(alert).toBeVisible();

    const today = moment().format('MM/DD/YYYY');
    const reggie = new RegExp(`this report was last saved on ${today}`, 'i');

    expect(alert.textContent.match(reggie).length).toBe(1);
  });

  it('handles failure to download a report from the network with local storage fallback', async () => {
    fetchMock.get('/api/activity-reports/1', () => { throw new Error('unable to download report'); });
    renderActivityReport('1', 'activity-summary', true);
    await screen.findByRole('group', { name: 'Who was the activity for?' }, { timeout: 4000 });
    expect(getItem).toHaveBeenCalled();
    expect(setItem).toHaveBeenCalled();
    const alert = await screen.findByText(/ We found saved work on your computer, and we've loaded that instead/i);
    expect(alert).toBeVisible();
  });

  it('correctly handles a intermittent connectivity', async () => {
    const data = formData();
    const d = { ...data, id: 1, savedToStorage: data.updatedAt };

    // first get works
    fetchMock.get('/api/activity-reports/1', d);

    // first save fails
    fetchMock.put('/api/activity-reports/1', () => { throw new Error('unable to save report'); });

    renderActivityReport('1', 'activity-summary', true);

    // change some data
    const other = await screen.findByRole('radio', { name: /other entity/i });
    userEvent.click(other);

    let virt = await screen.findByRole('radio', { name: /virtual/i });
    expect(virt.checked).toBe(false);

    userEvent.click(virt);

    expect(virt.checked).toBe(true);

    const button = await screen.findByRole('button', { name: 'Save draft' });
    userEvent.click(button);

    fetchMock.reset();

    expect(fetchMock.called()).toBe(false);

    // second save works
    fetchMock.putOnce('/api/activity-reports/1', d, { repeat: 1 });

    userEvent.click(button);

    expect(fetchMock.called()).toBe(true);

    virt = await screen.findByRole('radio', { name: /virtual/i });
    expect(virt.checked).toBe(true);
  });

  it('disables the submit button if data cant be saved', async () => {
    const data = formData();

    // get fails
    fetchMock.get('/api/activity-reports/1', 500);

    renderActivityReport('1', 'review', true);

    await screen.findByRole('heading', { name: /submit report/i, timeout: 4000 });

    let submit = await screen.findByRole('button', { name: /submit for approval/i });
    expect(submit).toBeDisabled();

    // but save succeeds
    fetchMock.put('/api/activity-reports/1', data);

    const button = await screen.findByRole('button', { name: /save draft/i });
    userEvent.click(button);

    submit = await screen.findByRole('button', { name: /submit for approval/i });
    expect(submit).not.toBeDisabled();
  });
});
