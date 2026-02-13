import '@testing-library/jest-dom'
import React from 'react'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Drawer from '../Drawer'

// eslint-disable-next-line react/prop-types
jest.mock('focus-trap-react', () => ({ children }) => <>{children}</>)

describe('Drawer', () => {
  // Create a ref for the trigger element which opens the drawer:
  const triggerRef = React.createRef()
  const clickTargetRef = React.createRef()

  const renderDrawer = ({ sticky = false, hasTitle = true, hasFooter = true, hasTrigger = true } = {}) => (
    <div>
      <div ref={clickTargetRef}>click target</div>
      {hasTrigger && (
        <div>
          <button type="button" ref={triggerRef} onClick={() => {}}>
            Open
          </button>
        </div>
      )}
      <Drawer
        title={hasTitle ? 'Hello' : ''}
        footer={hasFooter ? 'Footer' : ''}
        triggerRef={hasTrigger ? triggerRef : null}
        stickyHeader={sticky}
        stickyFooter={sticky}
      >
        Content
      </Drawer>
    </div>
  )

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should open the drawer when the trigger is clicked', async () => {
    render(renderDrawer())

    expect(screen.queryByText('Content')).not.toBeVisible()

    act(() => {
      const button = screen.getByRole('button', { name: 'Open' })
      userEvent.click(button)
    })

    expect(screen.getByText('Content')).toBeVisible()
  })

  it('should close when the escape key is pressed', async () => {
    render(renderDrawer())

    act(() => {
      const button = screen.getByRole('button', { name: 'Open' })
      userEvent.click(button)
    })

    expect(screen.getByText('Content')).toBeVisible()

    act(() => {
      userEvent.keyboard('{esc}')
    })

    expect(screen.queryByText('Content')).not.toBeVisible()
  })

  it('should automatically focus the close button when title is present', async () => {
    render(renderDrawer({ hasTitle: true }))

    act(() => {
      const button = screen.getByRole('button', { name: 'Open' })
      userEvent.click(button)
    })

    expect(screen.getByText('Content')).toBeVisible()

    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus()
  })

  it('has sticky classes when stickyHeader and stickyFooter are true', async () => {
    render(renderDrawer({ sticky: true }))

    act(() => {
      const button = screen.getByRole('button', { name: 'Open' })
      userEvent.click(button)
    })

    expect(screen.getByText('Footer')).toHaveClass('position-sticky')
    expect(screen.getByText('Hello').parentElement).toHaveClass('position-sticky')
  })

  it('should close when the close button is clicked', async () => {
    render(renderDrawer())

    // open
    act(() => {
      const button = screen.getByRole('button', { name: 'Open' })
      userEvent.click(button)
    })
    expect(screen.getByText('Content')).toBeVisible()

    // close
    act(() => {
      const button = screen.getByRole('button', { name: 'Close' })
      userEvent.click(button)
    })
    expect(screen.queryByText('Content')).not.toBeVisible()
  })

  it('should close when clicking outside', async () => {
    render(renderDrawer())

    // open
    act(() => {
      const button = screen.getByRole('button', { name: 'Open' })
      userEvent.click(button)
    })
    expect(screen.getByText('Content')).toBeVisible()

    // click outside
    act(() => {
      const outside = screen.getByText('click target')
      userEvent.click(outside)
    })
    expect(screen.queryByText('Content')).not.toBeVisible()
  })

  it('does not add trigger listener if triggerRef is null', () => {
    const addEventSpy = jest.spyOn(Element.prototype, 'addEventListener')
    render(renderDrawer({ hasTrigger: false }))
    expect(addEventSpy).not.toHaveBeenCalledWith('click', expect.any(Function))
  })

  it('does not render header or footer if props are missing', () => {
    render(renderDrawer({ hasTitle: false, hasFooter: false }))
    act(() => {
      const button = screen.getByRole('button', { name: 'Open' })
      userEvent.click(button)
    })
    expect(screen.queryByText('Hello')).not.toBeInTheDocument()
    expect(screen.queryByText('Footer')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()
  })

  it('calculates header height as 0 if header element is missing', async () => {
    // mock querySelector to return null for the header
    jest.spyOn(document, 'querySelector').mockReturnValue(null)

    render(renderDrawer())
    act(() => {
      const button = screen.getByRole('button', { name: 'Open' })
      userEvent.click(button)
    })
    // drawer element is the parent of the focus trap div
    const drawerElement = screen.getByText('Content').closest('.smart-hub-drawer')
    expect(drawerElement).toHaveStyle('top: 0px')
  })

  it('calculates header height correctly if header element exists', async () => {
    // mock querySelector to return a fake header element with offsetHeight
    const mockHeader = { offsetHeight: 50 }
    jest.spyOn(document, 'querySelector').mockReturnValue(mockHeader)

    render(renderDrawer())
    act(() => {
      const button = screen.getByRole('button', { name: 'Open' })
      userEvent.click(button)
    })
    const drawerElement = screen.getByText('Content').closest('.smart-hub-drawer')
    expect(drawerElement).toHaveStyle('top: 50px')
  })
})
