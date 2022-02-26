import {
  spinUpTool,
  isToolUp,
  shutdownTool,
  // generateMetadataFromFile,
} from './fileProcessing';

describe('fileProcessing', () => {
  it('ToolStatus', async () => {
    expect(isToolUp()).toBe(false);
    await spinUpTool();
    expect(isToolUp()).toBe(true);
    shutdownTool();
    expect(isToolUp()).toBe(false);
  });
});
