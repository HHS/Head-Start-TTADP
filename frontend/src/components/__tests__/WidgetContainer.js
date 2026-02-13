import '@testing-library/jest-dom'
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import WidgetContainer from '../WidgetContainer'

const renderWidgetContainer = (
  title = 'Widget Container Title',
  subtitle = 'Widget Container Subtitle',
  showPaging = [false, false],
  handlePageChange = jest.fn(),
  error = null,
  showHeaderBorder = true,
  enableCheckboxes = false,
  exportRows = jest.fn(),
  footNote = null,
  subtitle2 = null
) => {
  const [showPagingBottom, showPagingTop] = showPaging

  render(
    <>
      <WidgetContainer
        title={title}
        subtitle={subtitle}
        loading={false}
        loadingLabel="Loading"
        showPagingBottom={showPagingBottom}
        showPagingTop={showPagingTop}
        currentPage={1}
        totalCount={100}
        offset={0}
        perPage={10}
        handlePageChange={handlePageChange}
        error={error}
        showHeaderBorder={showHeaderBorder}
        menuItems={
          enableCheckboxes
            ? [
                {
                  label: 'Export selected rows',
                  onClick: () => {
                    exportRows('selected')
                  },
                },
                {
                  label: 'Export table',
                  onClick: () => {
                    exportRows('all')
                  },
                },
              ]
            : []
        }
        footNote={footNote}
        subtitle2={subtitle2}
      >
        This widget has been contained.
      </WidgetContainer>
    </>
  )
}

describe('Widget Container', () => {
  it('renders correctly with paging', async () => {
    renderWidgetContainer('Widget Container Title', 'Widget Container Subtitle', [true, false])
    expect(screen.getByText(/Widget Container Title/i)).toBeInTheDocument()
    expect(screen.getByText(/Widget Container Subtitle/i)).toBeInTheDocument()
    expect(screen.getByText(/This widget has been contained./i)).toBeInTheDocument()
    expect(screen.getByText(/1-10 of 100/i)).toBeInTheDocument()
  })

  it('renders correctly without paging', async () => {
    renderWidgetContainer('Widget Container Title', 'Widget Container Subtitle')
    expect(screen.getByText(/Widget Container Title/i)).toBeInTheDocument()
    expect(screen.getByText(/Widget Container Subtitle/i)).toBeInTheDocument()
    expect(screen.getByText(/This widget has been contained./i)).toBeInTheDocument()
    expect(screen.queryAllByText(/1-10 of 100/i).length).toBe(0)
  })

  it('calls paging correctly', async () => {
    const changePage = jest.fn()
    renderWidgetContainer('Widget Container Title', 'Widget Container Subtitle', [false, true], changePage)
    expect(screen.getByText(/Widget Container Title/i)).toBeInTheDocument()
    expect(screen.getByText(/1-10 of 100/i)).toBeInTheDocument()
    const pageBtn = await screen.findByRole('button', { name: /page 2/i })
    userEvent.click(pageBtn)
    await waitFor(() => expect(changePage).toHaveBeenCalled())
  })

  it('renders without title', async () => {
    renderWidgetContainer(null, null, [true, false])

    expect(screen.getByText(/This widget has been contained./i)).toBeInTheDocument()
    expect(screen.getByText(/1-10 of 100/i)).toBeInTheDocument()
  })

  it('renders error message', async () => {
    renderWidgetContainer(null, null, [true, false], () => {}, 'Sample error message')
    expect(screen.getByText(/Sample error message/i)).toBeInTheDocument()
  })

  it('hides header border', async () => {
    renderWidgetContainer('Widget container header', null, [true, false], () => {}, null, false)
    const containerElement = screen.getByRole('heading', { name: /widget container header/i }).parentElement
    expect(containerElement).not.toHaveClass('ttahub-border-base-lighter')
  })

  it('call exportRows with the correct values', async () => {
    const exportRows = jest.fn()
    renderWidgetContainer('Widget Container Title', null, [true, false], () => {}, null, false, true, exportRows)

    // Click the context menu button.
    const contextMenuBtn = screen.getByTestId('context-menu-actions-btn')
    userEvent.click(contextMenuBtn)

    // Export all rows.
    const exportTableBtn = screen.getByRole('button', { name: /export table/i })
    userEvent.click(exportTableBtn)
    expect(exportRows).toHaveBeenCalledWith('all')

    userEvent.click(contextMenuBtn)

    // Export selected rows.
    const exportSelectedBtn = screen.getByRole('button', { name: /export selected rows/i })
    userEvent.click(exportSelectedBtn)
    expect(exportRows).toHaveBeenCalledWith('selected')
  })

  it('renders foot note', async () => {
    renderWidgetContainer(
      'Widget Container Title',
      'Widget Container Subtitle',
      [true, false],
      () => {},
      null,
      false,
      false,
      () => {},
      '* There are many footnotes but this one is mine.'
    )
    expect(screen.getByText(/There are many footnotes but this one is mine./i)).toBeInTheDocument()
  })
})
