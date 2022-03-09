/**
 * @jest-environment node
 */
import {
  spinUpTool,
  isToolUp,
  shutdownTool,
  generateMetadataFromFile,
} from './fileProcessing';
// import { auditLogger } from '../logger';

describe('fileProcessing', () => {
  it('ToolStatus', async () => {
    expect(await isToolUp()).toBe(false);
    // await spinUpTool();
    // expect(await isToolUp()).toBe(true);
    expect(await generateMetadataFromFile(null)).toEqual({ error: 'invalid path', path: null, value: null });
    expect(await generateMetadataFromFile(undefined)).toEqual({ error: 'invalid path', path: undefined, value: null });
    expect(await generateMetadataFromFile(0)).toEqual({ error: 'invalid path', path: 0, value: null });
    expect(await generateMetadataFromFile('')).toEqual({ error: 'invalid path', path: '', value: null });
    // expect(await generateMetadataFromFile(
    //   `${__dirname}/../routes/files/testfiles/test.log`,
    // )).toEqual();
    // expect(await generateMetadataFromFile(
    //   `${__dirname}/../routes/files/testfiles/testfile.pdf`,
    // )).toEqual();
    // await shutdownTool();
    expect(await isToolUp()).toBe(false);
  });
});
