import transactionWrapper from './transactionWrapper';
import { auditLogger } from '../logger';

describe('transactionWrapper', () => {
  it('should call the original function', async () => {
    const originalFunction = jest.fn();
    const wrapper = transactionWrapper(originalFunction);
    await wrapper();
    expect(originalFunction).toHaveBeenCalled();
  });

  it('should log the execution time of the original function', async () => {
    const originalFunction = jest.fn().mockResolvedValue('result');
    const wrapper = transactionWrapper(originalFunction);
    const mockAuditLogger = jest.spyOn(auditLogger, 'info');

    await wrapper();

    expect(mockAuditLogger).toHaveBeenCalledWith(expect.stringContaining('execution time'));
  });
  it('should accept and log the context, if specified', async () => {
    const originalFunction = jest.fn().mockResolvedValue('result');
    const wrapper = transactionWrapper(originalFunction, 'testContext');
    const mockAuditLogger = jest.spyOn(auditLogger, 'info');

    await wrapper();

    expect(mockAuditLogger).toHaveBeenCalledWith(expect.stringContaining('testContext'));
  });
});
