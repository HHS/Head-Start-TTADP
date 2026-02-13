import React from 'react'
import PropTypes from 'prop-types'
import { Controller } from 'react-hook-form'
import Select from 'react-select'
import FormFieldThatIsSometimesReadOnly from '../GoalForm/FormFieldThatIsSometimesReadOnly'
import FormItem from '../FormItem'
import selectOptionsReset from '../selectOptionsReset'

export default function GoalGrantSingleSelect({ permissions, control, selectedGrant, possibleGrants }) {
  return (
    <Controller
      control={control}
      name="selectedGrant"
      rules={{ required: 'Please select a grant' }}
      render={({ onChange, value, onBlur }) => (
        <FormFieldThatIsSometimesReadOnly permissions={permissions} label="Recipient grant numbers" value={value ? value.numberWithProgramTypes : ''}>
          <FormItem label="Recipient grant numbers" name="selectedGrant" required>
            <Select
              placeholder=""
              inputId="selectedGrant"
              onChange={onChange}
              options={possibleGrants}
              styles={selectOptionsReset}
              components={{
                DropdownIndicator: null,
              }}
              className="usa-select"
              closeMenuOnSelect={false}
              value={selectedGrant}
              onBlur={onBlur}
              getOptionLabel={(option) => option.numberWithProgramTypes}
              getOptionValue={(option) => option.id}
            />
          </FormItem>
        </FormFieldThatIsSometimesReadOnly>
      )}
    />
  )
}

const GrantPropType = PropTypes.shape({
  numberWithProgramTypes: PropTypes.string,
  id: PropTypes.number,
})

GoalGrantSingleSelect.propTypes = {
  permissions: PropTypes.arrayOf(PropTypes.bool).isRequired,
  control: PropTypes.shape({}).isRequired,
  selectedGrant: GrantPropType,
  possibleGrants: PropTypes.arrayOf(GrantPropType).isRequired,
}

GoalGrantSingleSelect.defaultProps = {
  selectedGrant: null,
}
