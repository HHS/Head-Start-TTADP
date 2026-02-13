import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import SomethingWentWrong from '../SomethingWentWrong'

const renderSomethingWentWrong = (responseCode = 500) =>
  render(
    <MemoryRouter>
      <SomethingWentWrong responseCode={responseCode} />
    </MemoryRouter>
  )

describe('SomethingWentWrong component', () => {
  // Write a test to pass the response code 401 to the component.
  it('renders a 401 error message', async () => {
    renderSomethingWentWrong(401)

    expect(screen.getByText('401 error - unauthorized')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /restricted access/i })).toBeInTheDocument()
    expect(screen.getByText(/Sorry, but it looks like you're trying to access a restricted area./i)).toBeInTheDocument()
    expect(screen.getByText(/Double-check permissions:/i)).toBeInTheDocument()
    expect(screen.getByText(/Ensure you have the proper clearance to access this page/i)).toBeInTheDocument()
    expect(screen.getByText(/Login again:/i)).toBeInTheDocument()
    expect(screen.getByText(/Try logging in again. Maybe that's the missing key./i)).toBeInTheDocument()
    expect(screen.getByText(/Explore elsewhere:/i)).toBeInTheDocument()
    expect(screen.getByText(/Return to the main area and explore other permitted sections./i)).toBeInTheDocument()
    expect(screen.getByText(/If you believe this is an error or need further/i)).toBeInTheDocument()
  })

  // Write a test to pass the response code 403 to the component.
  it('renders a 403 error message', async () => {
    renderSomethingWentWrong(403)

    expect(screen.getByText('403 error - forbidden')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /restricted access/i })).toBeInTheDocument()
    expect(screen.getByText(/Sorry, but it looks like you're trying to access a restricted area./i)).toBeInTheDocument()
    expect(screen.getByText(/Double-check permissions:/i)).toBeInTheDocument()
    expect(screen.getByText(/Ensure you have the proper clearance to access this page/i)).toBeInTheDocument()
    expect(screen.getByText(/Login again:/i)).toBeInTheDocument()
    expect(screen.getByText(/Try logging in again. Maybe that's the missing key./i)).toBeInTheDocument()
    expect(screen.getByText(/Explore elsewhere:/i)).toBeInTheDocument()
    expect(screen.getByText(/Return to the main area and explore other permitted sections./i)).toBeInTheDocument()
    expect(screen.getByText(/If you believe this is an error or need further/i)).toBeInTheDocument()
  })

  // Write a test to pass the response code 404 to the component.
  it('renders a 404 error message', async () => {
    renderSomethingWentWrong(404)

    expect(screen.getByText('404 error')).toBeInTheDocument()
    expect(screen.getByText('Page not found.')).toBeInTheDocument()
    expect(screen.getByText(/Well, this is awkward. It seems like the page/i)).toBeInTheDocument()
    expect(screen.getByText(/home/i)).toBeInTheDocument()
    expect(screen.getByText(/support/i)).toBeInTheDocument()
    expect(screen.getByText(/thanks for your understanding and patience/i)).toBeInTheDocument()
  })

  // Write a test to pass an unknown response code to the component.
  it('renders a generic error message', async () => {
    renderSomethingWentWrong()
    expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument()
    expect(
      screen.getByText(
        /Well, this is awkward. It seems like the page you're looking for has taken a detour into the unknown. Here's what you can do:/i
      )
    ).toBeInTheDocument()
    expect(screen.getByText(/Thanks for your understanding and patience!/i)).toBeInTheDocument()
  })

  // Write a test to pass an unknown response code to the component.
  it('defaults to a generic error message', async () => {
    renderSomethingWentWrong(502)
    expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument()
    expect(
      screen.getByText(
        /Well, this is awkward. It seems like the page you're looking for has taken a detour into the unknown. Here's what you can do:/i
      )
    ).toBeInTheDocument()
    expect(screen.getByText(/Thanks for your understanding and patience!/i)).toBeInTheDocument()
  })
})
