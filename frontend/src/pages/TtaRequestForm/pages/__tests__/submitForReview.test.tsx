import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fetchMock from 'fetch-mock';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import selectEvent from 'react-select-event';
import { SubmitForReviewFields } from '../submitForReview';

function Wrapper({ regionId }) {
  const hookForm = useForm({ mode: 'onBlur', defaultValues: { creatorNotes: '', reviewer: null } });
  return (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <FormProvider {...hookForm}>
      <SubmitForReviewFields regionId={regionId} />
    </FormProvider>
  );
}

describe('SubmitForReviewFields', () => {
  afterEach(() => {
    fetchMock.restore();
  });

  it('takes creator notes as plain text', () => {
    fetchMock.get('begin:/api/activity-reports/approvers', []);
    render(<Wrapper regionId={14} />);

    const notes = screen.getByLabelText('Add creator notes');
    expect(notes.tagName).toBe('TEXTAREA');

    userEvent.type(notes, 'RAN incident handled separately.');
    expect(notes).toHaveValue('RAN incident handled separately.');
  });

  it('lets the reviewer be chosen and cleared again', async () => {
    fetchMock.get('begin:/api/activity-reports/approvers', [{ id: 5, name: 'Rachel Green' }]);
    render(<Wrapper regionId={14} />);

    const reviewer = screen.getByLabelText(/reviewing ttac or manager/i);
    await selectEvent.select(reviewer, 'Rachel Green');
    expect(screen.getByText('Rachel Green')).toBeVisible();

    await selectEvent.clearFirst(reviewer);
    await waitFor(() => {
      expect(screen.queryByText('Rachel Green')).toBeNull();
    });
  });

  it('asks for no approvers until the region is known', async () => {
    fetchMock.get('begin:/api/activity-reports/approvers', [{ id: 5, name: 'Rachel Green' }]);
    render(<Wrapper regionId={null} />);

    selectEvent.openMenu(screen.getByLabelText(/reviewing ttac or manager/i));

    expect(await screen.findByText(/no options/i)).toBeVisible();
    expect(fetchMock.called('begin:/api/activity-reports/approvers')).toBe(false);
  });

  it('copes with an empty approvers response', async () => {
    fetchMock.get('begin:/api/activity-reports/approvers', { body: 'null', status: 200 });
    render(<Wrapper regionId={14} />);

    await waitFor(() => {
      expect(fetchMock.called('begin:/api/activity-reports/approvers')).toBe(true);
    });

    selectEvent.openMenu(screen.getByLabelText(/reviewing ttac or manager/i));
    expect(await screen.findByText(/no options/i)).toBeVisible();
  });

  it('offers no reviewers when the approvers cannot be read', async () => {
    fetchMock.get('begin:/api/activity-reports/approvers', 500);
    render(<Wrapper regionId={14} />);

    await waitFor(() => {
      expect(fetchMock.called('begin:/api/activity-reports/approvers')).toBe(true);
    });

    selectEvent.openMenu(screen.getByLabelText(/reviewing ttac or manager/i));
    expect(await screen.findByText(/no options/i)).toBeVisible();
  });
});
