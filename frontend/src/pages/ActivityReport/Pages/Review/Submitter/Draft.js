import React, { useState, useContext } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment-timezone';
import { Redirect } from 'react-router-dom';
import { useFormContext } from 'react-hook-form/dist/index.ie11';
import {
  Form, Fieldset, Button, Alert, Dropdown,
} from '@trussworks/react-uswds';
import UserContext from '../../../../../UserContext';

import IncompletePages from './IncompletePages';
import FormItem from '../../../../../components/FormItem';
import HookFormRichEditor from '../../../../../components/HookFormRichEditor';
import MultiSelect from '../../../../../components/MultiSelect';
import ApproverStatusList from '../../components/ApproverStatusList';
import DismissingComponentWrapper from '../../../../../components/DismissingComponentWrapper';

const Draft = ({
  availableApprovers,
  onFormSubmit,
  onSaveForm,
  incompletePages,
  reportId,
  displayId,
  approverStatusList,
  lastSaveTime,
  creatorRole,
}) => {
  const {
    watch, handleSubmit, control, register,
  } = useFormContext();
  const hasIncompletePages = incompletePages.length > 0;
  const [justSubmitted, updatedJustSubmitted] = useState(false);
  const [showSavedDraft, updateShowSavedDraft] = useState(false);

  const { user } = useContext(UserContext);

  const completeUserRoles = () => {
    // If removed user role is selected should we add it?
    // We need to consider this case for a report that gets Unlocked.
    const completeRoleList = [...user.role];
    if (creatorRole) {
      const indexOfRole = completeRoleList.indexOf(creatorRole);
      if (indexOfRole === -1) {
        completeRoleList.push(creatorRole);
      }
    }
    return completeRoleList.sort();
  };

  const onSubmit = (e) => {
    if (!hasIncompletePages) {
      onFormSubmit(e);
      updatedJustSubmitted(true);
    }
  };

  const watchTextValue = watch('additionalNotes');
  const textAreaClass = watchTextValue !== '' ? 'yes-print' : 'no-print';

  // NOTE: This is only an estimate of which timezone the user is in.
  // Not guaranteed to be 100% correct but is "good enough"
  // https://momentjs.com/timezone/docs/#/using-timezones/guessing-user-timezone/
  const timezone = moment.tz.guess();
  const time = moment().tz(timezone).format('MM/DD/YYYY [at] h:mm a z');
  const message = {
    time,
    reportId,
    displayId,
    status: 'submitted',
  };

  return (
    <>
      {justSubmitted && <Redirect to={{ pathname: '/activity-reports', state: { message } }} />}
      <h2>Submit Report</h2>
      <Form className="smart-hub--form-large" onSubmit={handleSubmit(onSubmit)}>
        {
          user && user.role.length > 1
            ? (
              <Fieldset className="smart-hub--report-legend margin-top-4" legend="Creator Role">
                <FormItem
                  label="Creator role"
                  name="creatorRole"
                  required
                >
                  <Dropdown
                    id="creatorRole"
                    name="creatorRole"
                    inputRef={register({ required: 'A creator role must be assigned to the report before submitting' })}
                  >
                    <option name="default" value="" disabled>- Select -</option>
                    {completeUserRoles().map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </Dropdown>
                </FormItem>
              </Fieldset>
            )
            : null
        }
        <Fieldset className="smart-hub--report-legend margin-top-4" legend="Additional Notes">
          <FormItem
            label="Creator notes"
            name="additionalNotes"
            required={false}
          >
            <div className={`margin-top-1 ${textAreaClass}`}>
              <HookFormRichEditor ariaLabel="Additional notes" name="additionalNotes" id="additionalNotes" />
            </div>
          </FormItem>
        </Fieldset>
        <Fieldset className="smart-hub--report-legend margin-top-4" legend="Review and submit report">
          <p className="margin-top-4">
            Submitting this form for approval means that you will no longer be in draft
            mode. Please review all information in each section before submitting to your
            manager(s) for approval.
          </p>
          <FormItem
            label="Approving manager"
            name="approvers"
          >
            <MultiSelect
              id="approvingManagerId"
              name="approvers"
              control={control}
              valueProperty="User.id"
              labelProperty="User.fullName"
              simple={false}
              required="At least one manager must be assigned to the report before submitting"
              options={availableApprovers.map((a) => ({ value: a.id, label: a.name }))}
              inputRef={register({ required: true })}
            />
          </FormItem>
        </Fieldset>
        {hasIncompletePages && <IncompletePages incompletePages={incompletePages} />}
        <div className="margin-top-3">
          <ApproverStatusList approverStatus={approverStatusList} />
        </div>
        <Button
          outline
          type="button"
          onClick={() => {
            onSaveForm(false);
            updateShowSavedDraft(true);
          }}
        >
          Save Draft
        </Button>
        <Button type="submit">Submit for approval</Button>
      </Form>
      <DismissingComponentWrapper
        shown={showSavedDraft}
        updateShown={updateShowSavedDraft}
      >
        {lastSaveTime && (
          <Alert id="reviewSubmitSaveAlert" className="margin-top-3 maxw-mobile-lg" noIcon slim type="success">
            Draft saved on
            {' '}
            {lastSaveTime.format('MM/DD/YYYY [at] h:mm a z')}
          </Alert>
        )}
      </DismissingComponentWrapper>
    </>
  );
};

Draft.propTypes = {
  onSaveForm: PropTypes.func.isRequired,
  availableApprovers: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
  })).isRequired,
  onFormSubmit: PropTypes.func.isRequired,
  incompletePages: PropTypes.arrayOf(PropTypes.string).isRequired,
  reportId: PropTypes.number.isRequired,
  displayId: PropTypes.string.isRequired,
  approverStatusList: PropTypes.arrayOf(PropTypes.shape({
    approver: PropTypes.string,
    status: PropTypes.string,
  })).isRequired,
  lastSaveTime: PropTypes.instanceOf(moment).isRequired,
  creatorRole: PropTypes.string.isRequired,
};

export default Draft;
