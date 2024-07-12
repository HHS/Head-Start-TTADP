import React, {
  useContext,
} from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { LANGUAGES } from '@ttahub/common';
import { useFormContext } from 'react-hook-form';
import useDeepCompareEffect from 'use-deep-compare-effect';
import {
  Button,
  Radio,
} from '@trussworks/react-uswds';
import IndicatesRequiredField from '../../../components/IndicatesRequiredField';
import MultiSelect from '../../../components/MultiSelect';
import {
  participantsFields,
  pageComplete,
} from '../constants';
import { recipientParticipants } from '../../ActivityReport/constants'; // TODO - move to @ttahub/common
import ParticipantsNumberOfParticipants from '../components/ParticipantsNumberOfParticipants';
import FormItem from '../../../components/FormItem';
import useTrainingReportRole from '../../../hooks/useTrainingReportRole';
import useTrainingReportTemplateDeterminator from '../../../hooks/useTrainingReportTemplateDeterminator';
import UserContext from '../../../UserContext';
import RecipientsWithGroups from '../../../components/RecipientsWithGroups';
import ParticipantsReadOnly from '../components/ParticipantsReadOnly';

const placeholderText = '- Select -';

const ROLE_OPTIONS = [
  'Admin. Assistant',
  'COR',
  'Early Childhood Manager',
  'Early Childhood Specialist',
  'Family Engagement Specialist',
  'Grantee Specialist',
  'Grantee Specialist Manager',
  'Grants Management Specialist',
  'Health Specialist',
  'Program Specialist',
  'Region Program Manager',
  'Supervisory Program Specialist',
  'System Specialist',
  'TTAC',
];

const Participants = ({ formData }) => {
  const {
    control,
    register,
    watch,
    setValue,
  } = useFormContext();

  const { user } = useContext(UserContext);
  const { isPoc } = useTrainingReportRole(formData.event, user.id);
  const showReadOnlyView = useTrainingReportTemplateDeterminator(formData, isPoc);
  const isHybrid = watch('deliveryMethod') === 'hybrid';
  const isIstVisit = watch('isIstVisit') === 'yes';
  const isNotIstVisit = watch('isIstVisit') === 'no';

  const regionId = watch('regionId');
  const eventRegionId = formData.event ? formData.event.regionId : null;

  // handle existing sessions
  useDeepCompareEffect(() => {
    const {
      istSelectionComplete,
      recipients,
      participants,
      numberOfParticipantsInPerson,
      numberOfParticipantsVirtually,
      numberOfParticipants,
    } = formData;

    const formStarted = (
      recipients && recipients.length
    ) || (
      participants && participants.length
    ) || numberOfParticipantsInPerson
    || numberOfParticipantsVirtually
    || numberOfParticipants;

    if (!istSelectionComplete && formStarted) {
      setValue('isIstVisit', 'no');
    }

    if (!istSelectionComplete) {
      setValue('istSelectionComplete', true);
    }
  }, [formData, setValue]);

  // clear values between toggles
  useDeepCompareEffect(() => {
    if (isIstVisit) {
      setValue('recipients', []);
      setValue('participants', []);
    }

    if (isNotIstVisit) {
      setValue('regionalOfficeTta', []);
    }
  }, [isIstVisit, isNotIstVisit, setValue]);

  if (showReadOnlyView) {
    return (
      <ParticipantsReadOnly
        formData={formData}
        userId={user.id}
      />
    );
  }

  return (
    <>
      <Helmet>
        <title>Session Participants</title>
      </Helmet>
      <IndicatesRequiredField />
      <FormItem
        label="Is this an IST visit?"
        name="isIstVisit"
        fieldSetWrapper
      >
        <Radio
          id="is-ist-visit-yes"
          name="isIstVisit"
          label="Yes"
          value="yes"
          className="smart-hub--report-checkbox"
          inputRef={register({ required: 'Select one' })}
        />

        <Radio
          id="is-ist-visit-no"
          name="isIstVisit"
          label="No"
          value="no"
          className="smart-hub--report-checkbox"
          inputRef={register({ required: 'Select one' })}
        />
        <input type="hidden" name="istSelectionComplete" ref={register} />
      </FormItem>

      {isNotIstVisit && (
        <>
          <RecipientsWithGroups
            regionId={regionId || eventRegionId}
          />
          <div className="margin-top-2">
            <FormItem
              label="Recipient participants"
              name="participants"
            >
              <MultiSelect
                name="participants"
                control={control}
                placeholderText={placeholderText}
                options={
              recipientParticipants
                .map((participant) => ({ value: participant, label: participant }))
                }
                required="Select at least one participant"
              />
            </FormItem>
          </div>
        </>
      )}

      {isIstVisit && (
      <div className="margin-top-2">
        <FormItem
          label="Regional Office/TTA "
          name="regionalOfficeTta"
        >
          <MultiSelect
            name="regionalOfficeTta"
            control={control}
            placeholderText={placeholderText}
            options={
              ROLE_OPTIONS
                .map((role) => ({ value: role, label: role }))
            }
            required="Select at least one"
          />
        </FormItem>
      </div>
      )}

      {(isIstVisit || isNotIstVisit) && (
      <>
        <ParticipantsNumberOfParticipants
          isHybrid={isHybrid}
          register={register}
        />
      </>
      )}
      <div className="margin-top-2">
        <FormItem
          label="How was the activity conducted?"
          name="deliveryMethod"
          fieldSetWrapper
        >
          <Radio
            id="delivery-method-in-person"
            name="deliveryMethod"
            label="In Person"
            value="in-person"
            className="smart-hub--report-checkbox"
            inputRef={register({ required: 'Select one' })}
          />

          <Radio
            id="delivery-method-virtual"
            name="deliveryMethod"
            label="Virtual"
            value="virtual"
            className="smart-hub--report-checkbox"
            inputRef={register({ required: 'Select one' })}
          />

          <Radio
            id="delivery-method-hybrid"
            name="deliveryMethod"
            label="Hybrid"
            value="hybrid"
            className="smart-hub--report-checkbox"
            inputRef={register({ required: 'Select one' })}
          />
        </FormItem>
        <div className="margin-top-2">
          <FormItem
            label="Language used"
            name="language"
          >
            <MultiSelect
              name="language"
              control={control}
              placeholderText={placeholderText}
              options={
              LANGUAGES
                .map((language) => ({ value: language, label: language }))
            }
              required="Select at least one language"
            />
          </FormItem>
        </div>
      </div>
    </>
  );
};

