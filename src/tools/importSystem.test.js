import manuallyTriggerImportSystem from './importSystem';
import * as importSystem from '../lib/importSystem';

jest.mock('../lib/importSystem', () => ({
  download: jest.fn(),
  process: jest.fn(),
}));

describe('manuallyTriggerImportSystem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call download when action is download', async () => {
    const action = 'download';
    const importIdStr = '1';
    await manuallyTriggerImportSystem(action, importIdStr);
    expect(importSystem.download).toHaveBeenCalledWith(1, undefined);
    expect(importSystem.process).not.toHaveBeenCalled();
  });

  it('should call process when action is process', async () => {
    const action = 'process';
    const importIdStr = '1';
    await manuallyTriggerImportSystem(action, importIdStr);
    expect(importSystem.process).toHaveBeenCalledWith(1);
    expect(importSystem.download).not.toHaveBeenCalled();
  });

  it('should throw an error for an unknown action', async () => {
    const action = 'unknown';
    const importIdStr = '789';
    await expect(manuallyTriggerImportSystem(action, importIdStr)).rejects.toThrow(`Unknown action: '${action}'`);
  });

  it('should throw an error for a non-numeric importId', async () => {
    const action = 'download';
    const importIdStr = 'not-a-number';
    await expect(manuallyTriggerImportSystem(action, importIdStr)).rejects.toThrow(`Bad or missing importId: '${importIdStr}'`);
  });

  it('should throw an error for an empty importId', async () => {
    const action = 'process';
    const importIdStr = '';
    await expect(manuallyTriggerImportSystem(action, importIdStr)).rejects.toThrow(`Bad or missing importId: '${importIdStr}'`);
  });
});
