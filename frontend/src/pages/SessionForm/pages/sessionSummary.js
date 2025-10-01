import React, {
  useState,
  useEffect,
  useContext,
  useRef,
} from 'react';
import { SUPPORT_TYPES, TRAINING_REPORT_STATUSES } from '@ttahub/common';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import {
  useFormContext,
  Controller,
  useFieldArray,
  useController,
} from 'react-hook-form';
import {
  TextInput,
  Fieldset,
  Label,
  Textarea,
  Dropdown,
  Radio,
  Button,
  ErrorMessage,
} from '@trussworks/react-uswds';
import Select from 'react-select';
import { getTopics } from '../../../fetchers/topics';
import { getNationalCenters } from '../../../fetchers/nationalCenters';
import IndicatesRequiredField from '../../../components/IndicatesRequiredField';
import ControlledDatePicker from '../../../components/ControlledDatePicker';
import Req from '../../../components/Req';
import selectOptionsReset from '../../../components/selectOptionsReset';
import QuestionTooltip from '../../../components/QuestionTooltip';
import {
  sessionSummaryFields,
  pageComplete,
  NO_ERROR,
  sessionSummaryRequiredFields,
} from '../constants';
import FormItem from '../../../components/FormItem';
import FileTable from '../../../components/FileUploader/FileTable';
import Dropzone from '../../../components/FileUploader/Dropzone';
import PlusButton from '../../../components/GoalForm/PlusButton';
import AppLoadingContext from '../../../AppLoadingContext';
import { uploadSessionObjectiveFiles, deleteSessionObjectiveFile } from '../../../fetchers/session';
import SessionObjectiveResource from '../components/SessionObjectiveResource';
import Drawer from '../../../components/Drawer';
import SupportTypeDrawer from '../../../components/SupportTypeDrawer';
import ContentFromFeedByTag from '../../../components/ContentFromFeedByTag';
import IpdCourseSelect from '../../../components/ObjectiveCourseSelect';
import { mustBeQuarterHalfOrWhole } from '../../../Constants';

const DEFAULT_RESOURCE = {
  value: '',
};