Participants.propTypes = {
  formData: PropTypes.shape({
    recipients: PropTypes.arrayOf(PropTypes.shape({
      label: PropTypes.string,
    })),
    regionId: PropTypes.number,
    istSelectionComplete: PropTypes.bool,
    event: PropTypes.shape({
      id: PropTypes.number,
      name: PropTypes.string,
      displayId: PropTypes.string,
      status: PropTypes.string,
      pageState: PropTypes.objectOf(PropTypes.string),
      regionId: PropTypes.number,
    }),
    numberOfParticipants: PropTypes.number,
    numberOfParticipantsInPerson: PropTypes.number,
    numberOfParticipantsVirtually: PropTypes.number,
    participants: PropTypes.arrayOf(PropTypes.string),
    deliveryMethod: PropTypes.string,
    language: PropTypes.arrayOf(PropTypes.string),
    isIstVisit: PropTypes.string,
    regionalOfficeTta: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
};

const fields = Object.keys(participantsFields);
const path = 'participants';
const position = 2;

const ReviewSection = () => <><h2>Event summary</h2></>;
export const isPageComplete = (hookForm) => {
  const { isIstVisit } = hookForm.getValues();

  if (isIstVisit === 'yes') {
    return pageComplete(hookForm, [...fields, 'regionalOfficeTta'], true);
  }

  if (isIstVisit === 'no') {
    return pageComplete(hookForm, [...fields, 'recipients', 'participants']);
  }

  return pageComplete(hookForm, fields);
};

export default {
  position,
  label: 'Participants',
  path,
  reviewSection: () => <ReviewSection />,
  review: false,
  fields,
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
    <div className="padding-x-1">
      <Participants formData={formData} />
      <Alert />
      <div className="display-flex">
        <Button id={`${path}-save-continue`} className="margin-right-1" type="button" disabled={isAppLoading} onClick={onContinue}>Save and continue</Button>
        <Button id={`${path}-save-draft`} className="usa-button--outline" type="button" disabled={isAppLoading} onClick={onSaveDraft}>Save draft</Button>
        <Button id={`${path}-back`} outline type="button" disabled={isAppLoading} onClick={() => { onUpdatePage(position - 1); }}>Back</Button>
      </div>
    </div>
  ),
  isPageComplete,
};
