import { latestNeedsAction, nameWithRole, toNotesSummary } from '../notes';

const RACHEL = { id: 1, name: 'Rachel Green', fullName: 'Rachel Green, ECS', roles: [{ name: 'ECS' }] };
const MONICA = {
  id: 2,
  name: 'Monica Geller',
  fullName: 'Monica Geller, TTAC',
  roles: [{ name: 'TTAC' }],
};

const NOTES = [
  {
    id: 1,
    step: 'creator',
    action: 'submitted',
    note: 'Request is for monitoring citations.',
    createdAt: '2026-06-23T09:32:00.000Z',
    user: RACHEL,
  },
  {
    id: 2,
    step: 'reviewer',
    action: 'needs_action',
    note: 'Please add the agenda details we discussed.',
    createdAt: '2026-06-23T10:05:00.000Z',
    user: MONICA,
  },
  {
    id: 3,
    step: 'creator',
    action: 'submitted',
    note: 'Agenda details have been added.',
    createdAt: '2026-06-23T12:43:00.000Z',
    user: RACHEL,
  },
];

describe('TTA request notes', () => {
  describe('toNotesSummary', () => {
    it('shows each entry under the phase it was left in, by whom, in order', () => {
      expect(toNotesSummary(NOTES)).toEqual([
        {
          key: 'note-1',
          phase: 'Draft TTA Request',
          author: 'Rachel Green, ECS',
          role: 'Creator',
          date: '2026-06-23T09:32:00.000Z',
          note: 'Request is for monitoring citations.',
        },
        {
          key: 'note-2',
          phase: 'TTA Request review - needs action',
          author: 'Monica Geller, TTAC',
          role: 'Reviewer',
          date: '2026-06-23T10:05:00.000Z',
          note: 'Please add the agenda details we discussed.',
        },
        {
          key: 'note-3',
          phase: 'Draft TTA Request',
          author: 'Rachel Green, ECS',
          role: 'Creator',
          date: '2026-06-23T12:43:00.000Z',
          note: 'Agenda details have been added.',
        },
      ]);
    });

    it('has nothing to show for a request without notes', () => {
      expect(toNotesSummary(undefined)).toEqual([]);
    });
  });

  describe('nameWithRole', () => {
    it('puts the roles after the name', () => {
      expect(nameWithRole(MONICA)).toBe('Monica Geller (TTAC)');
    });

    it('leaves out the brackets for a user without roles', () => {
      expect(nameWithRole({ id: 3, name: 'Joey Tribbiani', roles: [] })).toBe('Joey Tribbiani');
    });

    it('is blank without a user', () => {
      expect(nameWithRole(null)).toBe('');
    });
  });

  describe('latestNeedsAction', () => {
    it('finds the most recent review that asked for changes', () => {
      const again = { ...NOTES[1], id: 4, note: 'One more thing' };
      expect(latestNeedsAction([...NOTES, again])).toBe(again);
    });

    it('is null when no one has asked for changes', () => {
      expect(latestNeedsAction([NOTES[0]])).toBeNull();
    });
  });
});
