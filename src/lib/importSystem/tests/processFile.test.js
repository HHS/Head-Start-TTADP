import { processFile } from '../process';
import { auditLogger } from '../../../logger';

jest.mock('../../stream/hasher');
jest.mock('../../stream/encoding');
jest.mock('../../stream/xml');
jest.mock('../../../logger');

describe('processFile', () => {
  const processDefinition = {
    remapDef: {},
    tableName: 'tableName',
    keys: ['key'],
    encoding: 'utf8',
  };
  const fileInfo = { date: '2022-01-01' };
  const fileStream = {
    pipe: jest.fn().mockReturnThis(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw an error if remapDef is not found', async () => {
    const invalidProcessDefinition = { ...processDefinition, remapDef: undefined };

    const result = await processFile(invalidProcessDefinition, fileInfo, fileStream);

    expect(result.errors).toContain('Remapping definitions not found');
    expect(auditLogger.log).toHaveBeenCalledWith('error', expect.stringContaining('Remapping definitions not found'), expect.any(Error));
  });

  it('should throw an error if tableName is not found', async () => {
    const invalidProcessDefinition = { ...processDefinition, tableName: undefined };

    const result = await processFile(invalidProcessDefinition, fileInfo, fileStream);

    expect(result.errors).toContain('Model not found');
    expect(auditLogger.log).toHaveBeenCalledWith('error', expect.stringContaining('Model not found'), expect.any(Error));
  });

  it('should throw an error if keys are not found', async () => {
    const invalidProcessDefinition = { ...processDefinition, keys: undefined };

    const result = await processFile(invalidProcessDefinition, fileInfo, fileStream);

    expect(result.errors).toContain('Keys not found');
    expect(auditLogger.log).toHaveBeenCalledWith('error', expect.stringContaining('Keys not found'), expect.any(Error));
  });

  it('should throw an error if encoding is not found', async () => {
    const invalidProcessDefinition = { ...processDefinition, encoding: undefined };

    const result = await processFile(invalidProcessDefinition, fileInfo, fileStream);

    expect(result.errors).toContain('Encoding not found');
    expect(auditLogger.log).toHaveBeenCalledWith('error', expect.stringContaining('Encoding not found'), expect.any(Error));
  });
});
