import React from 'react';
import PropTypes from 'prop-types';
import { Checkbox } from '@trussworks/react-uswds';
import { useController, useFormContext } from 'react-hook-form';
import moment from 'moment';

export default function PocCompleteCheckbox({ userId, isPoc }) {
  const { register, setValue } = useFormContext();
  const {
    field: {
      onChange: onChangePocComplete,
      name: namePocComplete,
      value: valuePocComplete,
      ref: refPocComplete,
    },
  } = useController({
    name: 'pocComplete',
    defaultValue: false,
  });

  const onChange = (e) => {
    onChangePocComplete(e.target.checked);

    if (e.target.checked) {
      setValue('pocCompleteId', userId);
      setValue('pocCompleteDate', moment().format('YYYY-MM-DD'));
    } else {
      setValue('pocCompleteId', null);
      setValue('pocCompleteDate', null);
    }
  };
  return (
    <>
      {isPoc ? (
        <>
          <Checkbox
            id={namePocComplete}
            name={namePocComplete}
            label="Email the event creator and collaborator to let them know my work is complete."
            className="margin-top-2"
            onChange={onChange}
            inputRef={refPocComplete}
            checked={valuePocComplete}
          />
        </>
      ) : <input type="hidden" id={namePocComplete} name={namePocComplete} ref={refPocComplete} />}
      <input type="hidden" id="pocCompleteId" name="pocCompleteId" ref={register()} />
      <input type="hidden" id="pocCompleteDate" name="pocCompleteDate" ref={register()} />
    </>
  );
}

PocCompleteCheckbox.propTypes = {
  userId: PropTypes.number.isRequired,
  isPoc: PropTypes.bool.isRequired,
};
