import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Controller, useFormContext } from 'react-hook-form';
import { uniqueId } from 'lodash';
import { GOAL_FORM_FIELDS } from '../../pages/StandardGoalForm/constants';
import GenericSelectWithDrawer from '../GoalForm/GenericSelectWithDrawer';
import { ERROR_FORMAT } from '../../pages/ActivityReport/Pages/components/constants';
import { NO_ERROR } from '../../pages/SessionForm/constants';
import ContentFromFeedByTag from '../ContentFromFeedByTag';

export const validate = (value) => {
  if (value.length < 1) {
    return 'Select at least one root cause';
  }
  if (value.length > 2) {
    return 'Select a maximum of 2 root causes';
  }
  return true;
};
export default function GoalFormTemplatePrompts({ goalTemplatePrompts, fieldName }) {
  const { control, formState: { errors } } = useFormContext();

  // we can assume that there is only ever one prompt: for root causes
  // todo: if this ever changes, rewrite this to be generic
  // eslint-disable-next-line max-len
  const prompt = useMemo(() => (goalTemplatePrompts ? goalTemplatePrompts[0] : null), [goalTemplatePrompts]);
  const promptId = useMemo(() => uniqueId('goal-form-prompt-'), []);

  // eslint-disable-next-line max-len
  const options = useMemo(() => (prompt ? prompt.options.map((option) => ({ name: option, id: option })) : []), [prompt]);

  const drawerContent = useMemo(() => (
    <ContentFromFeedByTag
      className="ttahub-drawer--ttahub-fei-root-causes-guidance"
      tagName="ttahub-fei-root-causes"
      contentSelector="table"
    />
  ),
  []);

  if (!prompt) {
    return null;
  }

  return (
    <Controller
      key={promptId}
      render={({ value, onChange, onBlur }) => (
        <GenericSelectWithDrawer
          error={errors[fieldName] ? ERROR_FORMAT(errors[fieldName].message) : NO_ERROR}
          name={prompt.prompt}
          hint={prompt.hint}
          options={options}
          validateValues={onBlur}
          values={value || []}
          onChangeValues={onChange}
          inputName={fieldName}
          isLoading={false}
          drawerButtonText="Get help choosing root causes"
          drawerContent={drawerContent}
          drawerTitle="Root causes"
        />
      )}
      name={fieldName}
      control={control}
      rules={{
        validate,
      }}
      defaultValue={null}
    />
  );
}

GoalFormTemplatePrompts.propTypes = {
  fieldName: PropTypes.string,
  goalTemplatePrompts: PropTypes.arrayOf(PropTypes.shape({
    prompt: PropTypes.string,
    hint: PropTypes.string,
    options: PropTypes.arrayOf(PropTypes.string),
  })),
};

GoalFormTemplatePrompts.defaultProps = {
  goalTemplatePrompts: null,
  fieldName: GOAL_FORM_FIELDS.ROOT_CAUSES,
};
