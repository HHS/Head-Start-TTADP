import React, { useState, useContext } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment-timezone';
import { Redirect } from 'react-router-dom';
import { useFormContext } from 'react-hook-form';
import {
  Form, Fieldset, Button, Alert, Dropdown,
} from '@trussworks/react-uswds';
import UserContext from '../../../../../UserContext';
import { Accordion } from '../../../../../components/Accordion';
import IncompletePages from '../../../../../components/IncompletePages';
import SomeGoalsHaveNoPromptResponse from '../SomeGoalsHaveNoPromptResponse';
import FormItem from '../../../../../components/FormItem';
import HookFormRichEditor from '../../../../../components/HookFormRichEditor';
import ApproverStatusList from '../../components/ApproverStatusList';
import DismissingComponentWrapper from '../../../../../components/DismissingComponentWrapper';
import NetworkContext from '../../../../../NetworkContext';
import ConnectionError from '../../../../../components/ConnectionError';
import ApproverSelect from './components/ApproverSelect';
import MissingCitationAlerts from '../../components/MissingCitationAlerts';
import IndicatesRequiredField from '../../../../../components/IndicatesRequiredField';
import './Draft.scss';

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
  grantsMissingMonitoring,
  grantsMissingCitations,
  reviewItems,
}) => {
  const {
    watch,
    handleSubmit,
    register,
  } = useFormContext();
  const hasIncompletePages = incompletePages.length > 0;
  const [justSubmitted, updatedJustSubmitted] = useState(false);
  const [showSavedDraft, updateShowSavedDraft] = useState(false);
  const { connectionActive, localStorageAvailable } = useContext(NetworkContext);
  const promptsMissingResponses = [];
  const goalsMissingResponses = [];

  const goalsAndObjectives = watch('goalsAndObjectives');
  const regionId = watch('regionId');

  const allGoalsHavePromptResponses = (() => {
    const curatedGoals = (goalsAndObjectives || []).filter(
      (goal) => goal.prompts && goal.prompts.length > 0,
    );
    if (!curatedGoals.length) return true;

    return curatedGoals.every((goal) => goal.prompts
      .every((prompt) => {
        if (!prompt.response || !prompt.response.length) {
          promptsMissingResponses.push(prompt.title);
          goalsMissingResponses.push(goal);
        }

        return prompt.response && prompt.response.length > 0;
      }));
  })();

  const { user } = useContext(UserContext);

  const completeUserRoles = () => {
    // If removed user role is selected we need to add it.
    const completeRoleList = user.roles.map((r) => r.fullName);
    if (creatorRole) {
      const indexOfRole = completeRoleList.indexOf(creatorRole);
      if (indexOfRole === -1) {
        completeRoleList.push(creatorRole);
      }
    }
    return completeRoleList.sort();
  };

  const canSubmitReport = allGoalsHavePromptResponses
  && !hasIncompletePages
  && !grantsMissingMonitoring.length
  && !grantsMissingCitations.length;

  const onSubmit = (e) => {
    if (canSubmitReport) {
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

  const showRolesDropdown = user && user.roles && user.roles.length > 1;

  return (
    <>
      {justSubmitted && <Redirect to={{ pathname: '/activity-reports', state: { message } }} />}
      <h2 className="font-family-serif">Review and submit</h2>
      <IndicatesRequiredField className="margin-bottom-0 margin-top-0" />
      <p className="usa-prose margin-top-2 margin-bottom-5">
        Review the information in each section before submitting for approval.
        <br />
        Once submitted, you will no longer be able to edit the report.
      </p>
      {reviewItems && reviewItems.length > 0 && (
      <Accordion bordered items={reviewItems} multiselectable />
      )}
      <Form className="smart-hub--form-large smart-hub--form__draft smart-hub--form" onSubmit={handleSubmit(onSubmit)}>
        {
          showRolesDropdown
            ? (
              <Fieldset className="smart-hub--report-legend margin-top-4 smart-hub--report-legend__no-legend-margin-top" legend="Creator Role">
                <FormItem
                  label="Creator role"
                  name="creatorRole"
                  required
                >
                  <Dropdown
                    id="creatorRole"
                    name="creatorRole"
                    inputRef={register({ required: 'Select one' })}
                  >
                    <option name="default" value="" disabled hidden>- Select -</option>
                    {completeUserRoles().map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </Dropdown>
                </FormItem>
              </Fieldset>
            )
            : null
        }
        <Fieldset className={`smart-hub--report-legend margin-top-0 ${!showRolesDropdown ? 'smart-hub--report-legend__no-legend-margin-top' : ''}`}>
          <FormItem
            label="Creator notes"
            name="additionalNotes"
            required={false}
            formGroupClassName="margin-top-4"
          >
            <div className={`margin-top-1 ${textAreaClass}`}>
              <HookFormRichEditor ariaLabel="Additional notes" name="additionalNotes" id="additionalNotes" />
            </div>
          </FormItem>
        </Fieldset>
        <Fieldset className="smart-hub--report-legend">
          { !connectionActive && (
            <ConnectionError />
          )}
          <FormItem
            label="Approving manager"
            name="approvers"
            formGroupClassName="margin-top-4"
          >
            <ApproverSelect
              name="approvers"
              valueProperty="user.id"
              labelProperty="user.fullName"
              options={availableApprovers.map((a) => ({ value: a.id, label: a.name }))}
            />
          </FormItem>
        </Fieldset>
        <MissingCitationAlerts
          reportId={reportId}
          grantsMissingMonitoring={grantsMissingMonitoring}
          grantsMissingCitations={grantsMissingCitations}
        />
        {hasIncompletePages && <IncompletePages incompletePages={incompletePages} />}
        {!allGoalsHavePromptResponses && (
        <SomeGoalsHaveNoPromptResponse
          regionId={regionId}
          promptsMissingResponses={promptsMissingResponses}
          goalsMissingResponses={goalsMissingResponses}
          onSaveDraft={onSaveForm}
        />
        )}
        <div className={approverStatusList && approverStatusList.length > 0 ? 'margin-top-3' : 'margin-top-0'}>
          <ApproverStatusList approverStatus={approverStatusList} />
        </div>
        <Button className="draft-button-margin" disabled={!connectionActive} id="draft-review-submit" type="submit">Submit for approval</Button>
        { !connectionActive && (
        <Alert type="warning" noIcon>
          There&#39;s an issue with your connection.
          <br />
          { localStorageAvailable ? 'Your work is saved on this computer.' : '' }
          {' '}
          <br />
          If you continue to have problems,
          {' '}
          <a href="https://app.smartsheetgov.com/b/form/f0b4725683f04f349a939bd2e3f5425a">contact us</a>
          .
        </Alert>
        )}
        <Button
          id="draft-review-save-draft"
          outline
          type="button"
          className="draft-button-margin"
          onClick={async () => {
            await onSaveForm(false);
            updateShowSavedDraft(true);
          }}
        >
          Save Draft
        </Button>
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
  lastSaveTime: PropTypes.instanceOf(moment),
  creatorRole: PropTypes.string.isRequired,
  grantsMissingMonitoring: PropTypes.arrayOf(PropTypes.string).isRequired,
  grantsMissingCitations: PropTypes.arrayOf(PropTypes.string).isRequired,
  reviewItems: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.string,
    content: PropTypes.node,
  })).isRequired,
};

Draft.defaultProps = {
  lastSaveTime: undefined,
};

export default Draft;
