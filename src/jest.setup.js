const httpContext = require('express-http-context');
const path = require('path');
const cls = require('cls-hooked');

const nsid = 'a6a29a6f-6747-4b5f-b99f-07ee96e32f88';
const ns = cls.createNamespace(nsid);

httpContext.ns = ns; // Set the namespace in httpContext

const contextData = {};

// Mock `httpContext` using Jest
jest.mock('express-http-context', () => ({
  set: jest.fn().mockImplementation((key, value) => { contextData[key] = value; }),
  get: jest.fn().mockImplementation((key) => contextData[key]),
  middleware: jest.fn((req, res, next) => next()), // Mock the middleware function
}));

const sanitize = (value) => {
  if (typeof value === 'string') {
    return value.replace(/'/g, "''");
  }
  return value;
};

// Setup for each test
global.beforeEach((done) => {
  httpContext.ns.run(() => {
    // Ensure the namespace is initialized
    console.log('!!!!!!!!!!');
    const state = expect.getState();

    // Convert absolute testPath to a relative path
    const relativeTestPath = path.relative(process.cwd(), state.testPath);

    // Set values in the context
    httpContext.set('sessionSig', relativeTestPath);
    httpContext.set('auditDescriptor', sanitize(state.currentTestName));

    // Retrieve and log the values from the context
    console.log(httpContext.get('sessionSig'));
    console.log(httpContext.get('auditDescriptor'));

    done();
  });
});
