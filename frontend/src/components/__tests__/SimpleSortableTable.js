import '@testing-library/jest-dom'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import SimpleSortableTable from '../SimpleSortableTable'

describe('SimpleSortableTable', () => {
  const columns = [
    { key: 'name', name: 'Name' },
    { key: 'age', name: 'Age' },
  ]
  const data = [
    { name: 'John', age: 30 },
    { name: 'Jane', age: 25 },
    { name: 'Doe', age: 50 },
  ]

  it('renders table headers', () => {
    render(<SimpleSortableTable data={data} columns={columns} />)
    columns.forEach((column) => {
      expect(screen.getByText(column.name)).toBeInTheDocument()
    })
  })

  it('renders table rows', () => {
    render(<SimpleSortableTable data={data} columns={columns} />)
    data.forEach((row) => {
      Object.values(row).forEach((value) => {
        expect(screen.getByText(value.toString())).toBeInTheDocument()
      })
    })
  })

  it('sorts data by column when header is clicked', () => {
    render(<SimpleSortableTable data={data} columns={columns} />)
    const nameHeaderButton = screen.getByRole('button', { name: 'Name Activate to sort ascending' })
    fireEvent.click(nameHeaderButton) // Sort ascending

    const sortedNamesAsc = data.slice().sort((a, b) => a.name.localeCompare(b.name))
    sortedNamesAsc.forEach((item, index) => {
      const row = screen.getAllByRole('row')[index + 1] // +1 to skip header row
      expect(row).toHaveTextContent(item.name)
      expect(row).toHaveTextContent(item.age.toString())
    })

    fireEvent.click(nameHeaderButton) // Sort descending
    const sortedNamesDesc = [...sortedNamesAsc].reverse()
    sortedNamesDesc.forEach((item, index) => {
      const row = screen.getAllByRole('row')[index + 1] // +1 to skip header row
      expect(row).toHaveTextContent(item.name)
      expect(row).toHaveTextContent(item.age.toString())
    })
  })

  it('toggles sort direction when the same header is clicked', async () => {
    render(<SimpleSortableTable data={data} columns={columns} />)
    const ageHeaderButton = screen.getByRole('button', { name: 'Age Activate to sort ascending' })
    fireEvent.click(ageHeaderButton) // Sort age ascending
    fireEvent.click(ageHeaderButton) // Click again, should toggle to descending

    // Check if the sort direction has toggled to 'desc'
    expect(ageHeaderButton.getAttribute('aria-label')).toBe('Age Activate to sort ascending')

    // Check the order of the rows is now descending
    const sortedAgesDesc = data.slice().sort((a, b) => b.age - a.age)
    sortedAgesDesc.forEach((item) => {
      const nameCell = screen.getByText(item.name).closest('tr')
      const ageCellText = nameCell.querySelector('td:nth-child(2)').textContent // Assuming age is the second column
      expect(ageCellText).toBe(item.age.toString())
    })
  })

  it('changes sort direction when a different header is clicked', () => {
    render(<SimpleSortableTable data={data} columns={columns} />)
    const nameHeaderButton = screen.getByRole('button', { name: 'Name Activate to sort ascending' })
    const ageHeaderButton = screen.getByRole('button', { name: 'Age Activate to sort ascending' })
    fireEvent.click(nameHeaderButton) // Sort name ascending
    fireEvent.click(ageHeaderButton) // Now sort age ascending

    const sortedAgesAsc = data.slice().sort((a, b) => a.age - b.age)
    sortedAgesAsc.forEach((item, index) => {
      const row = screen.getAllByRole('row')[index + 1] // +1 to skip header row
      expect(row).toHaveTextContent(item.name)
      expect(row).toHaveTextContent(item.age.toString())
    })
  })
})
