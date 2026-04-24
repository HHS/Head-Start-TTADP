import React from 'react';
import { render } from '@testing-library/react';
import Diag from '../diag';

// eslint-disable-next-line react/prop-types
const mockAdmin = jest.fn(({ children }) => <div>{children}</div>);
const mockResource = jest.fn(() => null);

jest.mock('react-admin', () => ({
  Admin: (props) => mockAdmin(props),
  Resource: (props) => mockResource(props),
}));

jest.mock('../requestErrors', () => ({
  __esModule: true,
  default: 'RequestErrors',
  RequestErrorShow: 'RequestErrorShow',
}));

jest.mock('../dataProvider', () => ({}));

jest.mock('../monitoringDiagResources', () => ({
  monitoringDiagnosticResources: [
    {
      name: 'citations',
      label: 'Monitoring Citations',
      list: 'CitationList',
      show: 'CitationShow',
    },
  ],
}));

jest.mock('../DiagLayout', () => 'DiagLayout');

jest.mock('../../../components/Container', () => {
  // eslint-disable-next-line react/prop-types
  const MockContainer = ({ children }) => <div>{children}</div>;
  return MockContainer;
});

describe('Diag history', () => {
  beforeEach(() => {
    mockAdmin.mockClear();
    mockResource.mockClear();
  });

  it('passes stable react-admin props across rerenders', () => {
    const { rerender } = render(<Diag />);

    const firstHistory = mockAdmin.mock.calls[0][0].history;
    const firstRequestErrorsOptions = mockResource.mock.calls[0][0].options;
    const firstCitationOptions = mockResource.mock.calls[1][0].options;

    rerender(<Diag />);

    const secondHistory = mockAdmin.mock.calls[1][0].history;
    const secondRequestErrorsOptions = mockResource.mock.calls[2][0].options;
    const secondCitationOptions = mockResource.mock.calls[3][0].options;

    expect(firstHistory).toBeDefined();
    expect(firstHistory).toBe(secondHistory);
    expect(firstRequestErrorsOptions).toBe(secondRequestErrorsOptions);
    expect(firstCitationOptions).toBe(secondCitationOptions);
  });
});
