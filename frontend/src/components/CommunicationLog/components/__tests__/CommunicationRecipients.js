/* eslint-disable react/prop-types */
import React from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import selectEvent from 'react-select-event'
import CommunicationRecipients from '../CommunicationRecipients'
import { LogContext } from '../LogContext'

describe('CommunicationRecipients', () => {
  let getValues
  const renderWithForm = (ui, { defaultValues } = {}) => {
    const Wrapper = ({ children }) => {
      const methods = useForm({ defaultValues })
      getValues = methods.getValues
      return (
        // eslint-disable-next-line react/jsx-props-no-spreading
        <FormProvider {...methods}>{children}</FormProvider>
      )
    }
    return render(ui, { wrapper: Wrapper })
  }

  const mockRecipients = [
    { value: 1, label: 'Recipient 1' },
    { value: 2, label: 'Recipient 2' },
  ]

  const mockGroups = [
    {
      id: 1,
      name: 'Group 1',
      grants: [{ recipient: { id: 1, name: 'Recipient 1' } }, { recipient: { id: 2, name: 'Recipient 2' } }],
    },
  ]

  const mockContext = {
    recipients: mockRecipients,
    groups: mockGroups,
  }

  it('renders recipients dropdown', () => {
    renderWithForm(
      <LogContext.Provider value={mockContext}>
        <CommunicationRecipients />
      </LogContext.Provider>
    )

    expect(screen.getByLabelText(/Recipients/i)).toBeInTheDocument()
  })

  it('renders group dropdown when useGroup is checked', async () => {
    renderWithForm(
      <LogContext.Provider value={mockContext}>
        <CommunicationRecipients />
      </LogContext.Provider>
    )

    fireEvent.click(screen.getByLabelText(/Use group/i))

    await waitFor(() => {
      expect(screen.getByLabelText(/Group name/i)).toBeInTheDocument()
    })
  })

  it('selects group and updates recipients', async () => {
    renderWithForm(
      <LogContext.Provider value={mockContext}>
        <CommunicationRecipients />
      </LogContext.Provider>
    )

    fireEvent.click(screen.getByLabelText(/Use group/i))

    await waitFor(() => {
      expect(screen.getByLabelText(/Group name/i)).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText(/Group name/i), { target: { value: '1' } })

    await waitFor(() => {
      const selectedRecipients = getValues('recipients')
      expect(selectedRecipients).toHaveLength(2)
    })
  })

  it('shows group alert when recipients do not match group', async () => {
    renderWithForm(
      <LogContext.Provider value={mockContext}>
        <CommunicationRecipients />
      </LogContext.Provider>,
      { defaultValues: { recipients: [{ value: 3, label: 'Recipient 3' }], useGroup: false, recipientGroup: '' } }
    )

    fireEvent.click(screen.getByLabelText(/Use group/i))
    fireEvent.change(screen.getByLabelText(/Group name/i), { target: { value: '1' } })
    await selectEvent.clearFirst(screen.getByLabelText(/recipients/i))

    await waitFor(() => {
      expect(
        screen.getByText(/You've successfully modified the group's recipients for this report. Changes here do not affect the group itself./i)
      ).toBeInTheDocument()
    })
  })

  it('does not show group alert when recipients match group', async () => {
    renderWithForm(
      <LogContext.Provider value={mockContext}>
        <CommunicationRecipients />
      </LogContext.Provider>,
      { defaultValues: { recipients: mockRecipients, useGroup: false, recipientGroup: '' } }
    )
    await waitFor(() => {
      expect(
        screen.queryByText(/You've successfully modified the group's recipients for this report. Changes here do not affect the group itself./i)
      ).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText(/Use group/i))

    await waitFor(() => {
      expect(
        screen.queryByText(/You've successfully modified the group's recipients for this report. Changes here do not affect the group itself./i)
      ).not.toBeInTheDocument()
    })
  })
})
