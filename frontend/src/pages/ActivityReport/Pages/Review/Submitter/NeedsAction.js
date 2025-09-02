import React, { useContext, useState } from 'react';
import moment from 'moment';
import PropTypes from 'prop-types';
import {
  FormGroup, Button, Fieldset, Dropdown, ErrorMessage,
} from '@trussworks/react-uswds';
import { useFormContext } from 'react-hook-form';
import { useHistory } from 'react-router';
import { Accordion } from '../../../../../components/Accordion';
import RichEditor from '../../../../../components/RichEditor';
import ApproverSelect from './components/ApproverSelect';
import FormItem from '../../../../../components/FormItem';
import ApproverStatusList from '../../components/ApproverStatusList';
import DisplayApproverNotes from '../../components/DisplayApproverNotes';
import IncompletePages from '../../../../../components/IncompletePages';
import UserContext from '../../../../../UserContext';
import IndicatesRequiredField from '../../../../../components/IndicatesRequiredField';
import MissingCitationAlerts from '../../components/MissingCitationAlerts';

const NeedsAction = ({
  additionalNotes,
  onSubmit,
  incompletePages,
  approverStatusList,
  creatorRole,
  displayId,
  reportId,
  availableApprovers,
  reviewItems,
  grantsMissingMonitoring,
  grantsMissingCitations,
}) => {
  const hasIncompletePages = incompletePages.length > 0;
  const { user } = useContext(UserContext);
  const userHasOneRole = user && user.roles && user.roles.length === 1;
  const [submitCR, setSubmitCR] = useState(!creatorRole && userHasOneRole ? user.roles[0] : creatorRole || '');
  const [creatorNotes, setCreatorNotes] = useState(additionalNotes);
  const [showCreatorRoleError, setShowCreatorRoleError] = useState(false);
  const history = useHistory();
  const { watch } = useFormContext();

  const approvers = watch('approvers');

  const submit = async () => {
    const hasCitationIssues = grantsMissingMonitoring.length
    || grantsMissingCitations.length;

    if (!submitCR) {
      setShowCreatorRoleError(true);
    } else if (!hasIncompletePages && !hasCitationIssues) {
      await onSubmit({
        additionalNotes: creatorNotes,
        creatorRole: submitCR,
        approvers,
      });

      // if successful, we should redirect to
      // the landing page with the message saying
      // we successfully resubmitted
      const timezone = moment.tz.guess();
      const time = moment().tz(timezone).format('MM/DD/YYYY [at] h:mm a z');
      const message = {
        time,
        reportId,
        displayId,
        status: 'submitted',
      };

      history.push('/activity-reports', { message });
    }
  };

  const creatorRoleChange = (e) => {
    setSubmitCR(e.target.value);
    setShowCreatorRoleError(false);
  };

  return (
    <>
      <h2 className="font-family-serif">Review and submit</h2>
      <IndicatesRequiredField />
      {reviewItems && reviewItems.length > 0 && (
      <Accordion bordered items={reviewItems} multiselectable />
      )}
      <div className="margin-bottom-2">
        {
          !userHasOneRole
            ? (
              <>
                { /* eslint-disable-next-line jsx-a11y/label-has-associated-control */ }
                <label htmlFor="creatorRole" className="text-bold">Creator role</label>
                <span className="smart-hub--form-required"> (Required)</span>
                <FormGroup error={showCreatorRoleError}>
                  <Fieldset>
                    {showCreatorRoleError
                      ? <ErrorMessage>Please select a creator role.</ErrorMessage> : null}
                    <Dropdown
                      id="creatorRole"
                      name="creatorRole"
                      value={submitCR}
                      onChange={creatorRoleChange}
                    >
                      <option name="default" value="" disabled hidden>- Select -</option>
                      {user.roles.map(({ fullName: role }) => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </Dropdown>
                  </Fieldset>
                </FormGroup>
              </>
            )
            : null
        }
      </div>

      <Fieldset
        className="smart-hub--report-legend margin-top-4 smart-hub--report-legend__no-legend-margin-top no-print"
        legend="Additional Notes"
      >
        <FormItem
          label="Creator notes"
          name="additionalNotes"
          required={false}
        >
          <div className="margin-top-1">
            <RichEditor
              value={creatorNotes}
              onChange={setCreatorNotes}
            />
          </div>
        </FormItem>
      </Fieldset>

      <div className="smart-hub--creator-notes margin-top-2">
        <p>
          <span className="text-bold">Manager notes</span>
        </p>
        <DisplayApproverNotes approverStatusList={approverStatusList} />
      </div>
      {hasIncompletePages && <IncompletePages incompletePages={incompletePages} />}
      <div className="margin-top-3">
        <ApproverStatusList approverStatus={approverStatusList} />
      </div>
      <div className="margin-top-3">
        <FormItem
          label="Add additional approvers"
          name="approvers"
          htmlFor="approvers"
        >
          <ApproverSelect
            name="approvers"
            valueProperty="user.id"
            labelProperty="user.fullName"
            options={availableApprovers.map((a) => ({ value: a.id, label: a.name }))}
            lockExistingValues
          />
        </FormItem>
        <MissingCitationAlerts
          reportId={reportId}
          grantsMissingMonitoring={grantsMissingMonitoring}
          grantsMissingCitations={grantsMissingCitations}
        />
      </div>
      <div className="margin-top-3">
        <Button className="margin-bottom-4" onClick={submit}>Update report</Button>
      </div>
    </>
  );
};

NeedsAction.propTypes = {
  additionalNotes: PropTypes.string,
  onSubmit: PropTypes.func.isRequired,
  incompletePages: PropTypes.arrayOf(PropTypes.string).isRequired,
  approverStatusList: PropTypes.arrayOf(PropTypes.shape({
    approver: PropTypes.string,
    status: PropTypes.string,
  })).isRequired,
  availableApprovers: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
  })).isRequired,
  creatorRole: PropTypes.string,
  displayId: PropTypes.string.isRequired,
  reportId: PropTypes.string.isRequired,
  reviewItems: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    content: PropTypes.node.isRequired,
  })).isRequired,
  grantsMissingMonitoring: PropTypes.arrayOf(PropTypes.string).isRequired,
  grantsMissingCitations: PropTypes.arrayOf(PropTypes.string).isRequired,
};

NeedsAction.defaultProps = {
  additionalNotes: '',
  creatorRole: null,
};

export default NeedsAction;