const SessionSummary = ({ datePickerKey, event }) => {
  const { setIsAppLoading, setAppLoadingText } = useContext(AppLoadingContext);

  const {
    getValues,
    register,
    watch,
    setValue,
    control,
    formState: { errors },
    setError,
  } = useFormContext();

  const data = getValues();

  const { id } = data;

  const { startDate: eventStartDate } = (event || { data: { startDate: null } }).data;

  const startDate = watch('startDate');
  const endDate = watch('endDate');
  const courses = watch('courses');

  // ref for topics guidance drawer
  const drawerTriggerRef = useRef(null);
  const supportTypeDrawerTriggerRef = useRef(null);

  // we store this to cause the end date to re-render when updated by the start date (and only then)
  const [endDateKey, setEndDateKey] = useState('endDate-');

  const setEndDate = (newEnd) => {
    setValue('endDate', newEnd);

    // this will trigger the re-render of the
    // uncontrolled end date input
    // it's a little clumsy, but it does work
    setEndDateKey(`endDate-${newEnd}`);
  };

  // we also need to fetch topics
  const [topicOptions, setTopicOptions] = useState(null);
  // for fetching topic options from API
  useEffect(() => {
    async function fetchTopics() {
      try {
        const topics = await getTopics();
        topics.sort((a, b) => a.name.localeCompare(b.name));
        setTopicOptions(topics);
      } catch (err) {
        setError('objectiveTopics', { message: 'There was an error fetching topics' });
        setTopicOptions([]);
      }
    }
    if (!topicOptions) {
      fetchTopics();
    }
  }, [setError, topicOptions]);

  const [trainerOptions, setTrainerOptions] = useState(null);
  useEffect(() => {
    async function fetchNationalCenters() {
      try {
        const { centers } = await getNationalCenters();
        setTrainerOptions(centers);
      } catch (err) {
        setError('objectiveTrainers', { message: 'There was an error fetching objective trainers' });
        setTrainerOptions([]);
      }
    }

    if (!trainerOptions) {
      fetchNationalCenters();
    }
  }, [setError, trainerOptions]);

  // for the resource repeater we are using the built in hook-form
  // field array
  const {
    fields: resources,
    append: appendResource,
    remove: removeResource,
  } = useFieldArray({
    control,
    name: 'objectiveResources',
    defaultValue: [
      DEFAULT_RESOURCE,
    ],
  });

  // Use courses.
  const {
    field: {
      onChange: onChangeUseIpdCourses,
      onBlur: onBlurUseIpdCourses,
      value: objectiveUseIpdCourses,
      name: objectiveUseIpdCoursesInputName,
    },
  } = useController({
    name: 'useIpdCourses',
    defaultValue: false,
  });

  // Selected courses.
  const {
    field: {
      onChange: onChangeIpdCourses,
      onBlur: onBlurIpdCourses,
      value: objectiveIpdCourses,
      name: objectiveIpdCoursesInputName,
    },
  } = useController({
    name: 'courses',
    defaultValue: courses || [],
    rules: {
      validate: (value) => !objectiveUseIpdCourses || (objectiveUseIpdCourses && value.length > 0) || 'Select at least one course',
    },
  });

  useEffect(() => {
    // there should be at least one resource
    if (!resources.length) {
      appendResource(DEFAULT_RESOURCE);
    }
  }, [appendResource, resources.length]);

  // for the file repeater we are using the built in hook-form
  // field array
  const {
    fields: files,
    remove: removeFile,
    append: appendFile,
  } = useFieldArray({
    keyName: 'fileKey',
    control,
    name: 'files',
    defaultValue: [],
  });

  const [fileUploadMessage, setFileUploadErrorMessage] = useState(null);

  const [useFiles, setUseFiles] = useState(files.length > 0);

  useEffect(() => {
    if (files.length > 0 && !useFiles) {
      setUseFiles(files.length > 0);
    }
  }, [files.length, useFiles]);

  const handleDrop = async (uploadedFiles) => {
    try {
      setAppLoadingText('Uploading');
      setIsAppLoading(true);
      const uploadResults = await uploadSessionObjectiveFiles(id, uploadedFiles);
      appendFile(uploadResults);
      setFileUploadErrorMessage(null);
    } catch (error) {
      setFileUploadErrorMessage('File could not be uploaded');
    } finally {
      setIsAppLoading(false);
    }
  };

  const deleteFile = async (fileIndex) => {
    try {
      setAppLoadingText('Deleting');
      setIsAppLoading(true);
      await deleteSessionObjectiveFile(String(id), String(files[fileIndex].id));
      removeFile(fileIndex);
    } catch (error) {
      setFileUploadErrorMessage('File could not be deleted');
    } finally {
      setIsAppLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>
          Session Summary
        </title>
      </Helmet>
      <IndicatesRequiredField />

      <div className="margin-top-2">
        <FormItem
          label="Session name "
          name="sessionName"
          htmlFor="sessionName"
          required
        >
          <TextInput
            id="sessionName"
            name="sessionName"
            type="text"
            required
            inputRef={register({ required: 'Enter session name' })}
          />
        </FormItem>
      </div>

      <div className="margin-top-2">
        <FormItem
          label="Session start date"
          name="startDate"
          id="startDate-label"
          htmlFor="startDate"
          required
        >
          <div
            className="usa-hint"
          >
            mm/dd/yyyy
          </div>
          <ControlledDatePicker
            key={`startDate-${datePickerKey}`}
            control={control}
            name="startDate"
            value={startDate}
            setEndDate={setEndDate}
            isStartDate
            inputId="startDate"
            endDate={endDate}
            minDate={eventStartDate}
            customValidationMessages={{
              afterMessage: 'Date selected can\'t be before event start date.',
            }}
          />
        </FormItem>

        <FormItem
          label="Session end date"
          name="endDate"
          id="endDate-label"
          htmlFor="endDate"
          required
        >
          <div
            className="usa-hint"
          >
            mm/dd/yyyy
          </div>
          <ControlledDatePicker
            control={control}
            name="endDate"
            inputId="endDate"
            value={endDate}
            minDate={startDate}
            key={`${endDateKey}-${datePickerKey}`}
          />
        </FormItem>
      </div>

      <div className="margin-top-2">
        <FormItem
          label="Duration in hours (round to the nearest quarter hour) "
          name="duration"
        >
          <div className="maxw-card-lg">
            <TextInput
              id="duration"
              name="duration"
              type="number"
              min={0}
              max={99.5}
              step={0.25}
              inputRef={
                register({
                  required: 'Enter duration',
                  valueAsNumber: true,
                  validate: {
                    mustBeQuarterHalfOrWhole,
                  },
                  min: { value: 0.25, message: 'Duration must be greater than 0 hours' },
                  max: { value: 99, message: 'Duration must be less than or equal to 99 hours' },
                })
              }
              required
            />
          </div>
        </FormItem>
      </div>

      <FormItem
        label="Session context "
        name="context"
        required
      >
        <Textarea
          id="context"
          name="context"
          inputRef={register({
            required: 'Describe the session context',
          })}
          required
        />
      </FormItem>

      <h3 className="margin-top-4 margin-bottom-3">Objective summary</h3>
      <FormItem
        label="Session objective "
        name="objective"
        required
      >
        <Textarea
          id="objective"
          name="objective"
          inputRef={register({
            required: 'Describe the session objective',
          })}
          required
        />
      </FormItem>

      <div className="margin-top-2">
        <Drawer
          triggerRef={drawerTriggerRef}
          stickyHeader
          stickyFooter
          title="Topic guidance"
        >
          <ContentFromFeedByTag className="ttahub-drawer--objective-topics-guidance" tagName="ttahub-topic" contentSelector="table" />
        </Drawer>
        <FormItem
          required={false}
          htmlFor="objectiveTopics"
          label={(
            <>
              Topics
              {' '}
              <Req />
              <button
                type="button"
                className="usa-button usa-button--unstyled margin-left-1"
                ref={drawerTriggerRef}
              >
                Get help choosing topics
              </button>
            </>
          )}
          name="objectiveTopics"
        >
          <Controller
            render={({ onChange: controllerOnChange, value, onBlur }) => (
              <Select
                value={(topicOptions || []).filter((option) => (
                  value.includes(option.name)
                ))}
                inputId="objectiveTopics"
                name="objectiveTopics"
                className="usa-select"
                styles={selectOptionsReset}
                components={{
                  DropdownIndicator: null,
                }}
                onBlur={onBlur}
                onChange={(s) => {
                  controllerOnChange(s.map((o) => o.name));
                }}
                inputRef={register({ required: 'Select at least one topic' })}
                getOptionLabel={(option) => option.name}
                getOptionValue={(option) => option.id}
                options={topicOptions || []}
                isMulti
                required
              />
            )}
            control={control}
            rules={{
              validate: (value) => {
                if (!value || value.length === 0) {
                  return 'Select at least one topic';
                }
                return true;
              },
            }}
            name="objectiveTopics"
            defaultValue={[]}
          />
        </FormItem>
      </div>

      <div className="margin-top-2">
        <FormItem
          label="Who were the trainers for this session?"
          name="objectiveTrainers"
          required
        >
          <Controller
            render={({ onChange: controllerOnChange, value, onBlur }) => (
              <Select
                value={(trainerOptions || []).filter((option) => (
                  value.includes(option.name)
                ))}
                inputId="objectiveTrainers"
                name="objectiveTrainers"
                className="usa-select"
                styles={selectOptionsReset}
                onBlur={onBlur}
                components={{
                  DropdownIndicator: null,
                }}
                onChange={(s) => {
                  controllerOnChange(s.map((o) => o.name));
                }}
                inputRef={register({ required: 'Select at least one trainer' })}
                options={trainerOptions || []}
                getOptionLabel={(option) => option.name}
                getOptionValue={(option) => option.id}
                isMulti
                required
              />
            )}
            control={control}
            rules={{
              validate: (value) => {
                if (!value || value.length === 0) {
                  return 'Select at least one trainer';
                }
                return true;
              },
            }}
            name="objectiveTrainers"
            defaultValue={[]}
          />
        </FormItem>
      </div>
      <IpdCourseSelect
        error={errors.courses ? <ErrorMessage>{errors.courses.message}</ErrorMessage> : NO_ERROR}
        inputName={objectiveIpdCoursesInputName}
        onChange={onChangeIpdCourses}
        onBlur={onBlurIpdCourses}
        value={objectiveIpdCourses}
        onChangeUseIpdCourses={onChangeUseIpdCourses}
        onBlurUseIpdCourses={onBlurUseIpdCourses}
        useIpdCourse={objectiveUseIpdCourses}
        useCoursesInputName={objectiveUseIpdCoursesInputName}
        className="margin-y-3"
      />
      <Fieldset>
        <legend>
          Did you use any other TTA resources that are available as a link?
          <QuestionTooltip
            text="Copy & paste web address of TTA resource you'll use for this objective. Usually a HeadStart.gov page."
          />
        </legend>
        <div className="ttahub-resource-repeater">
          {resources.map((r, i) => {
            const fieldErrors = errors.objectiveResources ? errors.objectiveResources[i] : null;

            return (
              <SessionObjectiveResource
                key={r.id}
                index={i}
                errors={errors}
                fieldErrors={fieldErrors}
                resource={r}
                showRemoveButton={resources.length > 1}
                removeResource={removeResource}
              />
            );
          })}
        </div>

        <div className="ttahub-resource-repeater--add-new margin-top-1">
          <PlusButton text="Add new resource" onClick={() => appendResource(DEFAULT_RESOURCE)} />
        </div>
      </Fieldset>

      <Fieldset className="ttahub-objective-files margin-top-3">
        <legend>
          Did you use any other TTA resources that aren&apos;t available as a link?
          {' '}
          <QuestionTooltip
            text={(
              <div>
                Examples include:
                {' '}
                <ul className="usa-list">
                  <li>Presentation slides from PD events</li>
                  <li>PDF&apos;s you created from multiple TTA resources</li>
                  <li>Other OHS-provided resources</li>
                </ul>
              </div>
            )}
          />
        </legend>
        <Radio
          label="Yes"
          value="yes"
          id="addObjectiveFilesYes"
          checked={useFiles}
          name="addObjectiveFiles"
          onChange={() => setUseFiles(true)}
        />
        <Radio
          label="No"
          value="no"
          id="addObjectiveFilesNo"
          name="addObjectiveFiles"
          checked={!useFiles}
          onChange={() => setUseFiles(false)}
        />

        { useFiles ? (
          <>
            <ErrorMessage>{fileUploadMessage}</ErrorMessage>
            <Label htmlFor="files">Attach any non-link resources</Label>
            <span className="usa-hint display-block">Example file types: .docx, .pdf, .ppt (max size 30 MB)</span>
            <Dropzone
              handleDrop={handleDrop}
              inputName="objectiveFiles"
              setErrorMessage={setFileUploadErrorMessage}
            />
            <FileTable
              onFileRemoved={deleteFile}
              files={files.map((f) => ({ ...f, showDelete: true }))}
            />
          </>
        ) : null}

      </Fieldset>

      <FormItem
        label="TTA provided "
        name="ttaProvided"
        required
      >
        <Textarea
          required
          id="ttaProvided"
          name="ttaProvided"
          inputRef={register({
            required: 'Describe the tta provided',
          })}
        />
      </FormItem>

      <div className="margin-top-2">
        <SupportTypeDrawer
          drawerTriggerRef={supportTypeDrawerTriggerRef}
        />
        <div className="display-flex flex-align-baseline">
          <Label htmlFor="objectiveSupportType">
            <>
              Support type
              {' '}
              <Req />
            </>
          </Label>
          <button
            type="button"
            className="usa-button__support-type-drawer-trigger usa-button usa-button--unstyled margin-left-1"
            ref={supportTypeDrawerTriggerRef}
          >
            Get help choosing a support type
          </button>
        </div>
        <Dropdown
          id="objectiveSupportType"
          name="objectiveSupportType"
          inputRef={register({ required: 'Select a support type' })}
          defaultValue=""
          required
        >
          <option disabled hidden value="">Select one</option>
          {SUPPORT_TYPES.map((option) => (<option key={option}>{option}</option>))}
        </Dropdown>
      </div>

    </>
  );
};

SessionSummary.propTypes = {
  datePickerKey: PropTypes.string.isRequired,
  event: PropTypes.shape({
    data: PropTypes.shape({
      endDate: PropTypes.string,
    }),
  }),
};

SessionSummary.defaultProps = {
  event: null,
};

const fields = [...Object.keys(sessionSummaryFields), 'endDate', 'startDate'];
const requiredFields = [...Object.keys(sessionSummaryRequiredFields), 'endDate', 'startDate'];
const path = 'session-summary';
const position = 1;

const ReviewSection = () => <><h2>Event summary</h2></>;
export const isPageComplete = (hookForm) => {
  const { useIpdCourses } = hookForm.getValues();

  if (useIpdCourses) {
    return pageComplete(hookForm, [...requiredFields, 'courses']);
  }

  return pageComplete(hookForm, requiredFields);
};

export default {
  position,
  label: 'Session summary',
  path,
  reviewSection: () => <ReviewSection />,
  review: false,
  fields,
  render: (
    additionalData,
    _formData,
    _reportId,
    isAppLoading,
    onContinue,
    onSaveDraft,
    _onUpdatePage,
    _weAreAutoSaving,
    datePickerKey,
    onFormSubmit,
    Alert,
  ) => (
    <div className="padding-x-1">
      <SessionSummary datePickerKey={datePickerKey} event={additionalData.event} />
      <Alert />
      <div className="display-flex">
        {
          !additionalData.isAdminUser
            ? (
              <Button id={`${path}-save-continue`} className="margin-right-1" type="button" disabled={isAppLoading} onClick={onFormSubmit}>Review and submit</Button>
            )
            : <Button id={`${path}-save-continue`} className="margin-right-1" type="button" disabled={isAppLoading} onClick={onContinue}>{additionalData.status !== TRAINING_REPORT_STATUSES.COMPLETE ? 'Save and continue' : 'Continue' }</Button>
        }
        {
          // if status is 'Completed' then don't show the save draft button.
          additionalData
          && additionalData.status
          && additionalData.status !== TRAINING_REPORT_STATUSES.COMPLETE && (
            <Button id={`${path}-save-draft`} className="usa-button--outline" type="button" disabled={isAppLoading} onClick={onSaveDraft}>Save draft</Button>
          )
        }
      </div>
    </div>
  ),
  isPageComplete,
};
