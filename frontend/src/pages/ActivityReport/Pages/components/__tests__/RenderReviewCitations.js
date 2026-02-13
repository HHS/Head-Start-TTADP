import '@testing-library/jest-dom'
import React from 'react'
import { render, screen } from '@testing-library/react'
import RenderReviewCitations from '../RenderReviewCitations'

describe('RenderReviewCitations', () => {
  const activityRecipients = [
    {
      id: 11074,
      activityRecipientId: 11074,
      name: 'R1 - GRANT1 - HS',
    },
    {
      id: 11966,
      activityRecipientId: 11966,
      name: 'R1 - GRANT2 - EHS',
    },
  ]

  const citations = [
    {
      id: 200205,
      activityReportObjectiveId: 241644,
      citation: '1302.12(k)',
      monitoringReferences: [
        {
          acro: 'AOC',
          name: 'AOC - 1302.12(k) - Monitoring ERSEA: Eligibility, Recruitment, Selection, Enrollment, and Attendance',
          grantId: 'bad-recipient-id',
          citation: '1302.12(k)',
          severity: 3,
          findingId: '8D18F077-CD6F-4869-AB21-E76EB682433B',
          reviewName: '230706F2',
          standardId: 200205,
          findingType: 'Area of Concern',
          grantNumber: '01CH011566',
          findingSource: 'Monitoring ERSEA: Eligibility, Recruitment, Selection, Enrollment, and Attendance',
          reportDeliveryDate: '2023-06-26T04:00:00+00:00',
          monitoringFindingStatusName: 'Active',
        },
        {
          acro: 'AOC',
          name: 'AOC - 1302.12(k) - Monitoring ERSEA: Eligibility, Recruitment, Selection, Enrollment, and Attendance',
          grantId: 11966,
          citation: '1302.12(k)',
          severity: 3,
          findingId: '8D18F077-CD6F-4869-AB21-E76EB682433B',
          reviewName: '230706F2',
          standardId: 200205,
          findingType: 'Area of Concern',
          grantNumber: '01CH011566',
          findingSource: 'Monitoring ERSEA: Eligibility, Recruitment, Selection, Enrollment, and Attendance',
          reportDeliveryDate: '2023-06-26T04:00:00+00:00',
          monitoringFindingStatusName: 'Active',
        },
        {
          acro: 'AOC',
          name: 'AOC - 1302.12(k) - Monitoring ERSEA: Eligibility, Recruitment, Selection, Enrollment, and Attendance',
          grantId: 11074,
          citation: '1302.12(k)',
          severity: 3,
          findingId: '8D18F077-CD6F-4869-AB21-E76EB682433B',
          reviewName: '230706F2',
          standardId: 200205,
          findingType: 'Area of Concern',
          grantNumber: '01CH011566',
          findingSource: 'Monitoring ERSEA: Eligibility, Recruitment, Selection, Enrollment, and Attendance',
          reportDeliveryDate: '2023-06-26T04:00:00+00:00',
          monitoringFindingStatusName: 'Active',
        },
      ],
      name: 'AOC - 1302.12(k) - Monitoring ERSEA: Eligibility, Recruitment, Selection, Enrollment, and Attendance',
    },
  ]

  it('renders the citations', async () => {
    render(<RenderReviewCitations citations={citations} activityRecipients={activityRecipients} />)

    const recipient1 = screen.getByText('R1 - GRANT1 - HS')
    expect(recipient1).toBeVisible()

    const recipient2 = screen.getByText('R1 - GRANT2 - EHS')
    expect(recipient2).toBeVisible()

    const labels = await screen.findAllByTestId('review-citation-label')
    expect(labels).toHaveLength(2)

    const listItems = await screen.findAllByTestId('review-citation-listitem')
    expect(listItems).toHaveLength(2)

    expect(
      await screen.findAllByText('AOC - 1302.12(k) - Monitoring ERSEA: Eligibility, Recruitment, Selection, Enrollment, and Attendance')
    ).toHaveLength(2)
  })
})
