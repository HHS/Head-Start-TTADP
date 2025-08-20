import React, { useRef } from 'react';
import { FormGroup, Label, ErrorMessage } from '@trussworks/react-uswds';
import {
  ACTIVITY_REASONS,
} from '@ttahub/common';
import { Controller, useFormContext } from 'react-hook-form';
import { ErrorMessage as ReactHookFormError } from '@hookform/error-message';
import Select from 'react-select';
import DrawerTriggerButton from '../../../../components/DrawerTriggerButton';
import Req from '../../../../components/Req';
import selectOptionsReset from '../../../../components/selectOptionsReset';
import ContentFromFeedByTag from '../../../../components/ContentFromFeedByTag';
import Drawer from '../../../../components/Drawer';

const INPUT_NAME = 'activityReason';

export default function ActivityReason() {
  const activityReasonRef = useRef();
  const { register, control, formState: { errors } } = useFormContext();
  const fieldErrors = errors[INPUT_NAME];

  return (
    <>
      <Drawer
        triggerRef={activityReasonRef}
        stickyHeader
        stickyFooter
        title="Why was this activity requested?"
      >
        <ContentFromFeedByTag tagName="ttahub-tta-request-option" contentSelector="table" />
      </Drawer>
      <FormGroup error={fieldErrors}>
        <div className="display-flex">
          <Label htmlFor={INPUT_NAME}>
            Who was the activity for?
            <Req />
          </Label>
          <DrawerTriggerButton drawerTriggerRef={activityReasonRef}>
            Get help choosing a reason
          </DrawerTriggerButton>
        </div>
        <ReactHookFormError
          errors={errors}
          name={INPUT_NAME}
          render={({ message }) => <ErrorMessage>{message}</ErrorMessage>}
        />
        <Controller
          render={({ onChange: controllerOnChange, value, onBlur }) => (
            <Select
              value={value ? { value, label: value } : null}
              inputId={INPUT_NAME}
              className="usa-select"
              placeholder="- Select -"
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
              onChange={(selected) => {
                controllerOnChange(selected ? selected.value : null);
              }}
              inputRef={register({ required: 'Select at least one reason for activity' })}
              options={ACTIVITY_REASONS.map((reason) => ({
                value: reason, label: reason,
              }))}
              onBlur={onBlur}
              required
              isMulti={false}
            />
          )}
          control={control}
          rules={{
            validate: (value) => {
              if (!value || value.length === 0) {
                return 'Select a reason for activity';
              }
              return true;
            },
          }}
          name="activityReason"
          defaultValue={null}
        />
      </FormGroup>
    </>
  );
}
