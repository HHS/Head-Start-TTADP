import '@testing-library/jest-dom'
import React from 'react'
import { render, screen, act } from '@testing-library/react'
import ResourceUseSparklineGraph from '../ResourceUseSparklineGraph'

const testData = {
  headers: ['Jan-22', 'Feb-22', 'Mar-22'],
  resources: [
    {
      heading: 'https://headstart.gov/school-readiness/effective-practice-guides/effective-practice-guides',
      url: 'https://headstart.gov/school-readiness/effective-practice-guides/effective-practice-guides',
      isUrl: true,
      data: [
        {
          title: 'Jan-22',
          value: '17',
        },
        {
          title: 'Feb-22',
          value: '18',
        },
        {
          title: 'Mar-22',
          value: '19',
        },
        {
          title: 'Total',
          value: '20',
        },
      ],
    },
    {
      heading: 'https://headstart.gov/school-readiness/effective-practice-guides/effective-practice-guides',
      title: 'ECLKC Sample Title Test',
      isUrl: true,
      data: [
        {
          title: 'Jan-22',
          value: '17',
        },
        {
          title: 'Feb-22',
          value: '18',
        },
        {
          title: 'Mar-22',
          value: '19',
        },
        {
          title: 'total',
          value: '20',
        },
      ],
    },
    {
      heading: 'https://headstart.gov/school-readiness/effective-practice-guides/effective-practice-guides',
      url: 'https://headstart.gov/school-readiness/effective-practice-guides/effective-practice-guides',
      title: 'ECLKC Sample Title Test',
      isUrl: true,
      data: [
        {
          title: 'Jan-22',
          value: '17',
        },
        {
          title: 'Feb-22',
          value: '18',
        },
        {
          title: 'Mar-22',
          value: '19',
        },
        {
          title: 'Total',
          value: '20',
        },
      ],
    },
    {
      heading: 'https://test1.gov',
      url: 'https://test1.gov',
      isUrl: true,
      data: [
        {
          title: 'Jan-22',
          value: '21',
        },
        {
          title: 'Feb-22',
          value: '22',
        },
        {
          title: 'Mar-22',
          value: '23',
        },
        {
          title: 'total',
          value: '24',
        },
      ],
    },
    {
      heading: 'Non URL',
      isUrl: false,
      data: [
        {
          title: 'Jan-22',
          value: '25',
        },
        {
          title: 'Feb-22',
          value: '26',
        },
        {
          title: 'Mar-22',
          value: '27',
        },
        {
          title: 'Total',
          value: '28',
        },
      ],
    },
  ],
}

const renderResourceUseSparklineGraph = (data) => {
  render(<ResourceUseSparklineGraph data={data} />)
}

describe('ResourceUseSparklineGraph', () => {
  it('renders correctly without data', async () => {
    const data = { headers: ['Jan-22', 'Feb-22', 'Mar-22'], resources: [] }
    act(() => {
      renderResourceUseSparklineGraph(data)
    })

    expect(screen.getByText(/Activity reports citing resource/i)).toBeInTheDocument()
    expect(screen.getByText(/Highest count during date range/i)).toBeInTheDocument()

    expect(document.querySelector('svg')).toBe(null)
  })

  it('renders correctly with data', async () => {
    expect(() => {
      act(() => {
        renderResourceUseSparklineGraph(testData)
      })
    }).not.toThrow()
  })
})
