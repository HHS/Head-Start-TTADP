import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen, waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WidgetContainer from '../WidgetContainer';

const renderWidgetContainer = (
  title = 'Widget Container Title',
  subtitle = 'Widget Container Subtitle',
  showPaging = false,
  handlePageChange = () => {},
  error = null,
  showHeaderBorder = true,
) => {
  render(
    <>
      <WidgetContainer
        title={title}
        subtitle={subtitle}
        loading={false}
        loadingLabel="Loading"
        showPagingBottom={showPaging}
        currentPage={1}
        totalCount={100}
        offset={0}
        perPage={10}
        handlePageChange={handlePageChange}
        error={error}
        showHeaderBorder={showHeaderBorder}
      >
        This widget has been contained.
      </WidgetContainer>
    </>,
  );
};

describe('Widget Container', () => {
  it('renders correctly with paging', async () => {
    renderWidgetContainer('Widget Container Title', 'Widget Container Subtitle', true);
    expect(screen.getByText(/Widget Container Title/i)).toBeInTheDocument();
    expect(screen.getByText(/Widget Container Subtitle/i)).toBeInTheDocument();
    expect(screen.getByText(/This widget has been contained./i)).toBeInTheDocument();
    expect(screen.getByText(/1-10 of 100/i)).toBeInTheDocument();
  });

  it('renders correctly without paging', async () => {
    renderWidgetContainer('Widget Container Title', 'Widget Container Subtitle');
    expect(screen.getByText(/Widget Container Title/i)).toBeInTheDocument();
    expect(screen.getByText(/Widget Container Subtitle/i)).toBeInTheDocument();
    expect(screen.getByText(/This widget has been contained./i)).toBeInTheDocument();
    expect(screen.queryAllByText(/1-10 of 100/i).length).toBe(0);
  });

  it('calls paging correctly', async () => {
    const changePage = jest.fn();
    renderWidgetContainer('Widget Container Title', 'Widget Container Subtitle', true, changePage);
    expect(screen.getByText(/Widget Container Title/i)).toBeInTheDocument();
    expect(screen.getByText(/1-10 of 100/i)).toBeInTheDocument();
    const pageBtn = await screen.findByRole('button', { name: /page 2/i });
    userEvent.click(pageBtn);
    await waitFor(() => expect(changePage).toHaveBeenCalled());
  });

  it('renders without title', async () => {
    renderWidgetContainer(null, null, true);
    expect(screen.getByText(/This widget has been contained./i)).toBeInTheDocument();
    expect(screen.getByText(/1-10 of 100/i)).toBeInTheDocument();
  });

  it('renders error message', async () => {
    renderWidgetContainer(null, null, true, () => {}, 'Sample error message');
    expect(screen.getByText(/Sample error message/i)).toBeInTheDocument();
  });

  it('hides header border', async () => {
    renderWidgetContainer('Widget container header', null, true, () => {}, null, false);
    const containerElement = screen.getByRole('heading', { name: /widget container header/i }).parentElement;
    expect(containerElement).not.toHaveClass('smart-hub-widget-container-header-border');
  });
});
