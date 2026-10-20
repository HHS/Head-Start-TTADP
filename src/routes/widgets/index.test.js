describe('widget routes', () => {
  let mockRouter;
  let mockTransactionWrapper;
  let mockNameTransactionByPath;
  let mockGetWidget;
  let mockPostWidget;

  beforeEach(() => {
    jest.resetModules();

    mockRouter = {
      get: jest.fn(),
      post: jest.fn(),
    };
    mockTransactionWrapper = jest.fn((fn) => fn);
    mockNameTransactionByPath = jest.fn();
    mockGetWidget = jest.fn();
    mockPostWidget = jest.fn();

    jest.doMock('express', () => ({
      Router: () => mockRouter,
    }));
    jest.doMock('../transactionWrapper', () => mockTransactionWrapper);
    jest.doMock('../../middleware/newRelicMiddleware', () => ({
      nameTransactionByPath: mockNameTransactionByPath,
    }));
    jest.doMock('./handlers', () => ({
      getWidget: mockGetWidget,
      postWidget: mockPostWidget,
    }));
  });

  it('registers widget routes with repeatable read transactions', () => {
    // eslint-disable-next-line global-require
    require('./index');

    expect(mockTransactionWrapper).toHaveBeenNthCalledWith(1, mockGetWidget, '', false, {
      isolationLevel: 'REPEATABLE READ',
    });
    expect(mockTransactionWrapper).toHaveBeenNthCalledWith(2, mockPostWidget, '', false, {
      isolationLevel: 'REPEATABLE READ',
    });
    expect(mockRouter.get).toHaveBeenCalledWith(
      '/:widgetId',
      mockNameTransactionByPath,
      mockGetWidget
    );
    expect(mockRouter.post).toHaveBeenCalledWith(
      '/:widgetId',
      mockNameTransactionByPath,
      mockPostWidget
    );
  });
});
