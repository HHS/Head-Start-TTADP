import React, {
  useState,
  useEffect,
  useContext,
} from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { useFormContext, Controller, useFieldArray } from 'react-hook-form';
import {
  TextInput,
  Fieldset,
  Label,
  Textarea,
  Button,
  Dropdown,
  Radio,
} from '@trussworks/react-uswds';
import Select from 'react-select';
import { v4 as uuidv4 } from 'uuid';
import { getTopics } from '../../../fetchers/topics';
import IndicatesRequiredField from '../../../components/IndicatesRequiredField';
import NavigatorButtons from '../../../components/Navigator/components/NavigatorButtons';
import ReadOnlyField from '../../../components/ReadOnlyField';
import ControlledDatePicker from '../../../components/ControlledDatePicker';
import HookFormRichEditor from '../../../components/HookFormRichEditor';
import Req from '../../../components/Req';
import selectOptionsReset from '../../../components/selectOptionsReset';
import QuestionTooltip from '../../../components/GoalForm/QuestionTooltip';
import colors from '../../../colors';
import {
  sessionSummaryFields,
  pageComplete,
  pageTouched,
} from '../constants';
import FormItem from '../../../components/FormItem';
import FileTable from '../../../components/FileUploader/FileTable';
import Dropzone from '../../../components/FileUploader/Dropzone';
import PlusButton from '../../../components/GoalForm/PlusButton';
import { isValidResourceUrl } from '../../../components/GoalForm/constants';
import AppLoadingContext from '../../../AppLoadingContext';
import { uploadSessionObjectiveFiles, deleteSessionObjectiveFile } from '../../../fetchers/session';

const DEFAULT_RESOURCE = {
  key: uuidv4(),
  value: '',
};

// options for the trainers (the 4 national centers)
const TRAINER_OPTIONS = [
  'DTL',
  'HBHS',
  'PFCE',
  'PFMO',
].map((label, value) => ({ label, value }));

