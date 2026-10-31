import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';
import React from 'react';
import TtaRequestNotesSummary, { type TtaRequestNote } from '..';

const CREATOR_NOTE: TtaRequestNote = {
  key: 'creator',
  phase: 'Draft TTA Request',
  author: 'Rachel Green, ECS',
  role: 'Creator',
  date: '2026-06-23T09:32:00.000Z',
  note: 'Request is for monitoring citations listed, RAN incident handled separately.',
};

const REVIEWER_NOTE: TtaRequestNote = {
  key: 'reviewer',
  phase: 'TTA Request review - needs action',
  author: 'Monica Geller, TTAC',
  role: 'Reviewer',
  date: '2026-06-23T10:05:00.000Z',
  note: 'Please add the agenda details we discussed.',
};

describe('TtaRequestNotesSummary', () => {
  it('shows a note with its phase, author, role and UTC time', () => {
    render(<TtaRequestNotesSummary notes={[CREATOR_NOTE]} />);

    expect(screen.getByRole('heading', { level: 2, name: 'Notes summary' })).toBeVisible();
    expect(
      screen.getByText('A consolidated view of all notes across the TTA request approval flow')
    ).toBeVisible();

    const [item] = screen.getAllByRole('listitem');
    expect(within(item).getByText('Draft TTA Request')).toHaveClass('text-uppercase');
    expect(within(item).getByText('Rachel Green, ECS')).toBeVisible();
    expect(within(item).getByTestId('avatar')).toHaveTextContent('R');
    expect(within(item).getByText('Creator')).toBeVisible();
    expect(within(item).getByText('June 23, 2026 • 9:32 UTC')).toBeVisible();
    expect(
      within(item).getByText(
        'Request is for monitoring citations listed, RAN incident handled separately.'
      )
    ).toBeVisible();
  });

  it('shows the notes in the order given', () => {
    render(<TtaRequestNotesSummary notes={[CREATOR_NOTE, REVIEWER_NOTE]} />);

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Rachel Green, ECS');
    expect(items[1]).toHaveTextContent('Monica Geller, TTAC');
    expect(within(items[1]).getByText('Reviewer')).toBeVisible();
  });

  it('keeps line breaks and does not read the note as HTML', () => {
    render(
      <TtaRequestNotesSummary
        notes={[{ ...CREATOR_NOTE, note: 'First line <b>not bold</b>\nSecond line' }]}
      />
    );

    const note = screen.getByText(/First line/);
    expect(note.textContent).toBe('First line <b>not bold</b>\nSecond line');
    expect(note.querySelector('b')).toBeNull();
    expect(note).toHaveClass('ttahub-notes-summary__note');
  });

  it('leaves out the note text when there is none', () => {
    const { container } = render(
      <TtaRequestNotesSummary notes={[{ ...CREATOR_NOTE, note: '' }]} />
    );

    expect(screen.getByText('Rachel Green, ECS')).toBeVisible();
    expect(container.querySelector('.ttahub-notes-summary__note')).toBeNull();
  });

  it('shows nothing when there are no notes', () => {
    const { container } = render(<TtaRequestNotesSummary notes={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
