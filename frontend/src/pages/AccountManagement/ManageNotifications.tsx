import { Accordion, Alert, Button } from '@trussworks/react-uswds';
import type { AccordionItemProps } from '@trussworks/react-uswds/lib/components/Accordion/Accordion';
import React, { useContext, useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import AppLoadingContext from '../../AppLoadingContext';
import BackLink from '../../components/BackLink';
import Container from '../../components/Container';
import { getEmailSettings, updateSettings } from '../../fetchers/settings';
import UserContext from '../../UserContext';
import { emailTypesMap } from '.';
import ActivityReportNotifications from './components/notifications/ActivityReportNotifications';
import CollabReportNotifications from './components/notifications/CollabReportNotifications';
import CommunicationLogNotifications from './components/notifications/CommunicationLogNotification';
import EmailValidationPreferenceBox from './components/notifications/EmailValidationPreferenceBox';
import OtherNotifications from './components/notifications/OtherNotifications';
import SystemRelatedNotifications from './components/notifications/SystemRelatedNotifications';
import TrainingReportNotifications from './components/notifications/TrainingReportNotifications';

const ITEMS = [
  {
    title: 'Activity Reports',
    content: <ActivityReportNotifications />,
    id: 'activity-report-notifications',
    expanded: true,
    headingLevel: 'h2',
  },
  {
    title: 'Collaboration Reports',
    content: <CollabReportNotifications />,
    id: 'collab-report-notifications',
    expanded: true,
    headingLevel: 'h2',
  },
  {
    title: 'Communication Logs',
    content: <CommunicationLogNotifications />,
    id: 'communication-log-notifications',
    expanded: true,
    headingLevel: 'h2',
  },
  {
    title: 'Training Reports',
    content: <TrainingReportNotifications />,
    id: 'training-report-notifications',
    expanded: true,
    headingLevel: 'h2',
  },
  {
    title: 'System Related',
    content: <SystemRelatedNotifications />,
    id: 'system-related-notifications',
    expanded: true,
    headingLevel: 'h2',
  },
  {
    title: 'Other',
    content: <OtherNotifications />,
    id: 'other-notifications',
    expanded: true,
    headingLevel: 'h2',
  },
] as AccordionItemProps[];

interface SettingFormData {
  emailWhenAddedAsCollaborator: 'never' | 'immediately' | 'daily' | 'weekly';
  emailWhenChangeRequested: 'never' | 'immediately' | 'daily' | 'weekly';
  emailWhenRecipientReportApprovedProgramSpecialist: 'never' | 'immediately' | 'daily' | 'weekly';
  emailWhenReportSubmittedForReview: 'never' | 'immediately' | 'daily' | 'weekly';
  inAppWhenAddedAsCollaborator: boolean;
  inAppWhenChangeRequested: boolean;
  inAppWhenRecipientReportApprovedProgramSpecialist: boolean;
  inAppWhenReportSubmittedForReview: boolean;
}

export default function ManageNotifications({
  updateUser,
}: {
  updateUser: (user: { id: number }) => void;
}): JSX.Element {
  const { user } = useContext(UserContext);
  const { setIsAppLoading } = useContext(AppLoadingContext) as {
    setIsAppLoading: (isLoading: boolean) => void;
  };
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [emailValidated, setEmailValidated] = useState(false);

  const methods = useForm({
    defaultValues: {
      emailWhenAddedAsCollaborator: 'never',
      emailWhenChangeRequested: 'never',
      emailWhenRecipientReportApprovedProgramSpecialist: 'never',
      emailWhenReportSubmittedForReview: 'never',
      inAppWhenAddedAsCollaborator: true,
      inAppWhenChangeRequested: true,
      inAppWhenRecipientReportApprovedProgramSpecialist: true,
      inAppWhenReportSubmittedForReview: true,
    },
  });

  useEffect(() => {
    const emailValidationStatus = user.validationStatus.find(({ type }) => type === 'email');
    if (emailValidationStatus?.validatedAt) {
      setEmailValidated(true);
      return;
    }

    setEmailValidated(false);
  }, [user.validationStatus]);

  useEffect(() => {
    async function fetchSettings() {
      setIsAppLoading(true);
      try {
        const res = await getEmailSettings();
        res.forEach(({ key, value }) => {
          methods.setValue(key, value);
        });
      } catch (_error) {
        // fail silently, form defaults will be used
      } finally {
        setIsAppLoading(false);
      }
    }

    fetchSettings();
  }, [methods.setValue, setIsAppLoading]);

  const onSubmit = async (formData: SettingFormData) => {
    // TODO: this will eventually need to handle in-app settings as well, but for now the only options are email settings
    const newSettings = Object.entries(emailTypesMap).reduce((acc, entry) => {
      const options = entry[1];
      options.forEach((option) => {
        acc.push({ key: option.keyName, value: formData[option.keyName] });
      });
      return acc;
    }, []);

    try {
      setIsAppLoading(true);
      await updateSettings(newSettings);
      setSaveError(false);
      setSaveSuccess(true);
    } catch (error) {
      setSaveSuccess(false);
      setSaveError(error.message ? error.message : error);
    } finally {
      setIsAppLoading(false);
    }
  };

  return (
    <>
      <BackLink to="/notifications">Back to Notifications</BackLink>
      <h1 className="landing margin-top-0">Notification Preferences</h1>
      <EmailValidationPreferenceBox emailValidated={emailValidated} updateUser={updateUser} />
      <Container>
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)}>
            {saveSuccess && (
              <Alert headingLevel="h2" type="success" className="margin-bottom-2">
                Your preferences have been saved.
              </Alert>
            )}
            {saveError && (
              <Alert headingLevel="h2" type="error" className="margin-bottom-2">
                There was an error saving your preferences: {saveError}
              </Alert>
            )}
            <Accordion items={ITEMS} multiselectable />
            <Button type="submit" className="margin-top-2">
              Save preferences
            </Button>
            <Link
              to="/notifications"
              className="usa-button usa-button--outline margin-top-2 margin-left-1"
            >
              Cancel
            </Link>
          </form>
        </FormProvider>
      </Container>
    </>
  );
}
