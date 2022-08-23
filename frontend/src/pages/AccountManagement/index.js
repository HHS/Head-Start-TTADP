import React, { useContext, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import {
  Alert,
  Button,
  Dropdown,
  Fieldset,
  Form,
  Grid,
  GridContainer,
  Radio,
} from '@trussworks/react-uswds';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import Avatar from '../../components/Avatar';
import './index.scss';
import UserContext from '../../UserContext';
import { requestVerificationEmail } from '../../fetchers/users';

const frequencyErrorMessage = 'Please select a frequency preference';

const frequencyMap = [
  { key: 'never', label: 'Do not notify me' },
  { key: 'immediately', label: 'Immediately' },
  { key: 'dailyDigest', label: 'Daily digest' },
  { key: 'weeklyDigest', label: 'Weekly digest' },
  { key: 'monthlyDigest', label: 'Monthly digest' },
];

const emailTypesMap = [
  {
    name: 'Activity report submitted for review',
    description: 'We\'ll email you when an activity report is submitted for your approval.',
    keyName: 'submittedForReviewFrequency',
  },
  {
    name: 'Changes requested to activity report',
    description: 'We\'ll email you when an activity report that you created or collaborated on needs action.',
    keyName: 'changesRequestedFrequency',
  },
  {
    name: 'Activity report approved',
    description: 'We\'ll email you when an activity report that you created or collaborated on is approved.',
    keyName: 'approvedFrequency',
  },
  {
    name: 'Added as collaborator',
    description: 'We\'ll email you when you are added as a collaborator to an activity report.',
    keyName: 'addedAsCollaboratorFrequency',
  },
];

function CustomizeEmailPreferencesForm() {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useFormContext();

  return (
    <div>
      <GridContainer>
        <Grid row className="margin-bottom-3">
          <Grid tablet={{ col: 12 }} desktop={{ col: 8 }} />
          <Grid tablet={{ col: 12 }} desktop={{ col: 4 }}>
            <div className="text-bold">Frequency</div>
          </Grid>
        </Grid>

        {/* Changes requested to activity report */}
        {emailTypesMap.map(({ name, description, keyName }) => (
          <Grid row>
            <Grid tablet={{ col: 12 }} desktop={{ col: 8 }}>
              <div className="text-bold">
                {name}
              </div>
              <div>
                {description}
              </div>
            </Grid>
            <Grid tablet={{ col: 12 }} desktop={{ col: 4 }}>
              <Dropdown
                id={keyName}
                name={keyName}
                inputRef={register({ required: frequencyErrorMessage })}
              >
                <option value="">- Select -</option>
                {frequencyMap.map(({ key, label }) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </Dropdown>
              <p className="usa-error-message">{errors[keyName] && errors[keyName].message}</p>
            </Grid>
          </Grid>
        ))}
      </GridContainer>
    </div>
  );
}

function EmailPreferencesForm({ disabled }) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useFormContext();

  const frequency = watch('frequency');

  // eslint-disable-next-line no-unused-vars
  const onSubmit = (_formData) => {};

  useEffect(() => {
  }, [frequency]);

  return (
    <Form disabled={disabled} onSubmit={handleSubmit(onSubmit)} style={{ maxWidth: 'unset' }}>
      <Fieldset>
        <Radio
          id="allImmediately"
          disabled={disabled}
          name="frequency"
          value="all_immediately"
          label="Send me all TTA Hub related emails immediately"
          inputRef={register({ required: frequencyErrorMessage })}
          className="margin-bottom-3"
        />
        <Radio
          id="customized"
          disabled={disabled}
          name="frequency"
          value="customized"
          label="Let me customize the emails I want"
          inputRef={register({ required: frequencyErrorMessage })}
          className="margin-bottom-3"
        />
        {frequency === 'customized' && (
          <div className="margin-bottom-3">
            <CustomizeEmailPreferencesForm />
          </div>
        )}
        <Radio
          id="unsubscribe"
          disabled={disabled}
          name="frequency"
          value="unsubscribe"
          label="Unsubscribe me from all TTA Hub emails"
          inputRef={register({ required: frequencyErrorMessage })}
          className="margin-bottom-3"
        />
        <p className="usa-error-message">{errors.frequency && errors.frequency.message}</p>
      </Fieldset>
      <Button disabled={disabled} type="submit">Save Preferences</Button>
      <Button disabled={disabled} type="reset" outline>
        Cancel
      </Button>
      {/* <input type="submit" /> */}
    </Form>
  );
}

EmailPreferencesForm.propTypes = {
  disabled: PropTypes.bool.isRequired,
};

function AccountManagement() {
  const { user } = useContext(UserContext);
  const emailPrefsFormContext = useForm();
  const [emailValidated, setEmailValidated] = useState(null);
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);

  useEffect(() => {
    const emailValidationStatus = user.validationStatus.find(({ type }) => type === 'email');
    if (emailValidationStatus && emailValidationStatus.validatedAt) {
      setEmailValidated(true);
      return;
    }

    setEmailValidated(false);
  }, [user.validationStatus]);

  const lastLoginFormatted = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(user.lastLogin));

  const sendVerificationEmail = () => {
    requestVerificationEmail()
      .then(() => {
        setEmailVerificationSent(true);
      })
      .catch((error) => {
        console.error('Error sending verification email', error);
      });
  };

  const asdf = () => {
    setEmailVerificationSent(false);
  };

  return (
    <>
      <Helmet>
        <title>Account Management</title>
      </Helmet>

      <h1 className="landing">Account Management</h1>

      {/* Profile box */}
      <div className="bg-white radius-md shadow-2 margin-bottom-3 padding-3">
        <h1 className="margin-bottom-1">Profile</h1>

        {/* Avatar w/ name */}
        <div className="margin-bottom-3">
          <h4 className="margin-0 display-flex flex-align-center padding-bottom-3 border-bottom border-gray-20">
            <Avatar name={user.name} />
            <span className="margin-left-2">{user.name}</span>
          </h4>
        </div>

        {/* Last login */}
        <div>
          <div className="text-bold">Last login</div>
          <div>{lastLoginFormatted}</div>
        </div>
      </div>

      {/* Email preferences box */}
      <div className="bg-white radius-md shadow-2 margin-bottom-3 padding-3">
        <h1 className="margin-bottom-1">Email preferences</h1>

        {!emailValidated && !emailVerificationSent && (
          <Alert
            role="alert"
            className="margin-top-4 margin-bottom-4"
            type="info"
            heading="Please verify your email address"
            headingLevel="h4"
          >
            Before you can receive TTA Hub emails, you must verify your email address.
            Please check your email for a verificaiton link.
            <Button className="display-block margin-top-3" onClick={sendVerificationEmail}>Resend verification email</Button>
          </Alert>
        )}

        {!emailValidated && emailVerificationSent && (
          <Alert
            role="alert"
            className="margin-top-4 margin-bottom-4"
            type="info"
            heading="Please check your email"
            headingLevel="h4"
          >
            An email should be delivered to your inbox
            shortly with a link to verify your email address.
            <Button
              outline
              className="display-block margin-top-3"
              onClick={asdf}
            >
              I have not received an email yet
            </Button>
          </Alert>
        )}

        {/* <FormProvider {...emailPrefsFormContext}> */}
        <FormProvider
          register={emailPrefsFormContext.register}
          handleSubmit={emailPrefsFormContext.handleSubmit}
          watch={emailPrefsFormContext.watch}
          formState={emailPrefsFormContext.formState}
        >
          <EmailPreferencesForm disabled={!emailValidated} />
        </FormProvider>
      </div>
    </>
  );
}

export default AccountManagement;
