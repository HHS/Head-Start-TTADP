/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { Router } from 'react-router-dom'
import { createMemoryHistory } from 'history'

import supportingAttachments from '../supportingAttachments'

// eslint-disable-next-line react/prop-types
const RenderSupportingAttachments = ({ data }) => {
  const history = createMemoryHistory()
  const hookForm = useForm({
    mode: 'onChange',
    defaultValues: data,
  })
  // eslint-disable-next-line react/prop-types
  return (
    <Router history={history}>
      <FormProvider {...hookForm}>
        {supportingAttachments.render(null, data, 1, null, jest.fn(), jest.fn(), jest.fn(), false, '', jest.fn(), () => (
          <></>
        ))}
      </FormProvider>
    </Router>
  )
}

// eslint-disable-next-line react/prop-types
const RenderSupportingAttachmentsReview = ({ data }) => {
  const history = createMemoryHistory()
  const hookForm = useForm({
    mode: 'onChange',
    defaultValues: data,
  })
  // eslint-disable-next-line react/prop-types
  return (
    <Router history={history}>
      <FormProvider {...hookForm}>{supportingAttachments.reviewSection()}</FormProvider>
    </Router>
  )
}

describe('Supporting Attachments', () => {
  const data = {
    files: [{ originalFileName: 'original file name', url: { url: 'http://localhost/attachment' }, status: 'APPROVED' }],
  }

  describe('render', () => {
    it('displays attachments and other resources', async () => {
      render(<RenderSupportingAttachments data={data} />)
      expect(await screen.findByText(/attachment/i)).toBeVisible()
      expect(await screen.findByText(/original file name/i)).toBeVisible()
    })
  })

  describe('review page', () => {
    it('displays attachments and other resources', async () => {
      render(<RenderSupportingAttachmentsReview data={data} />)
      expect(await screen.findByRole('link', { name: data.files[0].originalFileName })).toBeVisible()
    })
  })
})
