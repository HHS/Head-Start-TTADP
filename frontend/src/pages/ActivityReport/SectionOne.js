import React, { useEffect } from 'react';
import PropTypes from 'prop-types';

import {
  Fieldset, Radio, Label, Textarea,
} from '@trussworks/react-uswds';

import MultiSelect from '../../components/MultiSelect';

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
  control,
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
          <MultiSelect
            name="grantees"
            label="Who was this activity for?"
            disabled={disableParticipant}
            control={control}
            placeholder={`Select a ${nonGranteeSelected ? 'Non-grantee...' : 'Grantee...'}`}
            options={
              participants.map((participant) => ({ value: participant, label: participant }))
            }
          />
        </div>
        <div className="smart-hub--form-section">
          <MultiSelect
            name="other-users"
            label="Other Specialist(s) involved in this activity (optional)"
            control={control}
            placeholder="Select another Specialist..."
            required={false}
            options={
              otherUsers.map((user) => ({ value: user, label: user }))
            }
          />
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
          <MultiSelect
            name="reason"
            label="What was the reason for this activity?"
            control={control}
            placeholder="Select a reason..."
            options={
              reasons.map((reason) => ({ value: reason, label: reason }))
            }
          />
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
  // eslint-disable-next-line react/forbid-prop-types
  control: PropTypes.object.isRequired,
};

export default PageOne;
