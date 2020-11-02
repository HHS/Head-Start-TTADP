import React, { useEffect } from 'react';
import PropTypes from 'prop-types';

import {
  Fieldset, Radio, Label, Dropdown, Textarea,
} from '@trussworks/react-uswds';

const grantees = [
  'Grantee Name 1',
  'Grantee Name 2',
  'Grantee Name 3',
];

const nonGrantees = [
  'CCDF / Child Care Administrator',
  'Head Start Collaboration Office',
  'QRIS System',
  'Regional Head Start Association',
  'Regional TTA/Other Specialists',
  'State CCR&R',
  'State Early Learning Standards',
  'State Education System',
  'State Health System',
  'State Head Start Association',
  'State Professional Development / Continuing Education',
];

const reasons = [
  'reason 1',
  'reason 2',
];

const otherUsers = [
  'User 1',
  'User 2',
  'User 3',
];

const PageOne = ({
  register,
  watch,
  setValue,
}) => {
  const participantSelection = watch('participant-category');
  const disableParticipant = participantSelection === '';
  const nonGranteeSelected = participantSelection === 'non-grantee';
  const participants = nonGranteeSelected ? nonGrantees : grantees;

  useEffect(() => {
    setValue('grantees', []);
  }, [participantSelection, setValue]);

  return (
    <>
      <Fieldset className="smart-hub--report-legend smart-hub--form-section" legend="General Information">
        <div className="smart-hub--form-section">
          <Fieldset unstyled>
            <legend>Was this activity for a grantee or a non-grantee?</legend>
            <Radio
              id="category-grantee"
              name="participant-category"
              label="Grantee"
              value="grantee"
              className="smart-hub--report-checkbox"
              inputRef={register({ required: true })}
            />
            <Radio
              id="category-non-grantee"
              name="participant-category"
              label="Non-Grantee"
              value="non-grantee"
              className="smart-hub--report-checkbox"
              inputRef={register({ required: true })}
            />
          </Fieldset>
        </div>
        <div className="smart-hub--form-section">
          <Label htmlFor="grantees">Who was this activity for?</Label>
          <Dropdown
            id="grantees"
            name="grantees"
            defaultValue=""
            disabled={disableParticipant}
            inputRef={register({ required: true })}
          >
            <option name="default" disabled hidden value="">
              Select a
              {' '}
              {`${nonGranteeSelected ? 'Non-grantee' : 'Grantee'}`}
              ...
            </option>
            {participants.map((participant) => (
              <option key={participant} value={participant}>{participant}</option>
            ))}
          </Dropdown>
        </div>
        <div className="smart-hub--form-section">
          <Label htmlFor="other-users">Other Specialist(s) involved in this activity (optional)</Label>
          <Dropdown id="other-users" name="other-users" defaultValue="" inputRef={register}>
            <option name="default" disabled hidden value="">Select another Specialist...</option>
            {otherUsers.map((user) => (
              <option key={user} value={user}>{user}</option>
            ))}
          </Dropdown>
        </div>
      </Fieldset>
      <Fieldset className="smart-hub--report-legend smart-hub--form-section" legend="Reason for Activity">
        <div className="smart-hub--form-section">
          <Fieldset unstyled>
            <legend>Who requested this activity?</legend>
            <Radio
              id="grantee-request"
              name="requester"
              label="Grantee"
              value="grantee"
              className="smart-hub--report-checkbox"
              inputRef={register({ required: true })}
            />
            <Radio
              id="regional-office-request"
              name="requester"
              label="Regional Office"
              value="regional-office"
              className="smart-hub--report-checkbox"
              inputRef={register({ required: true })}
            />
          </Fieldset>
        </div>
        <div className="smart-hub--form-section">
          <Label htmlFor="reason">What was the reason for this activity?</Label>
          <Dropdown id="reason" name="reason" defaultValue="" inputRef={register({ required: true })}>
            <option name="default" disabled hidden value="">Select a reason...</option>
            {reasons.map((reason) => (
              <option key={reason} value={reason}>{reason}</option>
            ))}
          </Dropdown>
        </div>
        <div className="smart-hub--form-section">
          <Label htmlFor="context">Please provide any additional context for this engagement (optional)</Label>
          <Textarea id="context" name="context" />
        </div>
      </Fieldset>
    </>
  );
};

PageOne.propTypes = {
  register: PropTypes.func.isRequired,
  watch: PropTypes.func.isRequired,
  setValue: PropTypes.func.isRequired,
};

export default PageOne;
