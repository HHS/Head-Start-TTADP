import '@testing-library/jest-dom'
import React from 'react'
import { render, screen } from '@testing-library/react'
import FormFieldThatIsSometimesReadOnly from '../FormFieldThatIsSometimesReadOnly'

describe('FormFieldThatIsSometimesReadOnly', () => {
  const renderTest = (permissions = [true, true, true]) => {
    render(
      <FormFieldThatIsSometimesReadOnly label="test label" value="test value" permissions={permissions}>
        <h3>Test heading</h3>
      </FormFieldThatIsSometimesReadOnly>
    )
  }

  it('shows the contents', async () => {
    renderTest()
    const heading = screen.getByRole('heading')
    expect(heading).toBeVisible()

    const readOnlyLabel = screen.queryByText('test label')
    expect(readOnlyLabel).toBeNull()

    const readOnlyField = screen.queryByText('test value')
    expect(readOnlyField).toBeNull()
  })

  it('shows the read only view', async () => {
    renderTest([false, true, true])
    const heading = screen.queryByRole('heading')
    expect(heading).toBeNull()

    const readOnlyLabel = screen.getByText('test label')
    expect(readOnlyLabel).toBeVisible()

    const readOnlyField = screen.getByText('test value')
    expect(readOnlyField).toBeVisible()
  })
})
