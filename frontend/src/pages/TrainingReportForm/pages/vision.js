import React, { useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { useFormContext } from 'react-hook-form';
import { Textarea } from '@trussworks/react-uswds';
import FormItem from '../../../components/FormItem';
import IndicatesRequiredField from '../../../components/IndicatesRequiredField';
import NavigatorButtons from '../../../components/Navigator/components/NavigatorButtons';
import {
  visionFields,
  pageTouched,
  pageComplete,
  getEventIdSlug,
} from '../constants';
import useTrainingReportRole from '../../../hooks/useTrainingReportRole';
import useTrainingReportTemplateDeterminator from '../../../hooks/useTrainingReportTemplateDeterminator';
import UserContext from '../../../UserContext';
import PocCompleteCheckbox from '../../../components/PocCompleteCheckbox';
import ReadOnlyField from '../../../components/ReadOnlyField';
import PocCompleteView from '../../../components/PocCompleteView';
import { sessionsByEventId } from '../../../fetchers/event';
import AppLoadingContext from '../../../AppLoadingContext';

const Vision = ({ formData }) => {
  const [sessions, setSessions] = useState();
  const { register } = useFormContext();
  const { user } = useContext(UserContext);
  const { isPoc } = useTrainingReportRole(formData, user.id);
  const showReadOnlyView = useTrainingReportTemplateDeterminator(formData, isPoc);
  const { setIsAppLoading } = useContext(AppLoadingContext);

  useEffect(() => {
    async function getSessions() {
      try {
        setIsAppLoading(true);
        const res = await sessionsByEventId(getEventIdSlug(formData.eventId));
        setSessions(res);
      } catch (e) {
        setSessions([]);
      } finally {
        setIsAppLoading(false);
      }
    }

    if (!sessions && formData.eventId) {
      getSessions();
    }
  }, [formData.eventId, sessions, setIsAppLoading]);

  if (showReadOnlyView) {
    return (
      <PocCompleteView formData={formData} userId={user.id} reportType="training">
        <Helmet>
          <title>Vision</title>
        </Helmet>
        <>
          <ReadOnlyField label="Event vision">
            {formData.vision}
          </ReadOnlyField>
        </>
      </PocCompleteView>
    );
  }

  return (
    <div className="padding-x-1">
      <Helmet>
        <title>Vision</title>
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
      <PocCompleteCheckbox
        userId={user.id}
        isPoc={isPoc}
      />
    </div>
  );
};

Vision.propTypes = {
  formData: PropTypes.shape({
    eventId: PropTypes.string,
    pocComplete: PropTypes.bool,
    event: PropTypes.shape({
      id: PropTypes.number,
    }),
    vision: PropTypes.string,
  }).isRequired,
};

const ReviewSection = () => <><h2>Vision</h2></>;
const fields = Object.keys(visionFields);
const path = 'vision';
const position = 2;

export const isPageComplete = (hookForm) => pageComplete(hookForm, fields);

export default {
  position,
  label: 'Vision',
  path,
  fields,
  isPageTouched: (hookForm) => pageTouched(hookForm.formState.touched, fields),
  reviewSection: () => <ReviewSection />,
  review: false,
  render: (
    _additionalData,
    formData,
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
      <Vision formData={formData} />
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
