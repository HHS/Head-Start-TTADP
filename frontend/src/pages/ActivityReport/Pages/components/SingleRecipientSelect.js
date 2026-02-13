import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import Select from 'react-select'
import { Table, Checkbox } from '@trussworks/react-uswds'
import FormItem from '../../../../components/FormItem'
import selectOptionsReset from '../../../../components/selectOptionsReset'
import FormFieldThatIsSometimesReadOnly from '../../../../components/GoalForm/FormFieldThatIsSometimesReadOnly'
import Req from '../../../../components/Req'
import './SingleRecipientSelect.scss'

export default function SingleRecipientSelect({
  selectedRecipients,
  possibleRecipients,
  onChangeActivityRecipients,
  onBlurActivityRecipients,
  selectRef,
}) {
  const [showRecipientGrants, setShowRecipientGrants] = useState(false)
  const [recipientGrants, setRecipientGrants] = useState([])
  const [checkedCheckBoxes, setCheckedCheckBoxes] = useState([])
  const [newSelectedRecipient, setNewSelectedRecipient] = useState(null)

  // We need to create a useEffect that sets both the selected
  //  recipient and the grants when the selectedRecipients has a value.
  useEffect(() => {
    // If we have selected recipients.
    if (selectedRecipients && selectedRecipients.length > 0 && possibleRecipients.length) {
      // Find the recipient.
      const selectedRecipientFromOptions = possibleRecipients.find((recipient) => recipient.id === selectedRecipients[0].recipientIdForLookUp)
      // Get the grant ids for the recipient.
      const selectedGrantIds = selectedRecipients.map((g) => g.activityRecipientId)

      // Get the grants for the selected recipient.
      const selectedRecipientGrants = selectedRecipientFromOptions.options.filter((grant) => selectedGrantIds.includes(grant.value))

      // If we have grants set them else clear them.
      if (selectedRecipientGrants.length) {
        setNewSelectedRecipient(selectedRecipientFromOptions)
        setRecipientGrants(selectedRecipientFromOptions.options)
        setCheckedCheckBoxes(selectedGrantIds)
        setShowRecipientGrants(true)
      } else {
        setNewSelectedRecipient(null)
        setRecipientGrants([])
        setCheckedCheckBoxes([])
        setShowRecipientGrants(false)
      }
    } else {
      setCheckedCheckBoxes([])
    }
  }, [possibleRecipients, selectedRecipients])

  const onRecipientChange = (selectedRecipientOption) => {
    // Set this recipients grants.
    setRecipientGrants(selectedRecipientOption.grants)

    // Set the selected recipient.
    setNewSelectedRecipient(selectedRecipientOption)

    // Clear the selected recipient grants.
    setCheckedCheckBoxes([])

    // If a recipient has been selected we need to display the grants.
    if (selectedRecipientOption) {
      setShowRecipientGrants(true)
    }

    // If the recipient has one grant auto select it.
    onChangeActivityRecipients(
      selectedRecipientOption.grants.length === 1
        ? selectedRecipientOption.grants.map((grant) => ({
            ...grant,
            name: grant.label,
            activityRecipientId: grant.value,
            recipientIdForLookUp: grant.recipientIdForLookUp,
          }))
        : []
    )
  }

  const toggleGrantSelection = (grantChecked) => {
    // Update the checked grants.
    let updatedCheckBoxes
    const grantId = grantChecked.value
    if (checkedCheckBoxes.includes(grantId)) {
      updatedCheckBoxes = checkedCheckBoxes.filter((id) => id !== grantId)
    } else {
      updatedCheckBoxes = [...checkedCheckBoxes, grantId]
    }
    // Update the state with the new checked boxes
    setCheckedCheckBoxes(updatedCheckBoxes)

    // We need to get all grants then call onChangeActivityRecipients function.
    const checkedGrants = recipientGrants.filter((grant) => updatedCheckBoxes.includes(grant.value))
    const newSelectedGrants = checkedGrants.map((grant) => ({
      ...grant,
      // grantId: grant.value,
      name: grant.label,
      activityRecipientId: grant.value,
      recipientIdForLookUp: grant.recipientIdForLookUp,
    }))
    // Update the form data for activityRecipients (triggers the useEffect).
    onChangeActivityRecipients(newSelectedGrants)
  }

  const createGrantCheckBoxes = (grantsForCheckBoxes) => {
    const grantCheckBoxes = grantsForCheckBoxes.map((grant, index) => (
      <tr key={grant.value}>
        <td>
          <Checkbox
            id={`${grant.value}-grant`}
            key={`${grant.value}-grant-key`}
            name={grant.label}
            label={grant.label}
            onChange={() => toggleGrantSelection(grant)}
            checked={checkedCheckBoxes.includes(grant.value)}
            aria-label={`Select grant ${grant.label}`}
            onBlur={onBlurActivityRecipients}
            data-testid={`recipient-grant-checkbox-${index}`}
          />
        </td>
      </tr>
    ))

    return (
      <Table className="single-recipient-select-table">
        <tbody>{grantCheckBoxes}</tbody>
      </Table>
    )
  }

  return (
    <FormItem label="Recipient" name="activityRecipients" required>
      <div className="single-recipient-select">
        <Select
          placeholder="- Select -"
          inputId="selectedRecipient"
          onChange={onRecipientChange}
          ref={selectRef}
          options={possibleRecipients.map((recipient) => ({
            label: recipient.label,
            value: recipient.id,
            grants: recipient.options,
          }))}
          styles={{
            ...selectOptionsReset,
            placeholder: (baseStyles) => ({
              ...baseStyles,
              color: 'black',
              fontSize: '1rem',
              fontWeight: '400',
              lineHeight: '1.3',
            }),
          }}
          components={{
            DropdownIndicator: null,
          }}
          className="usa-select"
          closeMenuOnSelect
          value={newSelectedRecipient || selectedRecipients}
          getOptionLabel={(option) => option.label}
          getOptionValue={(option) => option.value}
        />
        {showRecipientGrants && (
          <FormFieldThatIsSometimesReadOnly
            permissions={[recipientGrants.length > 1]}
            label="Recipient's grants"
            value={recipientGrants.length > 0 ? recipientGrants[0].label : ''}
          >
            <p className="usa-prose margin-bottom-0" data-testid="recipient-grants-label">
              Recipient&apos;s Grants <Req announce />
            </p>
            {createGrantCheckBoxes(recipientGrants)}
          </FormFieldThatIsSometimesReadOnly>
        )}
      </div>
    </FormItem>
  )
}

const RecipientPropType = PropTypes.shape({
  recipientId: PropTypes.number,
  grantIds: PropTypes.arrayOf(PropTypes.number),
})

const SelectedRecipientsPropType = PropTypes.shape({
  id: PropTypes.number,
  recipientId: PropTypes.number,
  activityRecipientId: PropTypes.number,
  name: PropTypes.string,
  recipientIdForLookUp: PropTypes.number,
})
SingleRecipientSelect.propTypes = {
  selectedRecipients: PropTypes.arrayOf(SelectedRecipientsPropType).isRequired,
  possibleRecipients: PropTypes.arrayOf(RecipientPropType).isRequired,
  onChangeActivityRecipients: PropTypes.func.isRequired,
  onBlurActivityRecipients: PropTypes.func.isRequired,
  selectRef: PropTypes.shape({
    current: PropTypes.oneOfType([
      PropTypes.shape({
        focus: PropTypes.func,
        blur: PropTypes.func,
      }),
      // DOM element
      typeof Element !== 'undefined' ? PropTypes.instanceOf(Element) : PropTypes.any,
      PropTypes.oneOf([null]),
    ]),
  }),
}

SingleRecipientSelect.defaultProps = {
  selectRef: null,
}
