import React, { useContext } from 'react'
import PropTypes from 'prop-types'
import { Alert } from '@trussworks/react-uswds'
import { REPORT_STATUSES } from '@ttahub/common'
import formPages from './pages'
import Review from './components/Review'
import Container from '../../../components/Container'
import UserContext from '../../../UserContext'
import { draftValuesPropType } from './components/constants'

const ReviewSubmit = ({
  onReview,
  formData,
  error,
  isPendingApprover,
  availableApprovers,
  reviewItems,
  onUpdatePage,
  onSaveForm,
  onSaveDraft,
  onSubmit,
  draftValues,
}) => {
  const { calculatedStatus, submissionStatus, approvers, submittedAt, author, userId, collabReportSpecialists } = formData

  const { user } = useContext(UserContext)

  // The logic for redirecting users has been hoisted all the way up the
  // fetch at the top level CollaborationForm/index.js file

  // We only care if the report has been submitted
  // or if the current user is an approver, whether or not
  // the report has been approved

  // store some values for readability
  const isCreator = userId === user.id
  // eslint-disable-next-line max-len
  const isCollaborator = collabReportSpecialists?.some(({ specialistId }) => user.id === specialistId)
  const isSubmitted = submissionStatus === REPORT_STATUSES.SUBMITTED
  const isApproved = calculatedStatus === REPORT_STATUSES.APPROVED
  const isNeedsAction = calculatedStatus === REPORT_STATUSES.NEEDS_ACTION
  const isApprover = approvers && approvers.some((a) => a.user.id === user.id)

  const pendingOtherApprovals = (isNeedsAction || isSubmitted) && !isPendingApprover
  const pendingApprovalCount = approvers ? approvers.filter((a) => !a.status || a.status === 'needs_action').length : 0

  return (
    <>
      <Container skipTopPadding className="margin-bottom-0 padding-top-2 padding-bottom-5" skipBottomPadding paddingY={0}>
        {error && (
          <Alert noIcon className="margin-y-4" type="error">
            <b>Error</b>
            <br />
            {error}
          </Alert>
        )}

        <Review
          author={author}
          approvers={approvers}
          isCreator={isCreator}
          isSubmitted={isSubmitted}
          isApproved={isApproved}
          isNeedsAction={isNeedsAction}
          isApprover={isApprover}
          pendingOtherApprovals={pendingOtherApprovals}
          dateSubmitted={submittedAt}
          onFormReview={onReview}
          approverStatusList={approvers}
          pages={formPages}
          availableApprovers={availableApprovers}
          reviewItems={reviewItems}
          onSaveForm={onSaveForm}
          onSaveDraft={onSaveDraft}
          draftValues={draftValues}
          onSubmit={onSubmit}
          onUpdatePage={onUpdatePage}
          pendingApprovalCount={pendingApprovalCount}
          isCollaborator={isCollaborator}
        />
      </Container>
    </>
  )
}

ReviewSubmit.propTypes = {
  availableApprovers: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      name: PropTypes.string,
    })
  ).isRequired,
  onReview: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  error: PropTypes.string,
  isPendingApprover: PropTypes.bool.isRequired,
  formData: PropTypes.shape({
    userId: PropTypes.number,
    collabReportSpecialists: PropTypes.arrayOf(
      PropTypes.shape({
        specialistId: PropTypes.number,
      })
    ).isRequired,
    additionalNotes: PropTypes.string,
    calculatedStatus: PropTypes.string,
    submissionStatus: PropTypes.string,
    submittedAt: PropTypes.string,
    approvers: PropTypes.arrayOf(
      PropTypes.shape({
        status: PropTypes.string,
      })
    ),
    author: PropTypes.shape({
      name: PropTypes.string,
      fullName: PropTypes.string,
      id: PropTypes.number,
    }),
    id: PropTypes.number,
    displayId: PropTypes.string,
  }).isRequired,
  reviewItems: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      content: PropTypes.node.isRequired,
    })
  ).isRequired,
  onSaveForm: PropTypes.func.isRequired,
  onUpdatePage: PropTypes.func.isRequired,
  onSaveDraft: PropTypes.func.isRequired,
  draftValues: draftValuesPropType.isRequired,
}

ReviewSubmit.defaultProps = {
  error: '',
}

const reviewPage = {
  position: 4,
  review: true,
  label: 'Review and submit',
  path: 'review',
  render: (
    formData,
    onFormSubmit,
    additionalData,
    onReview,
    isApprover,
    isPendingApprover,
    onSave,
    navigatorPages,
    reportCreator,
    lastSaveTime,
    onUpdatePage,
    onSaveDraft,
    draftValues
  ) => (
    <ReviewSubmit
      availableApprovers={additionalData.approvers}
      onSubmit={onFormSubmit}
      onSaveForm={onSave}
      onSaveDraft={onSaveDraft}
      draftValues={draftValues}
      onUpdatePage={onUpdatePage}
      onReview={onReview}
      isApprover={isApprover}
      isPendingApprover={isPendingApprover}
      lastSaveTime={lastSaveTime}
      reviewItems={formPages.map((p) => ({
        id: p.path,
        title: p.label,
        content: p.reviewSection(),
      }))}
      formData={formData}
      pages={navigatorPages}
      reportCreator={reportCreator}
    />
  ),
}

export { ReviewSubmit }
export default reviewPage
