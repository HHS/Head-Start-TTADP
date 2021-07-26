import React from 'react';
import PropTypes from 'prop-types';
import { useFormContext } from 'react-hook-form/dist/index.ie11';
import _ from 'lodash';
import {
  Dropdown, Form, Label, Fieldset, Button,
} from '@trussworks/react-uswds';
import { Editor } from 'react-draft-wysiwyg';

import { managerReportStatuses } from '../../../../../Constants';
import { getEditorState } from '../../../../../utils';
import FormItem from '../../../../../components/FormItem';
import HookFormRichEditor from '../../../../../components/HookFormRichEditor';
import ApproverStatusList from '../../components/ApproverStatusList';

const Review = ({
  additionalNotes,
  onFormReview,
  approverStatusList,
}) => {
  const { handleSubmit, register, watch } = useFormContext();
  const watchTextValue = watch('managerNotes');
  const textAreaClass = watchTextValue !== '' ? 'yes-print' : 'no-print';

  const defaultEditorState = getEditorState(additionalNotes || 'No creator notes');

  return (
    <>
      <h2>Review and approve report</h2>
      <div className="smart-hub--creator-notes" aria-label="additionalNotes">
        <p>
          <span className="text-bold">Creator notes</span>
        </p>
        <Editor readOnly toolbarHidden defaultEditorState={defaultEditorState} />
      </div>
      <Form className="smart-hub--form-large" onSubmit={handleSubmit(onFormReview)}>
        <Fieldset className="smart-hub--report-legend margin-top-4" legend="Review and submit report">
          <Label htmlFor="managerNotes">Manager notes</Label>
          <div className={`margin-top-1 ${textAreaClass}`}>
            <HookFormRichEditor ariaLabel="Manager notes" id="managerNotes" name="managerNotes" />
          </div>
        </Fieldset>
        <FormItem
          name="status"
          label="Choose report status"
          className="margin-bottom-3"
        >
          <Dropdown id="status" name="status" defaultValue="" inputRef={register({ required: true })}>
            <option name="default" value="" disabled hidden>- Select -</option>
            {managerReportStatuses.map((status) => (
              <option key={status} value={status}>{_.startCase(status)}</option>
            ))}
          </Dropdown>
        </FormItem>
        <ApproverStatusList approverStatus={approverStatusList} />
        <Button type="submit">Submit</Button>
      </Form>
    </>
  );
};

Review.propTypes = {
  additionalNotes: PropTypes.string.isRequired,
  onFormReview: PropTypes.func.isRequired,
  approverStatusList: PropTypes.arrayOf(PropTypes.shape({
    approver: PropTypes.string,
    status: PropTypes.string,
  })).isRequired,
};

export default Review;
