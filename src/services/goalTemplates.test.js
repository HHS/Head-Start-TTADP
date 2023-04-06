import { setFieldPromptForCuratedTemplate, setFieldPromptsForCuratedTemplate } from './goalTemplates';

jest.mock('./goalTemplates', () => ({
  setFieldPromptForCuratedTemplate: jest.fn(),
}));

describe('setFieldPromptsForCuratedTemplate', () => {
  const goalIds = [1, 2, 3];
  const promptResponses = [
    { promptId: 1, response: 'response 1' },
    { promptId: 2, response: 'response 2' },
    { promptId: 3, response: 'response 3' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call setFieldPromptForCuratedTemplate for each prompt response', async () => {
    await setFieldPromptsForCuratedTemplate(goalIds, promptResponses);

    expect(setFieldPromptForCuratedTemplate).toHaveBeenCalledTimes(3);
    expect(setFieldPromptForCuratedTemplate).toHaveBeenCalledWith(goalIds, 1, 'response 1');
    expect(setFieldPromptForCuratedTemplate).toHaveBeenCalledWith(goalIds, 2, 'response 2');
    expect(setFieldPromptForCuratedTemplate).toHaveBeenCalledWith(goalIds, 3, 'response 3');
  });

  it('should return an array of promises', async () => {
    const result = await setFieldPromptsForCuratedTemplate(goalIds, promptResponses);

    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBe(3);
    expect(result[0]).toBeInstanceOf(Promise);
    expect(result[1]).toBeInstanceOf(Promise);
    expect(result[2]).toBeInstanceOf(Promise);
  });
});
