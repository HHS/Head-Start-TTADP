import React from 'react'
import { render, act, screen } from '@testing-library/react'
import DisplayNextSteps, { skipDisplaySteps } from '../DisplayNextSteps'

describe('DisplayNextSteps', () => {
  describe('skipDisplaySteps', () => {
    it('should return true if steps array is empty or not provided', () => {
      expect(skipDisplaySteps()).toBe(true)
      expect(skipDisplaySteps([])).toBe(true)
    })

    it('should return true if all steps do not have a note and completeDate', () => {
      expect(
        skipDisplaySteps([
          { note: '', completeDate: '' },
          { note: null, completeDate: null },
        ])
      ).toBe(true)
    })

    it('should return false if some steps have a note or completeDate', () => {
      expect(
        skipDisplaySteps([
          { note: 'Note 1', completeDate: '' },
          { note: '', completeDate: '2022-01-01' },
        ])
      ).toBe(false)
    })

    it('should return false if all steps have a note or completeDate', () => {
      expect(
        skipDisplaySteps([
          {
            note: 'First step',
            completeDate: '2022-01-01',
          },
          {
            note: 'second step',
            completeDate: '2022-01-02',
          },
        ])
      ).toBe(false)
    })
  })

  const title = 'Next Steps'
  const steps = [
    {
      note: 'First step',
      completeDate: '2022-01-01',
    },
    {
      note: 'second step',
      completeDate: '2022-01-02',
    },
  ]

  it('renders the component with title and steps', () => {
    const { getByText } = screen
    act(() => render(<DisplayNextSteps title={title} steps={steps} />))

    expect(getByText(title)).toBeInTheDocument()
    expect(getByText('Step 1')).toBeInTheDocument()
    expect(getByText('First step')).toBeInTheDocument()
    expect(getByText('Step 2')).toBeInTheDocument()
    expect(getByText('second step')).toBeInTheDocument()
    expect(getByText('2022-01-01')).toBeInTheDocument()
    expect(getByText('2022-01-02')).toBeInTheDocument()
  })

  it('renders nothing when steps prop is empty', () => {
    const { container } = render(<DisplayNextSteps title={title} steps={[]} />)

    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when steps prop is undefined', () => {
    const { container } = render(<DisplayNextSteps title={title} />)

    expect(container.firstChild).toBeNull()
  })
})
