import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Select from 'react-select';
import { Table, Checkbox } from '@trussworks/react-uswds';
import FormItem from '../../../../components/FormItem';
import selectOptionsReset from '../../../../components/selectOptionsReset';
import FormFieldThatIsSometimesReadOnly from '../../../../components/GoalForm/FormFieldThatIsSometimesReadOnly';
import Req from '../../../../components/Req';
import './SingleRecipientSelect.scss';

export default function SingleRecipientSelect(
  {
    selectedRecipients,
    possibleRecipients,
    disable,
    onChangeActivityRecipients,
  },
) {
  const [showRecipientGrants, setShowRecipientGrants] = useState(false);
  const [recipientGrants, setRecipientGrants] = useState([]);
  const [checkedCheckBoxes, setCheckedCheckBoxes] = useState([]);
  const [newSelectedRecipient, setNewSelectedRecipient] = useState(null);


  // We need to create a useEffect that sets both the selected recipient and the grants when the selectedRecipients has a value.
  useEffect(() => {
    console.log("selectedRecipients use effect:", selectedRecipients);
    if (selectedRecipients && selectedRecipients.length > 0) {
      const selectedRecipient = possibleRecipients.find(
        (recipient) => recipient.id === selectedRecipients[0].recipientId,
      );
      if (selectedRecipient) {
        setNewSelectedRecipient(selectedRecipient);
        setRecipientGrants(selectedRecipient.options);
        setCheckedCheckBoxes(selectedRecipient.grantIds);
        setShowRecipientGrants(true);
      } else {
        setNewSelectedRecipient(null);
        setRecipientGrants([]);
        setCheckedCheckBoxes([]);
        setShowRecipientGrants(false);
      }
    }
  }, [selectedRecipients, possibleRecipients]);


  const onRecipientChange = (selectedRecipientOption) => {
    // Set this recipients grants.
    setRecipientGrants(selectedRecipientOption.grants);

    // Set the selected recipient.
    setNewSelectedRecipient(selectedRecipientOption);

    // Clear the selected recipient grants.
    setCheckedCheckBoxes([]);
    onChangeActivityRecipients([]);
    // If a recipient has been selected we need to display the grants.
    if (selectedRecipientOption) {
      setShowRecipientGrants(true);
    } else {
      setShowRecipientGrants(false);
    }
  };

  const toggleGrantSelection = (grantChecked) => {
    // Update the checked grants.
    const grantId = grantChecked.value;
    if (checkedCheckBoxes.includes(grantId)) {
      setCheckedCheckBoxes(checkedCheckBoxes.filter((id) => id !== grantId));
    } else {
      setCheckedCheckBoxes([...checkedCheckBoxes, grantId]);
    }

    // We need to get all grants then call onChangeActivityRecipients function.
    const checkedGrants = recipientGrants.filter((grant) => grant.value === grantId);
    console.log('what we set in the form: ', checkedGrants);
    onChangeActivityRecipients(checkedGrants);
  };

  console.log('checkedCheckBoxes', checkedCheckBoxes);

  const createGrantCheckBoxes = (grantsForCheckBoxes) => {
    const grantCheckBoxes = grantsForCheckBoxes.map((grant) => (
      <tr key={grant.id}>
        <td>
          <Checkbox
            id={`${grant.value}-grant`}
            name={grant.label}
            label={grant.label}
            onChange={() => toggleGrantSelection(grant)}
            checked={checkedCheckBoxes.includes(grant.value)}
            aria-label={`Select grant ${grant.label}`}
          />
        </td>
      </tr>
    ));

    return (
      <Table className="single-recipient-select-table">
        <tbody>
          {grantCheckBoxes}
        </tbody>
      </Table>
    );
  };

  //console.log("possibleRecipients333333333333", possibleRecipients);
  return (
    <FormItem
      label="Recipient name"
      name="activityRecipients"
      required
    >
      <div className="single-recipient-select" aria-hidden={disable}>
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
          closeMenuOnSelect
          value={newSelectedRecipient || selectedRecipients}
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
              {' '}
              <Req announce />
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
  onChangeActivityRecipients: PropTypes.func.isRequired,
  selectedRecipients: PropTypes.arrayOf(RecipientPropType).isRequired,
  possibleRecipients: PropTypes.arrayOf(RecipientPropType).isRequired,
  disable: PropTypes.bool,
};

SingleRecipientSelect.defaultProps = {
  disable: false,
};