const SessionSummary = ({ datePickerKey }) => {
  const {
    getValues,
    register,
    watch,
    setValue,
    control,
  } = useFormContext();

  const data = getValues();

  const {
    eventDisplayId,
    eventName,
    id,
  } = data;

  const startDate = watch('startDate');
  const endDate = watch('endDate');

  const { setIsAppLoading, setAppLoadingText } = useContext(AppLoadingContext);

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
  const [topicOptions, setTopicOptions] = useState([]);
  // for fetching topic options from API
  useEffect(() => {
    async function fetchTopics() {
      try {
        const topics = await getTopics();
        setTopicOptions(topics);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
      }
    }
    fetchTopics();
  }, []);

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

  const [, setFileUploadErrorMessage] = useState(null);

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
      setFileUploadErrorMessage('File(s) could not be uploaded');
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
      // eslint-disable-next-line no-console
      console.error(error);
    } finally {
      setIsAppLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Event summary</title>
      </Helmet>
      <IndicatesRequiredField />

      <ReadOnlyField label="Event ID">
        {eventDisplayId}
        { /** todo - once the event "view" page is created, convert this to a link to that */}
      </ReadOnlyField>

      <ReadOnlyField label="Event name">
        {eventName}
      </ReadOnlyField>

      <div className="margin-top-2">
        <FormItem
          label="Session name"
          name="sessionName"
          htmlFor="sessionName"
        >
          <TextInput
            id="sessionName"
            name="sessionName"
            type="text"
            required
            inputRef={register({ required: 'Enter a session name' })}
          />
        </FormItem>
      </div>

      <Fieldset>
        <div className="margin-top-2">
          <FormItem
            label="Session start date"
            name="startDate"
            id="startDate-label"
            htmlFor="startDate"
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
            />
          </FormItem>

          <FormItem
            label="Session end date"
            name="endDate"
            id="endDate-label"
            htmlFor="endDate"
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
      </Fieldset>

      <div className="margin-top-2">
        <FormItem
          label="Duration in hours (round to the nearest quarter hour)"
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
              pattern: { value: /^\d+(\.[0,5]{1})?$/, message: 'Duration must be rounded to the nearest quarter hour' },
              min: { value: 0.25, message: 'Duration must be greater than 0 hours' },
              max: { value: 99, message: 'Duration must be less than or equal to 99 hours' },
            })
            }
            />
          </div>
        </FormItem>
      </div>

      <Label htmlFor="context">Session context</Label>
      <div className="smart-hub--text-area__resize-vertical margin-top-1">
        <HookFormRichEditor ariaLabel="Context" name="context" id="context" required />
      </div>

      <h3>Objective summary</h3>
      <FormItem
        label="Session objective"
        name="objective"
        required
      >
        <Textarea
          id="objective"
          name="objective"
          inputRef={register({
            required: 'Enter an objective',
          })}
        />
      </FormItem>

      <div className="margin-top-2">
        <Label htmlFor="objectiveTopics">
          Topics
          <Req />
        </Label>
        <Controller
          render={({ onChange: controllerOnChange, value }) => (
            <Select
              value={topicOptions.filter((option) => (
                value.includes(option.name)
              ))}
              inputId="objectiveTopics"
              name="objectiveTopics"
              className="usa-select"
              styles={selectOptionsReset}
              components={{
                DropdownIndicator: null,
              }}
              onChange={(s) => {
                controllerOnChange(s.map((o) => o.name));
              }}
              inputRef={register({ required: 'Select one' })}
              getOptionLabel={(option) => option.name}
              getOptionValue={(option) => option.id}
              options={topicOptions}
              isMulti
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
      </div>

      <div className="margin-top-2">
        <Label htmlFor="objectiveTrainers">
          Who were the trainers for this session?
          <Req />
        </Label>
        <Controller
          render={({ onChange: controllerOnChange, value: selectedValue }) => (
            <Select
              value={TRAINER_OPTIONS.filter((option) => selectedValue.includes(option.label))}
              inputId="objectiveTrainers"
              name="objectiveTrainers"
              className="usa-select"
              styles={selectOptionsReset}
              components={{
                DropdownIndicator: null,
              }}
              onChange={(s) => {
                controllerOnChange(s.map((o) => o.label));
              }}
              inputRef={register({ required: 'Select one' })}
              options={TRAINER_OPTIONS}
              isMulti
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
      </div>

      <div>
        <Label htmlFor="resources">
          Link to TTA resources used
          <QuestionTooltip
            text="Copy & paste web address of TTA resource you'll use for this objective. Usually an ECLKC page."
          />
        </Label>
        <div className="ttahub-resource-repeater">
          {resources.map((r, i) => (
            <div key={r.key} className="display-flex">
              <Label htmlFor={`resource-${i + 1}`} className="sr-only">
                Resource
                {' '}
                { i + 1 }
              </Label>
              <TextInput
                type="url"
                name={`objectiveResources[${i}].value`}
                inputRef={register({
                  isValidUrl: (value) => isValidResourceUrl(value) || 'Enter a valid URL',
                })}
                defaultValue={r.value}
              />
              { resources.length > 1 ? (
                <Button className="ttahub-resource-repeater--remove-resource" unstyled type="button" onClick={() => removeResource(i)}>
                  <FontAwesomeIcon className="margin-x-1" color={colors.ttahubMediumBlue} icon={faTrash} />
                  <span className="sr-only">
                    remove resource
                    {' '}
                    { i + 1 }
                  </span>
                </Button>
              ) : null}
            </div>
          ))}
        </div>

        <div className="ttahub-resource-repeater--add-new margin-top-1 margin-bottom-3">
          <PlusButton text="Add new resource" onClick={() => appendResource(DEFAULT_RESOURCE)} />
        </div>
      </div>

      <Fieldset className="ttahub-objective-files margin-top-1">
        <legend>
          Did you use any TTA resources that aren&apos;t available as a link?
          {' '}
          <span className="smart-hub--form-required font-family-sans font-ui-xs">*</span>
          <QuestionTooltip
            text={(
              <div>
                Examples include:
                {' '}
                <ul className="usa-list">
                  <li>Presentation slides from PD events</li>
                  <li>PDF&apos;s you created from multiple tta resources</li>
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
            <Label htmlFor="files">Attach any non-link resources</Label>
            <span className="usa-hint display-block">Example file types: .docx, .pdf, .ppt (max size 30 MB)</span>
            <Dropzone
              handleDrop={handleDrop}
              onBlur={() => {}}
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

      <div className="margin-top-2">
        <Label htmlFor="objectiveContentLevel">
          Content level
          <Req />
        </Label>

        <Dropdown
          id="objectiveContentLevel"
          name="objectiveContentLevel"
          inputRef={register({ required: 'Select one' })}
          defaultValue=""
        >
          <option disabled hidden value="">Select one</option>
          {[
            'Introducing',
            'Planning',
            'Implementing',
            'Maintaining',
          ].map((option) => (<option key={option}>{option}</option>))}
        </Dropdown>
      </div>

    </>
  );
};

SessionSummary.propTypes = {
  datePickerKey: PropTypes.string.isRequired,
};

const fields = Object.keys(sessionSummaryFields);
const path = 'session-summary';
const position = 1;

const ReviewSection = () => <><h2>Event summary</h2></>;
export const isPageComplete = (hookForm) => pageComplete(hookForm, fields);

export default {
  position,
  label: 'Session summary',
  path,
  reviewSection: () => <ReviewSection />,
  review: false,
  fields,
  isPageTouched: (hookForm) => pageTouched(hookForm.formState.touched, fields),
  render: (
    _additionalData,
    _formData,
    _reportId,
    isAppLoading,
    onContinue,
    onSaveDraft,
    onUpdatePage,
    _weAreAutoSaving,
    datePickerKey,
  ) => (
    <>
      <SessionSummary dataPickerKey={datePickerKey} />
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
