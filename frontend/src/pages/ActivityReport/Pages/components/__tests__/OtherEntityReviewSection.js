/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { REPORT_STATUSES } from '@ttahub/common'
import { FormProvider, useForm } from 'react-hook-form'
import { MemoryRouter } from 'react-router'
import OtherEntityReviewSection from '../OtherEntityReviewSection'
import { OBJECTIVE_STATUS } from '../../../../../Constants'

describe('OtherEntityReviewSection', () => {
  const Review = () => {
    const hookForm = useForm({
      mode: 'onChange',
      defaultValues: {
        objectivesWithoutGoals: [
          {
            id: 1,
            title: 'Objective 1',
            topics: [],
            resources: [],
            courses: [{ id: 1, name: 'Test Course' }],
            ttaProvided: '<p>TTA Provided</p>',
            status: OBJECTIVE_STATUS.IN_PROGRESS,
            files: [
              {
                url: {
                  url: 'https://www.google.com',
                },
                originalFileName: 'test.txt',
              },
              {
                url: {
                  url: 'https://www.google2.com',
                },
                originalFileName: 'test.csv',
              },
            ],
          },
        ],
        calculatedStatus: REPORT_STATUSES.DRAFT,
      },
    })

    return (
      <FormProvider {...hookForm}>
        <MemoryRouter>
          <OtherEntityReviewSection />
        </MemoryRouter>
      </FormProvider>
    )
  }

  it('displays the correct info when there is a .txt attachment', async () => {
    render(<Review />)

    const link = document.querySelector('a[href="https://www.google.com"]')
    expect(link).toHaveAttribute('target', '_blank')
    expect(screen.getByText(/(opens in new tab)/i)).toBeInTheDocument()

    const link2 = document.querySelector('a[href="https://www.google2.com"]')
    expect(link2).toHaveAttribute('target', '_self')
  })
})
