/* eslint-disable react/prop-types */
/* eslint-disable react/jsx-props-no-spreading */
import React from 'react'
import { render, screen } from '@testing-library/react'
import { useForm, FormProvider } from 'react-hook-form'
import Review from '../Review'
import UserContext from '../../../../../../UserContext'

jest.mock('react-router-dom', () => ({
  useHistory: jest.fn(),
}))

describe('Review component', () => {
  const RenderReview = ({ onResetToDraft = jest.fn, creatorIsApprover = false, calculatedStatus = 'draft' }) => {
    const hookForm = useForm({
      defaultValues: { name: [] },
      mode: 'all',
    })

    return (
      <FormProvider {...hookForm}>
        <UserContext.Provider value={{ user: { id: 1 } }}>
          <Review
            onFormReview={jest.fn()}
            pages={[]}
            showDraftViewForApproverAndCreator={false}
            creatorIsApprover={creatorIsApprover}
            onResetToDraft={onResetToDraft}
            calculatedStatus={calculatedStatus}
            approverStatusList={[{ user: { id: 1 }, note: 'Test' }]}
          />
        </UserContext.Provider>
      </FormProvider>
    )
  }

  it('renders the component', () => {
    render(<RenderReview />)
    expect(screen.getByText('Review and approve')).toBeInTheDocument()
  })
})
