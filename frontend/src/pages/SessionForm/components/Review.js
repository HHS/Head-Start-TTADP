import React from 'react'
import PropTypes from 'prop-types'
import { useFormContext } from 'react-hook-form'
import { useHistory } from 'react-router'
import TopAlert from './TopAlert'
import { Accordion } from '../../../components/Accordion'
import IndicatesRequiredField from '../../../components/IndicatesRequiredField'
import Submit from './Submit'
import Approve from './Approve'
import NeedsAction from './NeedsAction'

const Review = ({
  reviewItems,
  pages,
  isPoc,
  onFormReview,
  isApprover,
  isAdmin,
  approver,
  isSubmitted,
  onUpdatePage,
  onSaveDraft,
  onSubmit,
  isNeedsAction,
  reviewSubmitPagePosition,
}) => {
  let FormComponent = Submit

  if (isApprover && isSubmitted && !isNeedsAction) {
    FormComponent = Approve
  }

  if (isNeedsAction) {
    FormComponent = NeedsAction
  }

  const { getValues } = useFormContext()
  const { id, eventId, submitter } = getValues()
  const history = useHistory()

  return (
    <>
      <h2 className="font-family-serif">Review and submit</h2>

      <IndicatesRequiredField />

      {!isApprover && !isNeedsAction && (
        <p className="usa-prose margin-top-2 margin-bottom-4">
          Review the information in each section before submitting for approval. Once submitted, you will no longer be able to edit the report.
        </p>
      )}

      {isSubmitted && <TopAlert isNeedsAction={isNeedsAction} submitter={submitter} approver={approver} />}
      {reviewItems && reviewItems.length > 0 && (
        <div className="margin-bottom-4">
          <Accordion
            bordered
            items={reviewItems.map((item) => ({
              ...item,
              expanded: isApprover,
            }))}
            pages={pages.map((page) => ({
              ...page,
              onNavigation: () => {
                history.push(`/training-report/${eventId}/session/${id}/${page.path}`)
              },
            }))}
            multiselectable
            canEdit={!isApprover}
            doesStartExpanded={isApprover}
          />
        </div>
      )}

      <FormComponent
        onSaveDraft={onSaveDraft}
        onUpdatePage={onUpdatePage}
        onSubmit={onSubmit}
        reviewSubmitPagePosition={reviewSubmitPagePosition}
        pages={pages}
        onFormReview={onFormReview}
        isPoc={isPoc}
        isAdmin={isAdmin}
      />
    </>
  )
}

Review.propTypes = {
  onFormReview: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  pages: PropTypes.arrayOf(
    PropTypes.shape({
      state: PropTypes.string,
      review: PropTypes.bool,
      label: PropTypes.string,
    })
  ).isRequired,
  approver: PropTypes.shape({
    id: PropTypes.number,
    fullName: PropTypes.string,
  }).isRequired,
  reviewItems: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      content: PropTypes.node.isRequired,
    })
  ).isRequired,
  isPoc: PropTypes.bool.isRequired,
  isSubmitted: PropTypes.bool.isRequired,
  isApprover: PropTypes.bool.isRequired,
  onUpdatePage: PropTypes.func.isRequired,
  onSaveDraft: PropTypes.func.isRequired,
  isNeedsAction: PropTypes.bool.isRequired,
  author: PropTypes.shape({
    fullName: PropTypes.string,
  }).isRequired,
  reviewSubmitPagePosition: PropTypes.number.isRequired,
  isAdmin: PropTypes.bool.isRequired,
}

export default Review
