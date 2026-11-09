import { renderHook } from '@testing-library/react-hooks';
import fetchMock from 'fetch-mock';
import useGoalTemplatePrompts from '../useGoalTemplatePrompts';

describe('useGoalTemplatePrompts response contract', () => {
  afterEach(() => fetchMock.restore());

  it.each([{ responses: [{ promptId: 1, response: ['Root cause'] }] }, { responses: [] }])(
    'uses curated responses when the flag defaults to false: %j',
    async ({ responses }) => {
      fetchMock.get('path:/api/goal-templates/1/prompts', [responses, null]);
      const { result, waitFor } = renderHook(() => useGoalTemplatePrompts(1));
      await waitFor(() => expect(result.current).toEqual([responses, null]));
      expect(
        new URL(fetchMock.lastUrl(), 'http://localhost').searchParams.get('isForActivityReport')
      ).toBe('false');
    }
  );

  it('preserves report responses and the separate template prompts', async () => {
    const responses = [{ promptId: 1, grantId: 10, response: ['Root cause'] }];
    const prompts = [{ promptId: 1, title: 'Root cause' }];
    fetchMock.get('path:/api/goal-templates/1/prompts', [responses, prompts]);
    const { result, waitFor } = renderHook(() => useGoalTemplatePrompts(1, [10], true));
    await waitFor(() => expect(result.current).toEqual([responses, prompts]));
    expect(
      new URL(fetchMock.lastUrl(), 'http://localhost').searchParams.get('isForActivityReport')
    ).toBe('true');
  });
});
