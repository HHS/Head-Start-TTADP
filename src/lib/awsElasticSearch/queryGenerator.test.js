import { expect } from '@playwright/test';
import { wildCardQuery, matchPhraseQuery } from './queryGenerator';
import { AWS_ELASTIC_SEARCH_FIELDS } from '../../constants';

describe('query generator tests', () => {
  it('test wild card query generator for all', async () => {
    const query = wildCardQuery([], 'test');

    expect(query.length).toBe(9);
    expect(query[0]).toStrictEqual({ wildcard: { context: '*test*' } });
    expect(query[1]).toStrictEqual({ wildcard: { nonECLKCResources: '*test*' } });
    expect(query[3]).toStrictEqual({ wildcard: { recipientNextSteps: '*test*' } });
    expect(query[4]).toStrictEqual({ wildcard: { specialistNextSteps: '*test*' } });
    expect(query[5]).toStrictEqual({ wildcard: { activityReportGoals: '*test*' } });
    expect(query[6]).toStrictEqual({ wildcard: { activityReportObjectives: '*test*' } });
    expect(query[7]).toStrictEqual({ wildcard: { activityReportObjectivesTTA: '*test*' } });
    expect(query[8]).toStrictEqual({ wildcard: { activityReportObjectiveResources: '*test*' } });
  });

  it('test wild card query generator for all specified', async () => {
    const query = wildCardQuery(AWS_ELASTIC_SEARCH_FIELDS, 'test');
    expect(query.length).toBe(9);
    expect(query[0]).toStrictEqual({ wildcard: { context: '*test*' } });
    expect(query[1]).toStrictEqual({ wildcard: { nonECLKCResources: '*test*' } });
    expect(query[3]).toStrictEqual({ wildcard: { recipientNextSteps: '*test*' } });
    expect(query[4]).toStrictEqual({ wildcard: { specialistNextSteps: '*test*' } });
    expect(query[5]).toStrictEqual({ wildcard: { activityReportGoals: '*test*' } });
    expect(query[6]).toStrictEqual({ wildcard: { activityReportObjectives: '*test*' } });
    expect(query[7]).toStrictEqual({ wildcard: { activityReportObjectivesTTA: '*test*' } });
    expect(query[8]).toStrictEqual({ wildcard: { activityReportObjectiveResources: '*test*' } });
  });

  it('test wild card query generator for specified', async () => {
    // context.
    let query = wildCardQuery([AWS_ELASTIC_SEARCH_FIELDS[0]], 'test');
    expect(query.length).toBe(1);
    expect(query[0]).toStrictEqual({ wildcard: { context: '*test*' } });

    // nonECLKCResources.
    query = wildCardQuery([AWS_ELASTIC_SEARCH_FIELDS[1]], 'test');
    expect(query.length).toBe(1);
    expect(query[0]).toStrictEqual({ wildcard: { nonECLKCResources: '*test*' } });

    // ECLKCResources.
    query = wildCardQuery([AWS_ELASTIC_SEARCH_FIELDS[2]], 'test');
    expect(query.length).toBe(1);
    expect(query[0]).toStrictEqual({ wildcard: { ECLKCResources: '*test*' } });

    // recipientNextSteps.
    query = wildCardQuery([AWS_ELASTIC_SEARCH_FIELDS[3]], 'test');
    expect(query.length).toBe(1);
    expect(query[0]).toStrictEqual({ wildcard: { recipientNextSteps: '*test*' } });

    // specialistNextSteps.
    query = wildCardQuery([AWS_ELASTIC_SEARCH_FIELDS[4]], 'test');
    expect(query.length).toBe(1);
    expect(query[0]).toStrictEqual({ wildcard: { specialistNextSteps: '*test*' } });

    // activityReportGoals.
    query = wildCardQuery([AWS_ELASTIC_SEARCH_FIELDS[5]], 'test');
    expect(query.length).toBe(1);
    expect(query[0]).toStrictEqual({ wildcard: { activityReportGoals: '*test*' } });

    // activityReportObjectives.
    query = wildCardQuery([AWS_ELASTIC_SEARCH_FIELDS[6]], 'test');
    expect(query.length).toBe(1);
    expect(query[0]).toStrictEqual({ wildcard: { activityReportObjectives: '*test*' } });

    // activityReportObjectivesTTA.
    query = wildCardQuery([AWS_ELASTIC_SEARCH_FIELDS[7]], 'test');
    expect(query.length).toBe(1);
    expect(query[0]).toStrictEqual({ wildcard: { activityReportObjectivesTTA: '*test*' } });

    // activityReportObjectiveResources.
    query = wildCardQuery([AWS_ELASTIC_SEARCH_FIELDS[8]], 'test');
    expect(query.length).toBe(1);
    expect(query[0]).toStrictEqual({ wildcard: { activityReportObjectiveResources: '*test*' } });
  });

  it('test match phrase query generator for all', async () => {
    const query = matchPhraseQuery([], 'test');

    expect(query.length).toBe(9);
    expect(query[0]).toStrictEqual({ match_phrase: { context: { slop: 0, query: 'test' } } });
    expect(query[1]).toStrictEqual({ match_phrase: { nonECLKCResources: { slop: 0, query: 'test' } } });
    expect(query[2]).toStrictEqual({ match_phrase: { ECLKCResources: { slop: 0, query: 'test' } } });
    expect(query[3]).toStrictEqual({ match_phrase: { recipientNextSteps: { slop: 0, query: 'test' } } });
    expect(query[4]).toStrictEqual({ match_phrase: { specialistNextSteps: { slop: 0, query: 'test' } } });
    expect(query[5]).toStrictEqual({ match_phrase: { activityReportGoals: { slop: 0, query: 'test' } } });
    expect(query[6]).toStrictEqual({ match_phrase: { activityReportObjectives: { slop: 0, query: 'test' } } });
    expect(query[7]).toStrictEqual({ match_phrase: { activityReportObjectivesTTA: { slop: 0, query: 'test' } } });
    expect(query[8]).toStrictEqual({ match_phrase: { activityReportObjectiveResources: { slop: 0, query: 'test' } } });
  });

  it('test match phrase query generator for all specified', async () => {
    const query = matchPhraseQuery(AWS_ELASTIC_SEARCH_FIELDS, 'test');
    expect(query.length).toBe(9);
    expect(query[0]).toStrictEqual({ match_phrase: { context: { slop: 0, query: 'test' } } });
    expect(query[1]).toStrictEqual({ match_phrase: { nonECLKCResources: { slop: 0, query: 'test' } } });
    expect(query[2]).toStrictEqual({ match_phrase: { ECLKCResources: { slop: 0, query: 'test' } } });
    expect(query[3]).toStrictEqual({ match_phrase: { recipientNextSteps: { slop: 0, query: 'test' } } });
    expect(query[4]).toStrictEqual({ match_phrase: { specialistNextSteps: { slop: 0, query: 'test' } } });
    expect(query[5]).toStrictEqual({ match_phrase: { activityReportGoals: { slop: 0, query: 'test' } } });
    expect(query[6]).toStrictEqual({ match_phrase: { activityReportObjectives: { slop: 0, query: 'test' } } });
    expect(query[7]).toStrictEqual({ match_phrase: { activityReportObjectivesTTA: { slop: 0, query: 'test' } } });
    expect(query[8]).toStrictEqual({ match_phrase: { activityReportObjectiveResources: { slop: 0, query: 'test' } } });
  });

  it('test match phrase query generator for specified', async () => {
    // context.
    let query = matchPhraseQuery([AWS_ELASTIC_SEARCH_FIELDS[0]], 'test');
    expect(query.length).toBe(1);
    expect(query[0]).toStrictEqual({ match_phrase: { context: { slop: 0, query: 'test' } } });

    // nonECLKCResources.
    query = matchPhraseQuery([AWS_ELASTIC_SEARCH_FIELDS[1]], 'test');
    expect(query.length).toBe(1);
    expect(query[0]).toStrictEqual({ match_phrase: { nonECLKCResources: { slop: 0, query: 'test' } } });

    // ECLKCResources.
    query = matchPhraseQuery([AWS_ELASTIC_SEARCH_FIELDS[2]], 'test');
    expect(query.length).toBe(1);
    expect(query[0]).toStrictEqual({ match_phrase: { ECLKCResources: { slop: 0, query: 'test' } } });

    // recipientNextSteps.
    query = matchPhraseQuery([AWS_ELASTIC_SEARCH_FIELDS[3]], 'test');
    expect(query.length).toBe(1);
    expect(query[0]).toStrictEqual({ match_phrase: { recipientNextSteps: { slop: 0, query: 'test' } } });

    // specialistNextSteps.
    query = matchPhraseQuery([AWS_ELASTIC_SEARCH_FIELDS[4]], 'test');
    expect(query.length).toBe(1);
    expect(query[0]).toStrictEqual({ match_phrase: { specialistNextSteps: { slop: 0, query: 'test' } } });

    // activityReportGoals.
    query = matchPhraseQuery([AWS_ELASTIC_SEARCH_FIELDS[5]], 'test');
    expect(query.length).toBe(1);
    expect(query[0]).toStrictEqual({ match_phrase: { activityReportGoals: { slop: 0, query: 'test' } } });

    // activityReportObjectives.
    query = matchPhraseQuery([AWS_ELASTIC_SEARCH_FIELDS[6]], 'test');
    expect(query.length).toBe(1);
    expect(query[0]).toStrictEqual({ match_phrase: { activityReportObjectives: { slop: 0, query: 'test' } } });

    // activityReportObjectivesTTA.
    query = matchPhraseQuery([AWS_ELASTIC_SEARCH_FIELDS[7]], 'test');
    expect(query.length).toBe(1);
    expect(query[0]).toStrictEqual({ match_phrase: { activityReportObjectivesTTA: { slop: 0, query: 'test' } } });

    // activityReportObjectiveResources.
    query = matchPhraseQuery([AWS_ELASTIC_SEARCH_FIELDS[8]], 'test');
    expect(query.length).toBe(1);
    expect(query[0]).toStrictEqual({ match_phrase: { activityReportObjectiveResources: { slop: 0, query: 'test' } } });
  });
});
