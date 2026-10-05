import { ErrorMessage as ReactHookFormError } from '@hookform/error-message';
import { ErrorMessage, FormGroup, Radio } from '@trussworks/react-uswds';
import React, { useEffect } from 'react';
import { Controller, useController, useFormContext } from 'react-hook-form';
import Select from 'react-select';
import FormItem from '../../components/FormItem';
import type { GrantCheckboxOption } from '../../components/GrantCheckboxSelect';
import GrantCheckboxSelect from '../../components/GrantCheckboxSelect';
import selectOptionsReset from '../../components/selectOptionsReset';
import usePossibleGrants from '../../hooks/usePossibleGrants';
import { REQUEST_ORIGINATORS, SELECT_PLACEHOLDER, TTA_REQUEST_FIELDS } from './constants';
import type { TtaRequestGrant, TtaRequestRecipient } from './types';

interface WhoIsTheRequestForProps {
  /**
   * every recipient on offer. Started from a recipient's TTA records this is just that
   * recipient, so there is nothing to choose between.
   */
  recipientOptions?: TtaRequestRecipient[] | null;
  /**
   * set when the recipient is already fixed, started from a recipient's TTA records - the
   * recipient isn't shown, since the grant already names them
   */
  recipient?: TtaRequestRecipient | null;
}

const NO_RECIPIENT = { grants: [] as TtaRequestGrant[] };

const grantToOption = (grant: TtaRequestGrant): GrantCheckboxOption => ({
  value: grant.id,
  label: grant.name,
});

/**
 * The first section of the request: who it is for, whether they know about it and who asked
 * for it. Started from a recipient's TTA records the recipient arrives already fixed and only
 * their grants are listed; started from the TTA requests page it is offered as a select. The
 * grants follow from whichever recipient is selected or fixed.
 */
export default function WhoIsTheRequestFor({
  recipientOptions = null,
  recipient = null,
}: WhoIsTheRequestForProps): React.ReactElement {
  const {
    control,
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext();
  const selectedRecipient: TtaRequestRecipient | null = watch(TTA_REQUEST_FIELDS.RECIPIENT);

  // a stable empty reference keeps usePossibleGrants' memo from recomputing every render
  const possibleGrants: TtaRequestGrant[] = usePossibleGrants(selectedRecipient ?? NO_RECIPIENT);

  const {
    field: { value: selectedGrants, onChange: onChangeGrants, onBlur: onBlurGrants },
  } = useController({
    name: TTA_REQUEST_FIELDS.GRANTS,
    control,
    rules: {
      validate: (grants: TtaRequestGrant[]) =>
        (grants && grants.length > 0) || 'Select a recipient grant',
    },
    defaultValue: [],
  });

  // a recipient with a single grant has nothing to choose between, so choose it for them
  useEffect(() => {
    if (possibleGrants.length === 1) {
      setValue(TTA_REQUEST_FIELDS.GRANTS, possibleGrants);
    }
  }, [possibleGrants, setValue]);

  const toggleGrant = (toggled: GrantCheckboxOption) => {
    const isSelected = selectedGrants.some((grant: TtaRequestGrant) => grant.id === toggled.value);
    onChangeGrants(
      isSelected
        ? selectedGrants.filter((grant: TtaRequestGrant) => grant.id !== toggled.value)
        : [...selectedGrants, possibleGrants.find((grant) => grant.id === toggled.value)]
    );
  };

  return (
    <>
      <h3 className="margin-top-4 margin-bottom-2">Who is the request for?</h3>
      {recipientOptions && (
        <Controller
          name={TTA_REQUEST_FIELDS.RECIPIENT}
          control={control}
          rules={{ required: 'Select a recipient' }}
          defaultValue={null}
          // a fixed recipient is still a form value, but the grant already names them
          render={({ value, onChange, onBlur }) =>
            recipient ? null : (
              <FormItem
                label="Recipient"
                name={TTA_REQUEST_FIELDS.RECIPIENT}
                htmlFor={TTA_REQUEST_FIELDS.RECIPIENT}
                required
              >
                <Select
                  inputId={TTA_REQUEST_FIELDS.RECIPIENT}
                  name={TTA_REQUEST_FIELDS.RECIPIENT}
                  className="usa-select"
                  styles={selectOptionsReset}
                  options={recipientOptions}
                  placeholder={SELECT_PLACEHOLDER}
                  value={value}
                  onChange={(newRecipient) => {
                    // the grants belong to the old recipient, so they cannot survive the change
                    setValue(TTA_REQUEST_FIELDS.GRANTS, []);
                    onChange(newRecipient);
                  }}
                  onBlur={onBlur}
                  getOptionLabel={(option) => option.name}
                  getOptionValue={(option) => String(option.id)}
                />
              </FormItem>
            )
          }
        />
      )}
      {selectedRecipient && possibleGrants.length > 0 && (
        <FormGroup className="ttahub-form-item" error={errors[TTA_REQUEST_FIELDS.GRANTS]}>
          <ReactHookFormError
            errors={errors}
            name={TTA_REQUEST_FIELDS.GRANTS}
            render={({ message }) => <ErrorMessage>{message}</ErrorMessage>}
          />
          <GrantCheckboxSelect
            grants={possibleGrants.map(grantToOption)}
            checkedValues={selectedGrants.map((grant: TtaRequestGrant) => grant.id)}
            onToggle={toggleGrant}
            onBlur={onBlurGrants}
            label="Recipient grants"
            readOnlyLabel="Recipient grant"
          />
        </FormGroup>
      )}
      <FormItem
        label="Is the recipient aware of this request?"
        name={TTA_REQUEST_FIELDS.RECIPIENT_AWARE}
        fieldSetWrapper
      >
        <Radio
          id="recipient-aware-yes"
          name={TTA_REQUEST_FIELDS.RECIPIENT_AWARE}
          label="Yes"
          value="yes"
          className="smart-hub--report-checkbox"
          inputRef={register({ required: 'Select one' })}
        />
        <Radio
          id="recipient-aware-no"
          name={TTA_REQUEST_FIELDS.RECIPIENT_AWARE}
          label="No"
          value="no"
          className="smart-hub--report-checkbox"
          inputRef={register({ required: 'Select one' })}
        />
      </FormItem>
      <Controller
        name={TTA_REQUEST_FIELDS.ORIGINATOR}
        control={control}
        rules={{ required: 'Select who originated this request' }}
        defaultValue={null}
        render={({ value, onChange, onBlur }) => (
          <FormItem
            label="Who originated this request?"
            name={TTA_REQUEST_FIELDS.ORIGINATOR}
            htmlFor={TTA_REQUEST_FIELDS.ORIGINATOR}
            required
          >
            <Select
              inputId={TTA_REQUEST_FIELDS.ORIGINATOR}
              name={TTA_REQUEST_FIELDS.ORIGINATOR}
              className="usa-select"
              styles={selectOptionsReset}
              options={REQUEST_ORIGINATORS}
              placeholder={SELECT_PLACEHOLDER}
              value={value}
              onChange={onChange}
              onBlur={onBlur}
            />
          </FormItem>
        )}
      />
    </>
  );
}
