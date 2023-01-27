import transactionWrapper from './transactionWrapper';

describe('transactionWrapper', () => {
  it('should call the original function', async () => {
    const originalFunction = jest.fn();
    const wrapper = transactionWrapper(originalFunction);
    await wrapper();
    expect(originalFunction).toHaveBeenCalled();
  });
});
