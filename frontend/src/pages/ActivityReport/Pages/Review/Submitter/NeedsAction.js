import React, { useContext, useState } from 'react';
import moment from 'moment';
import PropTypes from 'prop-types';
import {
  FormGroup, Button, Fieldset, Select, ErrorMessage,
} from '@trussworks/react-uswds';
import { useFormContext } from 'react-hook-form';
import { useNavigate } from 'react-router';
import RichEditor from '../../../../../components/RichEditor';
import ApproverSelect from './components/ApproverSelect';
import FormItem from '../../../../../components/FormItem';
import ApproverStatusList from '../../components/ApproverStatusList';
import DisplayApproverNotes from '../../components/DisplayApproverNotes';
import IncompletePages from '../IncompletePages';
import UserContext from '../../../../../UserContext';
import IndicatesRequiredField from '../../../../../components/IndicatesRequiredField';

const NeedsAction = ({
  additionalNotes,
  onSubmit,
  incompletePages,
  approverStatusList,
  creatorRole,
  displayId,
  reportId,
  availableApprovers,
}) => {
  const hasIncompletePages = incompletePages.length > 0;
  const { user } = useContext(UserContext);
  const userHasOneRole = user && user.roles && user.roles.length === 1;
  const [submitCR, setSubmitCR] = useState(!creatorRole && userHasOneRole ? user.roles[0] : creatorRole || '');
  const [creatorNotes, setCreatorNotes] = useState(additionalNotes);
  const [showCreatorRoleError, setShowCreatorRoleError] = useState(false);
  const history = useNavigate();
  const { watch } = useFormContext();

  const approvers = watch('approvers');

  const submit = async () => {
    if (!submitCR) {
      setShowCreatorRoleError(true);
    } else if (!hasIncompletePages) {
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
      <h2>Review and submit</h2>
      <IndicatesRequiredField />
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
                    <Select
                      id="creatorRole"
                      name="creatorRole"
                      value={submitCR}
                      onChange={creatorRoleChange}
                    >
                      <option name="default" value="" disabled hidden>- Select -</option>
                      {user.roles.map(({ fullName: role }) => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </Select>
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
};

NeedsAction.defaultProps = {
  additionalNotes: '',
  creatorRole: null,
};

export default NeedsAction;
