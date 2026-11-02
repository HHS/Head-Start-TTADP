import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fetchMock from 'fetch-mock';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import selectEvent from 'react-select-event';
import SubmitForReview, { INELIGIBLE_REVIEWER_ERROR } from '../SubmitForReview';

function Wrapper({ regionId, reviewer = null }) {
  const hookForm = useForm({ mode: 'onBlur', defaultValues: { creatorNotes: '', reviewer } });
  return (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <FormProvider {...hookForm}>
      <SubmitForReview regionId={regionId} />
    </FormProvider>
  );
}

describe('SubmitForReview', () => {
  afterEach(() => {
    fetchMock.restore();
  });

  it('takes creator notes as plain text', () => {
    fetchMock.get('begin:/api/tta-requests/region/', []);
    render(<Wrapper regionId={14} />);

    const notes = screen.getByLabelText('Add creator notes');
    expect(notes.tagName).toBe('TEXTAREA');

    userEvent.type(notes, 'RAN incident handled separately.');
    expect(notes).toHaveValue('RAN incident handled separately.');
  });

  it('lets the reviewer be chosen and cleared again', async () => {
    fetchMock.get('begin:/api/tta-requests/region/', [{ id: 5, name: 'Rachel Green' }]);
    render(<Wrapper regionId={14} />);

    const reviewer = screen.getByLabelText(/reviewing ttac or manager/i);
    await selectEvent.select(reviewer, 'Rachel Green');
    expect(screen.getByText('Rachel Green')).toBeVisible();

    await selectEvent.clearFirst(reviewer);
    await waitFor(() => {
      expect(screen.queryByText('Rachel Green')).toBeNull();
    });
  });

  it('asks for no reviewers until the region is known', async () => {
    fetchMock.get('begin:/api/tta-requests/region/', [{ id: 5, name: 'Rachel Green' }]);
    render(<Wrapper regionId={null} />);

    selectEvent.openMenu(screen.getByLabelText(/reviewing ttac or manager/i));

    expect(await screen.findByText(/no options/i)).toBeVisible();
    expect(fetchMock.called('begin:/api/tta-requests/region/')).toBe(false);
  });

  it('copes with an empty reviewers response', async () => {
    fetchMock.get('begin:/api/tta-requests/region/', {
      body: 'null',
      status: 200,
    });
    render(<Wrapper regionId={14} />);

    await waitFor(() => {
      expect(fetchMock.called('begin:/api/tta-requests/region/')).toBe(true);
    });

    selectEvent.openMenu(screen.getByLabelText(/reviewing ttac or manager/i));
    expect(await screen.findByText(/no options/i)).toBeVisible();
  });

  it('offers no reviewers when they cannot be read', async () => {
    fetchMock.get('begin:/api/tta-requests/region/', 500);
    render(<Wrapper regionId={14} />);

    await waitFor(() => {
      expect(fetchMock.called('begin:/api/tta-requests/region/')).toBe(true);
    });

    selectEvent.openMenu(screen.getByLabelText(/reviewing ttac or manager/i));
    expect(await screen.findByText(/no options/i)).toBeVisible();
  });

  it('drops a saved reviewer who can no longer review in the region', async () => {
    fetchMock.get('begin:/api/tta-requests/region/', [{ id: 5, name: 'Rachel Green' }]);
    render(<Wrapper regionId={14} reviewer={{ value: 9, label: 'Ross Geller' }} />);

    expect(await screen.findByText(INELIGIBLE_REVIEWER_ERROR)).toBeVisible();
    expect(screen.queryByText('Ross Geller')).toBeNull();
  });

  it('keeps a saved reviewer who can still review in the region', async () => {
    fetchMock.get('begin:/api/tta-requests/region/', [{ id: 5, name: 'Rachel Green' }]);
    render(<Wrapper regionId={14} reviewer={{ value: 5, label: 'Rachel Green' }} />);

    await waitFor(() => {
      expect(fetchMock.called('begin:/api/tta-requests/region/')).toBe(true);
    });

    expect(screen.getByText('Rachel Green')).toBeVisible();
    expect(screen.queryByText(INELIGIBLE_REVIEWER_ERROR)).toBeNull();
  });

  it('keeps the saved reviewer when the reviewers cannot be read', async () => {
    fetchMock.get('begin:/api/tta-requests/region/', 500);
    render(<Wrapper regionId={14} reviewer={{ value: 9, label: 'Ross Geller' }} />);

    await waitFor(() => {
      expect(fetchMock.called('begin:/api/tta-requests/region/')).toBe(true);
    });

    expect(screen.getByText('Ross Geller')).toBeVisible();
    expect(screen.queryByText(INELIGIBLE_REVIEWER_ERROR)).toBeNull();
  });
});
