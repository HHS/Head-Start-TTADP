import React, { useContext } from 'react';
import moment from 'moment';
import PropTypes from 'prop-types';
import { useFormContext } from 'react-hook-form';
import _ from 'lodash';
import {
  Dropdown, Form, Label, Fieldset, Button,
} from '@trussworks/react-uswds';
import IncompletePages from '../../../../components/IncompletePages';
import { Accordion } from '../../../../components/Accordion';
import { managerReportStatuses, DATE_DISPLAY_FORMAT } from '../../../../Constants';
import FormItem from '../../../../components/FormItem';
import HookFormRichEditor from '../../../../components/HookFormRichEditor';
import ApproverStatusList from '../../../ActivityReport/Pages/components/ApproverStatusList';
import UserContext from '../../../../UserContext';
import IndicatesRequiredField from '../../../../components/IndicatesRequiredField';
import ApproverSelect from '../../../ActivityReport/Pages/Review/Submitter/components/ApproverSelect';
import DisplayApproverNotes from '../../../ActivityReport/Pages/components/DisplayApproverNotes';
import ApproverReview from './ApproverReview';
import CreatorSubmit from './CreatorSubmit';

const Review = ({
  onFormReview,
  approverStatusList,
  pendingOtherApprovals,
  dateSubmitted,
  pages,
  availableApprovers,
  reviewItems,
  isCreator,
  isSubmitted,
  // isApproved,
  // isNeedsAction,
  // isApprover,
}) => {

  const FormComponent = isSubmitted ? ApproverReview : CreatorSubmit;

  const { handleSubmit, register } = useFormContext();
  const { user } = useContext(UserContext);

  const otherManagerNotes = approverStatusList
    ? approverStatusList.filter((a) => a.user.id !== user.id) : null;
  const thisApprovingManager = approverStatusList
    ? approverStatusList.filter((a) => a.user.id === user.id) : null;
  const hasBeenReviewed = thisApprovingManager
    && thisApprovingManager.length > 0
    && thisApprovingManager[0].status !== null;
  const hasReviewNote = thisApprovingManager
    && thisApprovingManager.length > 0
    && thisApprovingManager[0].note;

  const filtered = pages.filter((p) => !(p.state === 'Complete' || p.review));
  const incompletePages = filtered.map((f) => f.label);
  const hasIncompletePages = incompletePages.length > 0;
  const formattedDateSubmitted = dateSubmitted ? moment(dateSubmitted).format(DATE_DISPLAY_FORMAT) : '';

  const submitButtonText = isSubmitted ? 'Submit for approval' : 'Submit report';

  return (
    <>
      <h2 className="font-family-serif">{pendingOtherApprovals ? 'Pending other approvals' : 'Review and approve'}</h2>
      <IndicatesRequiredField />
      {reviewItems && reviewItems.length > 0 && (
        <div className="margin-bottom-3">
          <Accordion bordered items={reviewItems} multiselectable />
        </div>
      )}

      <FormComponent
        hasIncompletePages={hasIncompletePages}
        incompletePages={incompletePages}
      />

      {
        otherManagerNotes && otherManagerNotes.length > 0 && (
          <div className="smart-hub--creator-notes margin-top-2">
            <p>
              <span className="text-bold">Manager notes</span>
            </p>
            <DisplayApproverNotes approverStatusList={otherManagerNotes} />
          </div>
        )
      }

      <Form className="smart-hub--form-large" onSubmit={handleSubmit(onFormReview)}>
        {(isCreator && !isSubmitted) && (
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
                options={availableApprovers.map((a) => ({ value: a.id, label: a.name }))}
              />
            </FormItem>
          </Fieldset>
        </div>
        )}
        <Fieldset className="smart-hub--report-legend margin-top-4 smart-hub--report-legend__no-legend-margin-top">
          <Label htmlFor="note">Add manager notes</Label>
          <div className="margin-top-1">
            <HookFormRichEditor
              ariaLabel="Manager notes"
              id="note"
              name="note"
              defaultValue={hasReviewNote
                ? thisApprovingManager[0].note : null}
            />
          </div>
        </Fieldset>

          <>
            {
            dateSubmitted
              ? (
                <>
                  <p className="source-sans-pro text-bold margin-top-3 margin-bottom-0">Date Submitted</p>
                  <p className="margin-top-0">{formattedDateSubmitted}</p>
                </>
              )
              : null
            }
            <FormItem
              name="status"
              label="Choose approval status"
              className="margin-bottom-3"
            >
              <Dropdown
                id="status"
                name="status"
                defaultValue={hasBeenReviewed
                  ? thisApprovingManager[0].status : ''}
                inputRef={register({ required: true })}
              >
                <option name="default" value="" disabled hidden>- Select -</option>
                {managerReportStatuses.map((status) => (
                  <option key={status} value={status}>{_.startCase(status)}</option>
                ))}
              </Dropdown>
            </FormItem>

          </>
        {/* ) : (
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
                  options={availableApprovers.map((a) => ({ value: a.id, label: a.name }))}
                />
              </FormItem>
            </Fieldset>
          </div>
        )} */}

        {/* <ApproverStatusList approverStatus={approverStatusList} /> */}
        
        <Button disabled={hasIncompletePages} type="submit">{ submitButtonText }</Button>
      </Form>
    </>
  );
};

Review.propTypes = {
  onFormReview: PropTypes.func.isRequired,
  dateSubmitted: PropTypes.string,
  pendingOtherApprovals: PropTypes.bool,
  approverStatusList: PropTypes.arrayOf(PropTypes.shape({
    approver: PropTypes.string,
    status: PropTypes.string,
  })),
  pages: PropTypes.arrayOf(PropTypes.shape({
    state: PropTypes.string,
    review: PropTypes.bool,
    label: PropTypes.string,
  })).isRequired,
  availableApprovers: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
  })).isRequired,
  reviewItems: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    content: PropTypes.node.isRequired,
  })).isRequired,
  isCreator: PropTypes.bool.isRequired,
  isSubmitted: PropTypes.bool.isRequired,
  isApproved: PropTypes.bool.isRequired,
  isNeedsAction: PropTypes.bool.isRequired,
  isApprover: PropTypes.bool.isRequired,
};

Review.defaultProps = {
  pendingOtherApprovals: false,
  approverStatusList: [],
  dateSubmitted: null,
};

export default Review;
