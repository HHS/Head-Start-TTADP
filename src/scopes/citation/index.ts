import { map, pickBy } from 'lodash';
import { Op, WhereOptions } from 'sequelize';
import { activeBefore, activeAfter, activeWithinDates } from './activeWithin';

export const topicToQuery = {
  activeWithin: {
    bef: (query) => activeBefore(query),
    aft: (query) => activeAfter(query),
    win: (query) => activeWithinDates(query),
    in: (query) => activeWithinDates(query),
  },
};

export function citationFiltersToScopes(filters) {
  const validFilters = pickBy(filters, (_query, topicAndCondition) => {
    const [topic, condition] = topicAndCondition.split('.');
    if (topic === 'startDate' || topic === 'endDate') {
      return condition in topicToQuery.activeWithin;
    }
    if (!(topic in topicToQuery)) {
      return false;
    }
    return condition in topicToQuery[topic];
  });

  return map(validFilters, (query, topicAndCondition) => {
    const [topic, condition] = topicAndCondition.split('.');
    if (topic === 'startDate' || topic === 'endDate') {
      return topicToQuery.activeWithin[condition]([query].flat());
    }
    return topicToQuery[topic][condition]([query].flat());
  });
}

export function parseSelectedCitationIds(
  raw: string | string[] | undefined,
): { citationId: number; recipientId: number }[] {
  if (!raw) return [];

  const items = Array.isArray(raw)
    ? raw.flatMap((s) => s.split(','))
    : raw.split(',');

  const pairs = items
    .map((item) => {
      const s = item.trim();
      const dashIndex = s.indexOf('-');
      if (dashIndex < 1) return null;

      const citationId = Number(s.slice(0, dashIndex));
      const recipientId = Number(s.slice(dashIndex + 1));

      if (
        !Number.isInteger(citationId) || citationId <= 0
        || !Number.isInteger(recipientId) || recipientId <= 0
      ) return null;

      return { citationId, recipientId };
    })
    .filter((pair): pair is { citationId: number; recipientId: number } => pair !== null);

  const seen = new Set<string>();
  return pairs.filter(({ citationId, recipientId }) => {
    const key = `${citationId}-${recipientId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function selectedCitationIdsScope(
  pairs: { citationId: number }[],
): WhereOptions {
  if (pairs.length === 0) return {};

  const uniqueCitationIds = [...new Set(pairs.map((p) => p.citationId))];
  return { id: { [Op.in]: uniqueCitationIds } };
}
