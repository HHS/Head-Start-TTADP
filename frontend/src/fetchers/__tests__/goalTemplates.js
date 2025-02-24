import fetchMock from 'fetch-mock';
import join from 'url-join';
import {
  getGoalTemplateSource,
} from '../goalTemplates';

const goalTemplatesUrl = join('/', 'api', 'goal-templates');

describe('goalTemplates fetcher', () => {
  describe('getGoalTemplateSource', () => {
    afterEach(() => fetchMock.reset());
    it('should fetch goal template source', async () => {
      fetchMock.get(join(goalTemplatesUrl, '1', 'source', '?grantIds=1'), { source: 'source' });
      const source = await getGoalTemplateSource(1, [1]);

      expect(source).toEqual({ source: 'source' });
    });
  });
});
