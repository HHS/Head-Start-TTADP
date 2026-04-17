import React from 'react';
import { render, waitFor } from '@testing-library/react';
import {
  CitationList,
  MonitoringReviewList,
  monitoringDiagnosticResources,
} from '../monitoringDiagResources';

const mockUseHistory = jest.fn();
const mockUseLocation = jest.fn();

jest.mock('react-admin', () => {
  const createMockComponent = () => jest.fn(({ children }) => (
    React.createElement(React.Fragment, null, children)
  ));

  return {
    List: createMockComponent(),
    Datagrid: createMockComponent(),
    TextField: createMockComponent(),
    DateField: createMockComponent(),
    BooleanField: createMockComponent(),
    TextInput: createMockComponent(),
    SelectInput: createMockComponent(),
    FunctionField: createMockComponent(),
  };
});

const reactAdmin = require('react-admin');

jest.mock('react-router-dom', () => ({
  useHistory: () => mockUseHistory(),
  useLocation: () => mockUseLocation(),
}));

const encodedSearch = (filter, displayedFilters = {}) => (
  `?filter=${encodeURIComponent(JSON.stringify(filter))}&displayedFilters=${encodeURIComponent(JSON.stringify(displayedFilters))}`
);

describe('monitoringDiagResources', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseHistory.mockReturnValue({ replace: jest.fn() });
    mockUseLocation.mockReturnValue({ search: '', pathname: '/admin' });
    window.location.hash = '';
  });

  afterEach(() => {
    window.location.hash = '';
  });

  it('exports the expected monitoring diagnostic resources', () => {
    expect(monitoringDiagnosticResources.map((resource) => resource.name)).toEqual([
      'citations',
      'grantCitations',
      'deliveredReviews',
      'deliveredReviewCitations',
      'grantDeliveredReviews',
      'monitoringReviews',
      'monitoringReviewGrantees',
      'monitoringFindings',
      'monitoringFindingHistories',
      'monitoringFindingGrants',
      'monitoringFindingStandards',
      'monitoringStandards',
      'monitoringGoals',
      'goalStatusChanges',
      'grantRelationshipToActive',
    ]);
  });

  it('merges linked filter state into the diagnostics list defaults', () => {
    mockUseLocation.mockReturnValue({
      search: encodedSearch({ reviewName: 'Linked review' }, { reviewName: true }),
      pathname: '/admin/citations',
    });

    render(<CitationList />);

    const listProps = reactAdmin.List.mock.calls[0][0];

    expect(listProps.syncWithLocation).toBe(true);
    expect(listProps.filterDefaultValues).toEqual({
      deletedStatus: 'active',
      reviewName: 'Linked review',
    });
    expect(listProps.filters.map((filter) => filter.props.source)).toEqual([
      'id',
      'finding_uuid',
      'citation',
      'reviewName',
      'calculated_status',
      'latest_review_uuid',
      'deletedStatus',
    ]);
  });

  it('falls back cleanly when linked search state is malformed', () => {
    mockUseLocation.mockReturnValue({
      search: '?filter=%7Bbad%7D&displayedFilters=%7Bbad%7D',
      pathname: '/admin/citations',
    });

    render(<CitationList />);

    expect(reactAdmin.List.mock.calls[0][0].filterDefaultValues).toEqual({
      deletedStatus: 'active',
    });
  });

  it('syncs hash-based search into the router before rendering', async () => {
    const replace = jest.fn();

    mockUseHistory.mockReturnValue({ replace });
    mockUseLocation.mockReturnValue({
      search: '',
      pathname: '/admin/citations',
    });
    window.location.hash = `#/citations${encodedSearch({ reviewName: 'Hash review' }, { reviewName: true })}`;

    render(<CitationList />);

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith(expect.objectContaining({
        search: encodedSearch({ reviewName: 'Hash review' }, { reviewName: true }),
      }));
    });

    expect(reactAdmin.List).not.toHaveBeenCalled();
  });

  it('builds monitoring finding links and stops row click propagation', () => {
    render(<CitationList />);

    const findingUuidField = reactAdmin.FunctionField.mock.calls.find(([props]) => props.label === 'Finding UUID')[0];
    const link = findingUuidField.render({ finding_uuid: 'finding-123' });
    const anchor = link.type(link.props);
    const event = { stopPropagation: jest.fn() };

    expect(anchor.props.href).toBe(
      '#/monitoringFindingHistories?filter=%7B%22findingId%22%3A%22finding-123%22%7D&displayedFilters=%7B%22findingId%22%3Atrue%7D',
    );

    anchor.props.onClick(event);

    expect(event.stopPropagation).toHaveBeenCalled();
    const emptyLink = findingUuidField.render({ finding_uuid: '' });

    expect(emptyLink.type(emptyLink.props)).toBeNull();
  });

  it('inserts the deleted status filter after the matching source', () => {
    render(<MonitoringReviewList />);

    expect(reactAdmin.List.mock.calls[0][0].filters.map((filter) => filter.props.source)).toEqual([
      'reviewId',
      'sourceDeletedStatus',
      'deletedStatus',
      'name',
      'reviewType',
      'statusId',
    ]);
  });
});
