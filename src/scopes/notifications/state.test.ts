import { Op } from 'sequelize';
import { stateFilter } from './state';

describe.each(['viewedAt', 'archivedAt'] as const)('%s state filter', (field) => {
  it('selects states with a date for true', () => {
    expect(stateFilter(field, ['true'])).toEqual({
      [`$userStates.${field}$`]: { [Op.ne]: null },
    });
  });

  it('selects null states for false, including missing left-joined states', () => {
    expect(stateFilter(field, ['false'])).toEqual({ [`$userStates.${field}$`]: null });
  });

  it.each(
    [[], ['true', 'false'], ['TRUE'], ['1'], [''], ['false OR 1=1']].map((query) => ({ query }))
  )('rejects invalid query $query', ({ query }) => {
    expect(() => stateFilter(field, query)).toThrow(
      'Notification state filters require one true or false value'
    );
  });
});
