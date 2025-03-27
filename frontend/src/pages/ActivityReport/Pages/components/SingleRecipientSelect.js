import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useController } from 'react-hook-form';
import Select from 'react-select';
import { Table, Checkbox } from '@trussworks/react-uswds';
import FormItem from '../../../../components/FormItem';
import selectOptionsReset from '../../../../components/selectOptionsReset';
import FormFieldThatIsSometimesReadOnly from '../../../../components/GoalForm/FormFieldThatIsSometimesReadOnly';

export default function SingleRecipientSelect(
  {
    selectedRecipient,
    possibleRecipients,
    disable,
  },
) {
  console.log('>>>>>>>>selectedRecipient passed to single: ', possibleRecipients);
  // Controller for activity recipients.
  const {
    field: {
      onChange: onChangeActivityRecipients,
      // onBlur: onBlurActivityRecipients,
      value: activityRecipients,
      // name: activityRecipientsInputName,
    },
  } = useController({
    name: 'activityRecipients',
    defaultValue: false,
    rules: {
      validate: {
        notEmpty: (value) => (value && value.length) || 'Please select a recipient',
      },
    },
  });

  console.log('activityRecipients from FORM: ', activityRecipients);

  const [showRecipientGrants, setShowRecipientGrants] = useState(false);
  const [recipientGrants, setRecipientGrants] = useState([]);
  const [checkedCheckBoxes, setCheckedCheckBoxes] = useState([]);
  const [newSelectedRecipient, setNewSelectedRecipient] = useState(null);

  const onRecipientChange = (selectedRecipientOption) => {
    // Set this recipients grants.
    console.log('selectedRecipientOption>>>1', selectedRecipientOption);
    setRecipientGrants(selectedRecipientOption.grants);

    // Set the selected recipient.
    setNewSelectedRecipient(selectedRecipientOption);

    // If a recipient has been selected we need to display the grants.
    if (selectedRecipientOption) {
      setShowRecipientGrants(true);
    } else {
      setShowRecipientGrants(false);
    }
  };

  console.log("NEW Selected Recipent>>>", selectedRecipient);

  const toggleGrantSelection = (grantChecked) => {
    console.log('grantChecked>>>', grantChecked);
    // Update the checked grants.
    const grantId = grantChecked.activityRecipientId;
    if (checkedCheckBoxes.includes(grantId)) {
      setCheckedCheckBoxes(checkedCheckBoxes.filter((id) => id !== grantId));
    } else {
      setCheckedCheckBoxes([...checkedCheckBoxes, grantId]);
    }

    // We need to get all grants then call onChangeActivityRecipients function.
    const checkedGrants = recipientGrants.filter((grant) => grant.id === grantId);
    onChangeActivityRecipients(checkedGrants);
  };

  const createGrantCheckBoxes = (grantsForCheckBoxes) => {
    console.log('grantsForCheckBoxeszzzzzzzzzz>>>', grantsForCheckBoxes);
    const grantCheckBoxes = grantsForCheckBoxes.map((grant) => (
      <tr key={grant.id}>
        <td>
          <Checkbox
            id={`${grant.activityRecipientId}-grant`}
            name={grant.name}
            label={grant.name}
            onChange={toggleGrantSelection}
            checked={checkedCheckBoxes.includes(grant.id)}
            aria-label={`Select grant ${grant.name}`}
          />
        </td>
        <td>
          <label htmlFor={`grant-${grant.id}`}>{grant.title}</label>
        </td>
      </tr>
    ));

    return (
      <Table>
        <tbody>
          {grantCheckBoxes}
        </tbody>
      </Table>
    );
  };

  console.log("possibleRecipients333333333333", possibleRecipients);
  return (
    <FormItem
      label="Recipient name"
      name="activityRecipients"
      required
    >
      <div aria-hidden={disable}>
        <Select
          placeholder=""
          inputId="selectedRecipient"
          onChange={onRecipientChange}
          options={possibleRecipients.map((recipient) => ({
            label: recipient.label,
            value: recipient.id,
            grants: recipient.options,
          }))}
          styles={selectOptionsReset}
          components={{
            DropdownIndicator: null,
          }}
          className="usa-select"
          closeMenuOnSelect={false}
          value={newSelectedRecipient || selectedRecipient}
          getOptionLabel={(option) => option.label}
          getOptionValue={(option) => option.value}
        />
        {
          showRecipientGrants && (
          <FormFieldThatIsSometimesReadOnly
            permissions={[]}
            label="Recipient's grants"
            value="test label"
          >
            <p className="usa-prose margin-bottom-0" data-testid="recipient-grants-label">
              Recipient&apos;s Grants
            </p>
              {
                createGrantCheckBoxes(recipientGrants)
              }
          </FormFieldThatIsSometimesReadOnly>
          )
            }
      </div>
    </FormItem>
  );
}

const RecipientPropType = PropTypes.shape({
  recipientId: PropTypes.number,
  grantIds: PropTypes.arrayOf(PropTypes.number),
});

SingleRecipientSelect.propTypes = {
  // control: PropTypes.shape({}).isRequired,
  selectedRecipient: RecipientPropType,
  possibleRecipients: PropTypes.arrayOf(RecipientPropType).isRequired,
  disable: PropTypes.bool,
};

SingleRecipientSelect.defaultProps = {
  disable: false,
  selectedRecipient: null,
};
