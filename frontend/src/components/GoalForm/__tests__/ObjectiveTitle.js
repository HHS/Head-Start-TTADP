import '@testing-library/jest-dom'
import React from 'react'
import { render, screen } from '@testing-library/react'
import ObjectiveTitle from '../ObjectiveTitle'
import { OBJECTIVE_STATUS } from '../../../Constants'

describe('ObjectiveTitle', () => {
  it('shows the read only view', async () => {
    render(
      <ObjectiveTitle
        error={<></>}
        isOnApprovedReport
        isOnReport
        title="Objective title"
        validateObjectiveTitle={jest.fn()}
        onChangeTitle={jest.fn()}
        status={OBJECTIVE_STATUS.COMPLETE}
      />
    )

    expect(await screen.findByText('Objective title')).toBeVisible()
  })
})
