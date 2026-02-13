import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import fetchMock from 'fetch-mock'
import CourseAdd from '../CourseAdd'

describe('CourseAdd', () => {
  const mockRefresh = jest.fn()
  const renderCourseAdd = () => {
    render(<CourseAdd refresh={mockRefresh} />)
  }

  beforeEach(() => {
    fetchMock.reset()
  })

  it('renders the CourseAdd component', () => {
    renderCourseAdd()
    expect(screen.getByLabelText('Course name')).toBeInTheDocument()
    expect(screen.getByTestId('add-course')).toBeInTheDocument()
  })

  it('calls createCourseByName and refresh on form submit', async () => {
    fetchMock.post('/api/courses', {})
    renderCourseAdd()

    fireEvent.change(screen.getByLabelText('Course name'), { target: { value: 'New Course' } })
    fireEvent.click(screen.getByTestId('add-course'))

    await waitFor(() => expect(fetchMock.called('/api/courses')).toBe(true))
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled())
  })
})
