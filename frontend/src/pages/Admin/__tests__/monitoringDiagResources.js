import React from 'react';
import { render, waitFor } from '@testing-library/react';
import * as MonitoringDiagResources from '../monitoringDiagResources';

const mockUseHistory = jest.fn();
const mockUseLocation = jest.fn();

jest.mock('react-admin', () => {
  // eslint-disable-next-line global-require
  const mockReact = require('react');

  const createMockComponent = () => jest.fn(({ children }) => (
    mockReact.createElement(mockReact.Fragment, null, children)
  ));

  return {
    List: createMockComponent(),
    Datagrid: createMockComponent(),
    TextField: createMockComponent(),
    DateField: createMockComponent(),
    Show: createMockComponent(),
    SimpleShowLayout: createMockComponent(),
    TopToolbar: createMockComponent(),
    ListButton: createMockComponent(),
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

const {
  CitationList,
  insertFiltersAfterSources,
  MonitoringReviewList,
  MonitoringFindingHistoryList,
  monitoringDiagnosticResources,
} = MonitoringDiagResources;

const encodedSearch = (filter, displayedFilters = {}) => (
  `?filter=${encodeURIComponent(JSON.stringify(filter))}&displayedFilters=${encodeURIComponent(JSON.stringify(displayedFilters))}`
);

const mockLinkedRecord = {
  id: 101,
  activeGrantId: 202,
  citationId: 303,
  deliveredReviewId: 404,
  finding_uuid: 'finding-uuid',
  findingId: 'finding-id',
  findingHistoryId: 'history-id',
  goalId: 505,
  grantId: 606,
  latest_review_uuid: 'latest-review-uuid',
  review_uuid: 'review-uuid',
  review_name: 'Review Name',
  reviewId: 'review-id',
  standardId: 707,
};

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
  });

  it('falls back cleanly when linked search state is malformed or array-based', () => {
    mockUseLocation.mockReturnValue({
      search: '?filter=%5B1%2C2%5D&displayedFilters=%5B1%2C2%5D',
      pathname: '/admin/citations',
    });

    render(<CitationList />);

    expect(reactAdmin.List.mock.calls[0][0].filterDefaultValues).toEqual({
      deletedStatus: 'active',
    });

    jest.clearAllMocks();
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
      expect(replace).toHaveBeenCalledWith({
        pathname: '/citations',
        search: encodedSearch({ reviewName: 'Hash review' }, { reviewName: true }),
      });
    });

    expect(reactAdmin.List).not.toHaveBeenCalled();
  });

  it('syncs root hash-based search into the router before rendering', async () => {
    const replace = jest.fn();

    mockUseHistory.mockReturnValue({ replace });
    mockUseLocation.mockReturnValue({
      search: '',
      pathname: '/admin/citations',
    });
    window.location.hash = `#${encodedSearch({ reviewName: 'Root hash review' }, { reviewName: true })}`;

    render(<CitationList />);

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith({
        pathname: '/',
        search: encodedSearch({ reviewName: 'Root hash review' }, { reviewName: true }),
      });
    });

    expect(reactAdmin.List).not.toHaveBeenCalled();
  });

  it('renders normally when the hash has no query string', () => {
    const replace = jest.fn();

    mockUseHistory.mockReturnValue({ replace });
    mockUseLocation.mockReturnValue({
      search: '',
      pathname: '/admin/citations',
    });
    window.location.hash = '#/citations';

    render(<CitationList />);

    expect(replace).not.toHaveBeenCalled();
    expect(reactAdmin.List).toHaveBeenCalled();
  });

  it('builds monitoring finding links and stops row click propagation', () => {
    render(<CitationList />);

    const findingUuidField = reactAdmin.FunctionField.mock.calls
      .find(([props]) => props.label === 'Finding UUID')[0];
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

  it('orders the deleted filters after UUID filters for monitoring resources', () => {
    render(<MonitoringReviewList />);

    expect(reactAdmin.List.mock.calls[0][0].filters.map((filter) => filter.props.source)).toEqual([
      'reviewId',
      'sourceDeletedStatus',
      'deletedStatus',
      'name',
      'reviewType',
      'statusId',
    ]);

    jest.clearAllMocks();
    render(<MonitoringFindingHistoryList />);

    expect(reactAdmin.List.mock.calls[0][0].filters.map((filter) => filter.props.source)).toEqual([
      'findingId',
      'reviewId',
      'sourceDeletedStatus',
      'deletedStatus',
      'reviewName',
      'findingHistoryId',
      'statusId',
    ]);
  });

  it('prepends extra filters when the expected source fields are not found', () => {
    const filterForSource = (source) => ({ props: { source } });
    const filters = [
      filterForSource('reviewId'),
      filterForSource('name'),
    ];
    const extraFilters = [
      filterForSource('sourceDeletedStatus'),
      filterForSource('deletedStatus'),
    ];

    expect(insertFiltersAfterSources(filters, extraFilters, ['missingSource'])
      .map((filter) => filter.props.source)).toEqual([
      'sourceDeletedStatus',
      'deletedStatus',
      'reviewId',
      'name',
    ]);
  });

  it('renders all resource list/show components and executes their link renderers', () => {
    monitoringDiagnosticResources.forEach((resource) => {
      render(React.createElement(resource.list));
      render(React.createElement(resource.show));
    });

    expect(reactAdmin.List).toHaveBeenCalledTimes(monitoringDiagnosticResources.length);
    expect(reactAdmin.Show).toHaveBeenCalledTimes(monitoringDiagnosticResources.length);

    render(reactAdmin.Show.mock.calls[0][0].actions);

    expect(reactAdmin.TopToolbar).toHaveBeenCalled();
    expect(reactAdmin.ListButton).toHaveBeenCalledWith(expect.objectContaining({
      basePath: '',
    }), {});

    let stopPropagationCallCount = 0;
    let emptyLinkCallCount = 0;

    reactAdmin.FunctionField.mock.calls.forEach(([props]) => {
      const renderedLink = props.render(mockLinkedRecord);

      if (renderedLink && typeof renderedLink.type === 'function') {
        const anchor = renderedLink.type(renderedLink.props);

        if (anchor && anchor.props && anchor.props.onClick) {
          const event = { stopPropagation: jest.fn() };
          anchor.props.onClick(event);
          if (event.stopPropagation.mock.calls.length) {
            stopPropagationCallCount += 1;
          }
        }
      }

      const emptyRenderedLink = props.render({});

      if (emptyRenderedLink && typeof emptyRenderedLink.type === 'function') {
        const emptyLink = emptyRenderedLink.type(emptyRenderedLink.props);

        if (emptyLink === null) {
          emptyLinkCallCount += 1;
        }
      }
    });

    expect(stopPropagationCallCount).toBeGreaterThan(0);
    expect(emptyLinkCallCount).toBeGreaterThan(0);

    const emptyCitationFindingLink = reactAdmin.FunctionField.mock.calls
      .find(([props]) => props.label === 'Finding UUID')[0]
      .render({ finding_uuid: '' });

    expect(emptyCitationFindingLink.type(emptyCitationFindingLink.props)).toBeNull();
  });
});
