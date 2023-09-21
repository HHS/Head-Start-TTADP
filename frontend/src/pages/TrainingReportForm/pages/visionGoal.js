import React from 'react';
import { Helmet } from 'react-helmet';
import { useFormContext } from 'react-hook-form';
import { Textarea } from '@trussworks/react-uswds';
import FormItem from '../../../components/FormItem';
import IndicatesRequiredField from '../../../components/IndicatesRequiredField';
import NavigatorButtons from '../../../components/Navigator/components/NavigatorButtons';
import {
  visionGoalFields,
  pageTouched,
  pageComplete,
} from '../constants';

const VisionGoal = () => {
  const { register } = useFormContext();

  return (
    <div className="padding-x-1">
      <Helmet>
        <title>Vision and goal</title>
      </Helmet>
      <IndicatesRequiredField />

      <div className="margin-top-2">
        <FormItem
          label="Event vision "
          name="vision"
          required
        >
          <Textarea
            id="vision"
            name="vision"
            required
            inputRef={register({
              required: 'Descibe the event vision',
            })}
          />
        </FormItem>
      </div>

      <div className="margin-top-2">
        <FormItem
          label="Event goal "
          name="goal"
          required
        >
          <Textarea
            id="goal"
            name="goal"
            required
            inputRef={register({
              required: 'Describe the event goal',
            })}
          />
        </FormItem>
      </div>
    </div>
  );
};

const ReviewSection = () => <><h2>Vision and goal</h2></>;
const fields = Object.keys(visionGoalFields);
const path = 'vision-goal';
const position = 2;

export const isPageComplete = (hookForm) => pageComplete(hookForm, fields);

export default {
  position,
  label: 'Vision and goal',
  path,
  fields,
  isPageTouched: (hookForm) => pageTouched(hookForm.formState.touched, fields),
  reviewSection: () => <ReviewSection />,
  review: false,
  render: (
    _additionalData,
    _formData,
    _reportId,
    isAppLoading,
    onContinue,
    onSaveDraft,
    onUpdatePage,
    _weAreAutoSaving,
    _datePickerKey,
    _onFormSubmit,
    Alert,
  ) => (
    <>
      <VisionGoal />
      <Alert />
      <NavigatorButtons
        isAppLoading={isAppLoading}
        onContinue={onContinue}
        onSaveDraft={onSaveDraft}
        path={path}
        position={position}
        onUpdatePage={onUpdatePage}
      />
    </>
  ),
  isPageComplete,
};
