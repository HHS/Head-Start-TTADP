/*
  Content section for the navigator. It lets the navigator know when the form
  becomes dirty so the navigator can update the navigator state. Also data from
  the form is sent up when unmounted to be saved in the navigator component.
*/
import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { Form as UswdsForm, Button } from '@trussworks/react-uswds';
import { useForm } from 'react-hook-form';

function Form({
  initialData, onSubmit, onDirty, saveForm, renderForm,
}) {
  /*
    When the form unmounts we want to send any data in the form
    to the parent component so the data can be saved in state
    there. UseEffect callbacks run in order. If we place the
    unmount save after "useForm" the form fields may be removed
    from the DOM before we save their values. This means we have
    to get a reference to the "getValues" method and place the
    unmount save before the "useForm". See https://github.com/react-hook-form/react-hook-form/issues/494#issuecomment-552860874
  */
  const getValuesRef = React.useRef(null);

  useEffect(() => () => {
    if (getValuesRef.current) {
      saveForm(getValuesRef.current());
    }
  }, [saveForm]);

  const hookForm = useForm({
    mode: 'onChange',
    defaultValues: initialData,
  });

  const {
    formState,
    handleSubmit,
    getValues,
  } = hookForm;

  useEffect(() => {
    onDirty(formState.isDirty);
  }, [formState.isDirty, onDirty]);

  getValuesRef.current = getValues;

  return (
    <UswdsForm onSubmit={handleSubmit(onSubmit)} className="smart-hub--form-large">
      {renderForm(hookForm)}
      <Button className="stepper-button" type="submit" disabled={!formState.isValid}>Continue</Button>
    </UswdsForm>
  );
}

Form.propTypes = {
  initialData: PropTypes.shape({}),
  onSubmit: PropTypes.func.isRequired,
  onDirty: PropTypes.func.isRequired,
  saveForm: PropTypes.func.isRequired,
  renderForm: PropTypes.func.isRequired,
};

Form.defaultProps = {
  initialData: {},
};

export default Form;
