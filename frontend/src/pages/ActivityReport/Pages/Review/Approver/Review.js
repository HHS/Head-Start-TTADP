import React, { useContext } from 'react';
import moment from 'moment';
import PropTypes from 'prop-types';
import { useFormContext } from 'react-hook-form/dist/index.ie11';
import _ from 'lodash';
import {
  Dropdown, Form, Label, Fieldset, Button,
} from '@trussworks/react-uswds';
import { Editor } from 'react-draft-wysiwyg';
import IncompletePages from '../IncompletePages';
import { managerReportStatuses, DATE_DISPLAY_FORMAT } from '../../../../../Constants';
import { getEditorState } from '../../../../../utils';
import FormItem from '../../../../../components/FormItem';
import HookFormRichEditor from '../../../../../components/HookFormRichEditor';
import ApproverStatusList from '../../components/ApproverStatusList';
import DisplayApproverNotes from '../../components/DisplayApproverNotes';
import UserContext from '../../../../../UserContext';
import IndicatesRequiredField from '../../../../../components/IndicatesRequiredField';

const Review = ({
  additionalNotes,
  onFormReview,
  approverStatusList,
  pendingOtherApprovals,
  dateSubmitted,
  pages,
  showDraftViewForApproverAndCreator,
}) => {
  const { handleSubmit, register, watch } = useFormContext();
  const watchTextValue = watch('note');
  const textAreaClass = watchTextValue !== '' ? 'yes-print' : 'no-print';
  const { user } = useContext(UserContext);

  const defaultEditorState = getEditorState(additionalNotes || 'No creator notes');
  const otherManagerNotes = approverStatusList
    ? approverStatusList.filter((a) => a.User.id !== user.id) : null;
  const thisApprovingManager = approverStatusList
    ? approverStatusList.filter((a) => a.User.id === user.id) : null;
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
  return (
    <>
      <h2>{pendingOtherApprovals ? 'Pending other approvals' : 'Review and approve report'}</h2>
      <IndicatesRequiredField />
      <div className="smart-hub--creator-notes" aria-label="additionalNotes">
        <p>
          <span className="text-bold">Creator notes</span>
        </p>
        <Editor readOnly toolbarHidden defaultEditorState={defaultEditorState} />
      </div>
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
        <Fieldset className="smart-hub--report-legend margin-top-4 smart-hub--report-legend__no-legend-margin-top" legend="Review and submit report">
          <Label htmlFor="note">Add manager notes</Label>
          <div className={`margin-top-1 ${textAreaClass}`}>
            <HookFormRichEditor
              ariaLabel="Manager notes"
              id="note"
              name="note"
              defaultValue={hasReviewNote
                ? thisApprovingManager[0].note : null}
            />
          </div>
        </Fieldset>
        { !showDraftViewForApproverAndCreator ? (
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
              label="Choose report status"
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
        ) : <div className="margin-bottom-3" />}
        <ApproverStatusList approverStatus={approverStatusList} />
        {hasIncompletePages && <IncompletePages incompletePages={incompletePages} />}
        <Button disabled={hasIncompletePages} type="submit">{hasBeenReviewed ? 'Re-submit' : 'Submit'}</Button>
      </Form>
    </>
  );
};

Review.propTypes = {
  additionalNotes: PropTypes.string,
  onFormReview: PropTypes.func.isRequired,
  dateSubmitted: PropTypes.string,
  pendingOtherApprovals: PropTypes.bool,
  approverStatusList: PropTypes.arrayOf(PropTypes.shape({
    approver: PropTypes.string,
    status: PropTypes.string,
  })),
  showDraftViewForApproverAndCreator: PropTypes.bool.isRequired,
  pages: PropTypes.arrayOf(PropTypes.shape({
    state: PropTypes.string,
    review: PropTypes.bool,
    label: PropTypes.string,
  })).isRequired,
};

Review.defaultProps = {
  pendingOtherApprovals: false,
  additionalNotes: '',
  approverStatusList: [],
  dateSubmitted: null,
};

export default Review;
