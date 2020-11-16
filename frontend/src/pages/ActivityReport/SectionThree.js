import React from 'react';
import PropTypes from 'prop-types';

import {
  Fieldset, Checkbox, Label, Grid, TextInput,
} from '@trussworks/react-uswds';

import MultiSelect from '../../components/MultiSelect';
import DatePicker from '../../components/DatePicker';

const participants = [
  'CEO / CFO / Executive',
  'Center Director / Site Director',
  'Coach / Trainer',
  'Direct Service / Front line / Home Visitors',
  'Family Child Care',
  'Governing Body / Tribal Council / Policy Council',
  'Head Start Program Director',
  'Manager / Coordinator / Specialist / Case Manager',
  'Program Support / Administrative Assistant',
  'Teacher / Infant-Toddler Caregiver',
  'Parent / Family / Guardian',
  'Volunteer',
];

const PageThree = ({
  register,
  control,
  watch,
  getValues,
}) => {
  const startDate = watch('start-date');
  const endDate = watch('end-date');

  const renderCheckbox = (name, value, label) => (
    <Checkbox
      id={value}
      label={label}
      value={value}
      name={name}
      className="smart-hub--report-checkbox"
      inputRef={register({
        validate: () => (
          getValues(name).length ? true : `${name} is required`
        ),
      })}
    />
  );

  return (
    <>
      <Fieldset className="smart-hub--report-legend smart-hub--form-section" legend="Methods and Logistics">
        <div className="smart-hub--form-section">
          <Fieldset unstyled>
            <legend>How was this activity conducted? (select at least one)</legend>
            <Grid row gap>
              <Grid col={4}>
                {renderCheckbox('activity-method', 'virtual', 'Virtual')}
                {renderCheckbox('activity-method', 'in-person', 'In Person')}
                {renderCheckbox('activity-method', 'telephone', 'Telephone')}
              </Grid>
              <Grid col={8}>
                {renderCheckbox('activity-method', 'email', 'Email')}
                {renderCheckbox('activity-method', 'multi-recurring', 'Multi-grantee: Recurring Event (Community Practice)')}
                {renderCheckbox('activity-method', 'multi-single', 'Multi-grantee: Single Event (Cluster)')}
              </Grid>
            </Grid>
          </Fieldset>
        </div>
        <div className="smart-hub--form-section">
          <Fieldset unstyled>
            <legend>
              Was this activity Training or Technical Assistance?
              Select both options if both Training and Technical Assistance took place.
            </legend>
            {renderCheckbox('activity-type', 'training', 'Training')}
            {renderCheckbox('activity-type', 'technical-assistance', 'Technical Assistance')}
          </Fieldset>
        </div>
        <div className="smart-hub--form-section">
          <MultiSelect
            name="participants"
            label="Grantee participant(s) involved"
            control={control}
            options={
              participants.map((participant) => ({ value: participant, label: participant }))
            }
          />
        </div>
        <div className="smart-hub--form-section">
          <Label htmlFor="number-of-participants">Number of grantee participants involved</Label>
          <TextInput
            id="number-of-participants"
            name="number-of-participants"
            type="number"
            inputRef={register({ required: true })}
          />
        </div>
      </Fieldset>
      <Fieldset className="smart-hub--report-legend smart-hub--form-section" legend="Date and Duration">
        <div className="smart-hub--form-section">
          <Grid row gap>
            <Grid col={6}>
              <DatePicker
                control={control}
                maxDate={endDate}
                name="start-date"
                label="Start Date"
                register={register}
                openUp
              />
            </Grid>
            <Grid col={6}>
              <DatePicker
                control={control}
                minDate={startDate}
                disabled={!startDate}
                name="end-date"
                label="End Date"
                register={register}
                openUp
              />
            </Grid>
            <Grid col={5}>
              <Label htmlFor="duration">Duration (in hours)</Label>
              <TextInput id="duration" name="duration" type="number" inputRef={register({ required: true })} />
            </Grid>
          </Grid>
        </div>
      </Fieldset>
    </>
  );
};

PageThree.propTypes = {
  register: PropTypes.func.isRequired,
  // control is an object from react-hook-form
  // eslint-disable-next-line react/forbid-prop-types
  control: PropTypes.object.isRequired,
  watch: PropTypes.func.isRequired,
  getValues: PropTypes.func.isRequired,
};

export default PageThree;
