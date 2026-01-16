import React from 'react';
import moment from 'moment';
import { useFormContext } from 'react-hook-form';
import _ from 'lodash';
import {
  Dropdown, Form, Label, Fieldset, Button,
} from '@trussworks/react-uswds';
import { APPROVER_STATUSES } from '@ttahub/common/src/constants';
import { managerReportStatuses, DATE_DISPLAY_FORMAT } from '../../../../Constants';
import FormItem from '../../../../components/FormItem';
import HookFormRichEditor from '../../../../components/HookFormRichEditor';
import ApproverStatusList from '../../../ActivityReport/Pages/components/ApproverStatusList';
import DisplayApproverNotes from '../../../ActivityReport/Pages/components/DisplayApproverNotes';
import { reviewPageDefaultProps, reviewPagePropType } from './constants';

export default function ApproverReview({
  onFormReview,
  dateSubmitted,
  otherManagerNotes,
  hasReviewNote,
  hasBeenReviewed,
  thisApprovingManager,
  approverStatusList,
  isCreator,
}) {
  const { handleSubmit, register, watch } = useFormContext();
  const status = watch('status');

  const formattedDateSubmitted = dateSubmitted ? moment(dateSubmitted).format(DATE_DISPLAY_FORMAT) : '';
  const submitButtonLabel = isCreator ? 'Update report' : 'Submit';

  function sentenceCase(str) {
    const tempString = _.startCase(str);
    return tempString.charAt(0).toUpperCase() + tempString.slice(1).toLowerCase();
  }

  return (
    <>
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

        <>
          {
              dateSubmitted
                ? (
                  <div className="margin-bottom-4">
                    <p className="source-sans-pro text-bold margin-top-3 margin-bottom-0">Date submitted</p>
                    <p className="margin-top-0">{formattedDateSubmitted}</p>
                  </div>
                )
                : null
              }
          <FormItem
            name="status"
            label="Choose approval status"
            className="margin-bottom-4"
          >
            <Dropdown
              id="status"
              name="status"
              defaultValue={hasBeenReviewed
                ? thisApprovingManager[0].status : ''}
              inputRef={register({ required: true })}
            >
              <option name="default" value="" disabled hidden>- Select -</option>
              {managerReportStatuses.map((reportStatus) => (
                <option key={reportStatus} value={reportStatus}>
                  {sentenceCase(reportStatus)}
                </option>
              ))}
            </Dropdown>
          </FormItem>

          {(status === APPROVER_STATUSES.NEEDS_ACTION || thisApprovingManager) && (
          <Fieldset className="smart-hub--report-legend margin-bottom-4 smart-hub--report-legend__no-legend-margin-top">
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
          )}

        </>

        <p className="text-bold margin-bottom-2">Approval status</p>

        <ApproverStatusList approverStatus={approverStatusList} />

        <Button type="submit">{submitButtonLabel}</Button>
      </Form>
    </>
  );
}

ApproverReview.propTypes = reviewPagePropType;
ApproverReview.defaultProps = reviewPageDefaultProps;
