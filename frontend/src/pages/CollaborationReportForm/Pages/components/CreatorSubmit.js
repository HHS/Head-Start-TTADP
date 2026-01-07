import React from 'react';
import {
  Form,
  Fieldset,
  Button,
  Alert,
} from '@trussworks/react-uswds';
import { useFormContext } from 'react-hook-form';
import IncompletePages from '../../../../components/IncompletePages';
import FormItem from '../../../../components/FormItem';
import ApproverSelect from '../../../ActivityReport/Pages/Review/Submitter/components/ApproverSelect';
import DismissingComponentWrapper from '../../../../components/DismissingComponentWrapper';

import { reviewPageDefaultProps, reviewPagePropType } from './constants';
import CreatorNeedsAction from './CreatorNeedsAction';

const PREVIOUS_POSITION = 3;
const path = 'review';

export default function CreatorSubmit({
  hasIncompletePages,
  incompletePages,
  isCreator,
  isCollaborator,
  isSubmitted,
  onFormReview,
  availableApprovers,
  onUpdatePage,
  onSaveDraft,
  isNeedsAction,
  dateSubmitted,
  otherManagerNotes,
  hasReviewNote,
  hasBeenReviewed,
  thisApprovingManager,
  approverStatusList,
  onSubmit,
  draftValues,
}) {
  const { handleSubmit } = useFormContext();
  const { showSavedDraft, updateShowSavedDraft, lastSaveTime } = draftValues;

  const DraftAlert = () => (
    <DismissingComponentWrapper
      shown={showSavedDraft}
      updateShown={updateShowSavedDraft}
      hideFromScreenReader={false}
    >
      {lastSaveTime && (
      <Alert className="margin-top-3 maxw-mobile-lg" noIcon slim type="success" aria-live="off">
        Draft saved on
        {' '}
        {/* eslint-disable-next-line react/prop-types */}
        {lastSaveTime.format('MM/DD/YYYY [at] h:mm a z')}
      </Alert>
      )}
    </DismissingComponentWrapper>
  );

  if (isNeedsAction) {
    return (
      <CreatorNeedsAction
        onFormReview={onFormReview}
        availableApprovers={availableApprovers}
        isCreator={isCreator}
        isSubmitted={isSubmitted}
        hasIncompletePages={hasIncompletePages}
        incompletePages={incompletePages}
        onUpdatePage={onUpdatePage}
        onSaveDraft={onSaveDraft}
        isNeedsAction={isNeedsAction}
        dateSubmitted={dateSubmitted}
        thisApprovingManager={thisApprovingManager}
        otherManagerNotes={otherManagerNotes}
        hasBeenReviewed={hasBeenReviewed}
        hasReviewNote={hasReviewNote}
        approverStatusList={approverStatusList}
        isCollaborator={isCollaborator}
        onSubmit={onSubmit}
      />
    );
  }

  return (
    <>
      {hasIncompletePages && <IncompletePages incompletePages={incompletePages} />}
      <Form className="smart-hub--form-large" onSubmit={handleSubmit(onSubmit)}>
        {((isCreator || isCollaborator) && !isSubmitted) && (
        <div className="margin-bottom-3">
          <Fieldset className="smart-hub--report-legend margin-top-4">
            <FormItem
              label="Approving manager"
              name="approvers"
            >
              <ApproverSelect
                name="approvers"
                valueProperty="user.id"
                labelProperty="user.fullName"
                options={(availableApprovers || []).map((a) => ({ value: a.id, label: a.name }))}
              />
            </FormItem>
          </Fieldset>
        </div>
        )}

        <DraftAlert />

        <Button type="submit">Submit for approval</Button>
        <Button id={`draft-${path}-save-draft`} className="usa-button--outline" type="button" onClick={() => onSaveDraft()}>Save draft</Button>
        <Button id={`draft-${path}-back`} outline type="button" onClick={() => { onUpdatePage(PREVIOUS_POSITION); }}>Back</Button>
      </Form>
    </>
  );
}

CreatorSubmit.propTypes = reviewPagePropType;
CreatorSubmit.defaultProps = reviewPageDefaultProps;
