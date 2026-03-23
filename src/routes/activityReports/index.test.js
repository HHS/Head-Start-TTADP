describe('activityReports route wiring', () => {
  let mockRouter;
  let mockHandlers;
  let mockMiddleware;
  let mockCheckIdMiddleware;

  beforeEach(() => {
    jest.resetModules();

    mockRouter = {
      post: jest.fn(),
      get: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    };

    mockHandlers = {
      getApprovers: jest.fn(),
      submitReport: jest.fn(),
      unlockReport: jest.fn(),
      saveReport: jest.fn(),
      createReport: jest.fn(),
      getReport: jest.fn(),
      getReports: jest.fn(),
      getReportAlerts: jest.fn(),
      getActivityRecipients: jest.fn(),
      getActivityRecipientsForExistingReport: jest.fn(),
      getGoals: jest.fn(),
      reviewReport: jest.fn(),
      resetToDraft: jest.fn(),
      getLegacyReport: jest.fn(),
      downloadReports: jest.fn(),
      updateLegacyFields: jest.fn(),
      softDeleteReport: jest.fn(),
      downloadAllReports: jest.fn(),
      downloadAllAlerts: jest.fn(),
      getReportsForLocalStorageCleanup: jest.fn(),
      saveOtherEntityObjectivesForReport: jest.fn(),
      setGoalAsActivelyEdited: jest.fn(),
      getReportsByManyIds: jest.fn(),
      getGroups: jest.fn(),
    };

    mockMiddleware = {
      checkReviewReportBody: jest.fn(),
      checkSaveReportCitationBody: jest.fn(),
      checkSaveOtherEntityObjectivesCitationBody: jest.fn(),
    };

    mockCheckIdMiddleware = {
      checkActivityReportIdParam: jest.fn(),
    };

    jest.doMock('express', () => ({
      Router: () => mockRouter,
    }));
    jest.doMock('./handlers', () => mockHandlers);
    jest.doMock('./middleware', () => mockMiddleware);
    jest.doMock('../goals/handlers', () => ({
      createGoalsForReport: jest.fn(),
    }));
    jest.doMock('../../middleware/checkIdParamMiddleware', () => mockCheckIdMiddleware);
    jest.doMock('../../middleware/newRelicMiddleware', () => ({
      nameTransactionByBase: jest.fn(),
      nameTransactionByPath: jest.fn(),
    }));
    jest.doMock('../../middleware/userAdminAccessMiddleware', () => jest.fn());
    jest.doMock('../transactionWrapper', () => jest.fn((handler) => handler));

    // eslint-disable-next-line global-require
    require('./index');
  });

  it('wires citation validation middleware for PUT /:activityReportId', () => {
    const saveRoute = mockRouter.put.mock.calls.find(([path]) => path === '/:activityReportId');

    expect(saveRoute).toEqual([
      '/:activityReportId',
      mockCheckIdMiddleware.checkActivityReportIdParam,
      mockMiddleware.checkSaveReportCitationBody,
      mockHandlers.saveReport,
    ]);
  });

  it('wires citation validation middleware for POST /objectives', () => {
    const objectivesRoute = mockRouter.post.mock.calls.find(([path]) => path === '/objectives');

    expect(objectivesRoute).toEqual([
      '/objectives',
      mockMiddleware.checkSaveOtherEntityObjectivesCitationBody,
      mockHandlers.saveOtherEntityObjectivesForReport,
    ]);
  });
});
