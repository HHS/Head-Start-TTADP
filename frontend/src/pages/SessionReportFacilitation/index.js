import React, { useContext, useEffect, useMemo } from 'react';
import ReactRouterPropTypes from 'react-router-prop-types';
import { useForm } from 'react-hook-form';
import { useHistory } from 'react-router';
import { Link } from 'react-router-dom';
import {
  Button, ErrorMessage, Fieldset, FormGroup, Radio,
} from '@trussworks/react-uswds';
import { ErrorMessage as ReactHookFormError } from '@hookform/error-message';
import { Helmet } from 'react-helmet';
import useFetch from '../../hooks/useFetch';
import Container from '../../components/Container';
import BackLink from '../../components/BackLink';
import IndicatesRequiredField from '../../components/IndicatesRequiredField';
import Req from '../../components/Req';
import { createSession } from '../../fetchers/session';
import { eventById } from '../../fetchers/event';
import { ROUTES } from '../../Constants';
import UserContext from '../../UserContext';
import isAdmin from '../../permissions';

const TRAINING_REPORT_URL_NOT_STARTED = '/training-reports/not-started';
const TRAINING_REPORT_URL_IN_PROGRESS = '/training-reports/in-progress';
const ERROR_MESSAGE = 'Select who is providing the training';
const INPUT_NAME = 'facilitation';

export default function SessionReportFacilitation({ match }) {
  const { params: { trainingReportId } } = match;
  const history = useHistory();
  const hookForm = useForm({
    mode: 'onBlur',
    defaultValues: {},
  });

  const { user } = useContext(UserContext);
  const isAdminUser = useMemo(() => isAdmin(user), [user]);

  const { data: trainingReport, error, statusCode } = useFetch(
    null,
    async () => eventById(trainingReportId),
    [trainingReportId],
  );

  useEffect(() => {
    const trUsers = [
      ...(trainingReport?.collaboratorIds || []),
      trainingReport?.owner.id || null,
    ];

    if (!isAdminUser && !trUsers.includes(user.id)) {
      history.replace(`${ROUTES.SOMETHING_WENT_WRONG}/401`);
    }
  }, [history, isAdminUser, trainingReport, user.id]);

  if (error) {
    history.replace(`${ROUTES.SOMETHING_WENT_WRONG}/${statusCode}`);
  }

  if (!trainingReport) {
    return 'Loading...';
  }

  const { register, handleSubmit, errors } = hookForm;

  const onSubmit = async (data) => {
    try {
      const session = await createSession(trainingReportId, data);
      // we can infer that the user is an the owner, or collaborator
      // since they'd be forwarded out otherwise (POC cannot create sessions)

      const isCollaborator = trainingReport.collaboratorIds.includes(user.id);
      const isOwner = trainingReport.owner.id === user.id;
      const { facilitation } = data;

      const facilitationIncludesRegion = facilitation === 'both' || facilitation === 'regional_tta_staff';
      const collaboratorWithRegionalFacilitation = isCollaborator && facilitationIncludesRegion;

      if (!isAdminUser && (collaboratorWithRegionalFacilitation || isOwner)) {
        history.push(TRAINING_REPORT_URL_IN_PROGRESS, { message: 'Session created successfully' });
        return;
      }

      history.push(`/training-report/${session.eventId}/session/${session.id}`);
    } catch (err) {
      history.push(`${ROUTES.SOMETHING_WENT_WRONG}/${statusCode}`);
    }
  };

  const fieldError = errors[INPUT_NAME];

  return (
    <>
      <Helmet>
        <title>Training Report - Create a session</title>
      </Helmet>
      <BackLink to={TRAINING_REPORT_URL_NOT_STARTED}>Back to Training Reports</BackLink>
      <h1 className="landing margin-bottom-2">Training Report - Create a session</h1>
      <p className="margin-0 margin-bottom-4 font-serif-md text-normal">
        {trainingReport.data.eventId}
        :
        {' '}
        { trainingReport.data.eventName }
      </p>
      <Container className="maxw-tablet" paddingX={4} paddingY={5}>
        <h2 className="font-serif-xl margin-top-0 margin-bottom-1">Training facilitation</h2>
        <IndicatesRequiredField className="margin-bottom-3" />
        <form onSubmit={handleSubmit(onSubmit)}>
          <FormGroup error={fieldError}>
            <Fieldset className="margin-bottom-3">
              <legend className="margin-bottom-1">
                Who is providing the training?
                {' '}
                <Req />
              </legend>
              <ReactHookFormError
                errors={errors}
                name={INPUT_NAME}
                render={({ message }) => <ErrorMessage>{message}</ErrorMessage>}
              />
              <Radio
                value="national_center"
                label="National Center"
                id={`${INPUT_NAME}-national_center`}
                name={INPUT_NAME}
                inputRef={register({ required: ERROR_MESSAGE })}
                className="margin-bottom-2"
              />

              <Radio
                value="regional_tta_staff"
                label="Regional TTA staff"
                id={`${INPUT_NAME}-regional_tta_staff`}
                name={INPUT_NAME}
                inputRef={register({ required: ERROR_MESSAGE })}
                className="margin-bottom-2"
              />
              <Radio
                value="both"
                label="Both (National Center and Regional TTA staff)"
                id={`${INPUT_NAME}-both`}
                name={INPUT_NAME}
                inputRef={register({ required: ERROR_MESSAGE })}
              />
            </Fieldset>
          </FormGroup>
          <Button type="submit">Create session</Button>
          <Link className="usa-button usa-button--outline" to={TRAINING_REPORT_URL_NOT_STARTED}>Cancel</Link>
        </form>
      </Container>
    </>
  );
}

SessionReportFacilitation.propTypes = {
  match: ReactRouterPropTypes.match.isRequired,
};
