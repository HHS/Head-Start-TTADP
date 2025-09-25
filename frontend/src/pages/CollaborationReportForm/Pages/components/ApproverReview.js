import React from 'react';
import moment from 'moment';
import { useFormContext } from 'react-hook-form';
import _ from 'lodash';
import {
  Dropdown, Form, Label, Fieldset, Button,
} from '@trussworks/react-uswds';
import { managerReportStatuses, DATE_DISPLAY_FORMAT } from '../../../../Constants';
import FormItem from '../../../../components/FormItem';
import HookFormRichEditor from '../../../../components/HookFormRichEditor';
import ApproverStatusList from '../../../ActivityReport/Pages/components/ApproverStatusList';
import DisplayApproverNotes from '../../../ActivityReport/Pages/components/DisplayApproverNotes';
import { reviewPageDefaultProps, reviewPagePropType } from './constants';

export default function ApproverReview({
  hasIncompletePages,
  onFormReview,
  dateSubmitted,
  otherManagerNotes,
  hasReviewNote,
  hasBeenReviewed,
  thisApprovingManager,
  approverStatusList,
}) {
  const { handleSubmit, register } = useFormContext();
  const formattedDateSubmitted = dateSubmitted ? moment(dateSubmitted).format(DATE_DISPLAY_FORMAT) : '';

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

        <ApproverStatusList approverStatus={approverStatusList} />

        <Button disabled={hasIncompletePages} type="submit">Submit report</Button>
      </Form>
    </>
  );
}

ApproverReview.propTypes = reviewPagePropType;
ApproverReview.defaultPropts = reviewPageDefaultProps;
