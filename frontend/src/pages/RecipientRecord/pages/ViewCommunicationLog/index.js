import React, { useEffect, useState, useContext } from 'react';
import moment from 'moment';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import ReactRouterPropTypes from 'react-router-prop-types';
import { Link } from 'react-router-dom';
import Container from '../../../../components/Container';
import AppLoadingContext from '../../../../AppLoadingContext';
import { getCommunicationLogById } from '../../../../fetchers/communicationLog';
import ReadOnlyField from '../../../../components/ReadOnlyField';
import BackLink from '../../../../components/BackLink';
import UserContext from '../../../../UserContext';
import DisplayNextSteps from './components/DisplayNextSteps';
import LogLine from './components/LogLine';
import SomethingWentWrongContext from '../../../../SomethingWentWrongContext';

export default function ViewCommunicationLog({ match, recipientName }) {
  const {
    params: {
      recipientId,
      regionId,
      communicationLogId,
    },
  } = match;

  const { user } = useContext(UserContext);
  const { setErrorResponseCode } = useContext(SomethingWentWrongContext);
  const { setIsAppLoading } = useContext(AppLoadingContext);
  const [log, setLog] = useState();

  const isAuthor = log && log.author && log.author.id === user.id;

  useEffect(() => {
    async function fetchLog() {
      try {
        setIsAppLoading(true);
        const response = await getCommunicationLogById(regionId, communicationLogId);
        setLog(response);
      } catch (err) {
        setErrorResponseCode(err.status);
      } finally {
        setIsAppLoading(false);
      }
    }

    if (!log) {
      fetchLog();
    }
  }, [communicationLogId, log, regionId, setIsAppLoading, setErrorResponseCode]);

  if (!log) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>Communication Entry</title>
      </Helmet>
      <div className="padding-y-3">
        <BackLink to={`/recipient-tta-records/${recipientId}/region/${regionId}/communication`}>
          Back to communication log
        </BackLink>
        <h1 className="landing">{recipientName}</h1>
        <LogLine
          authorName={log.author.name}
          communicationDate={log.data.communicationDate}
          duration={log.data.duration}
          method={log.data.method}
        />
        <Container paddingX={4} paddingY={2} className="maxw-tablet-lg" positionRelative>
          {isAuthor && (
          <Link
            className="position-absolute top-0 right-0 margin-top-4 margin-right-4"
            to={`/recipient-tta-records/${log.recipientId}/region/${regionId}/communication/${log.id}/log`}
          >
            Edit
          </Link>
          )}
          <ReadOnlyField
            label="Purpose"
          >
            {log.data.purpose}
          </ReadOnlyField>
          <ReadOnlyField
            label="Notes"
          >
            {log.data.notes}
          </ReadOnlyField>
          <ReadOnlyField
            label="Result"
          >
            {log.data.result}
          </ReadOnlyField>
          <p className="usa-prose margin-bottom-0 text-bold">Supporting attachments</p>
          {log.files.map((file) => (
            <p className="usa-prose margin-top-0 margin-bottom-0">
              <a href={file.url.url}>
                {file.originalFileName}
              </a>
            </p>
          ))}

          <DisplayNextSteps
            title="Specialist's next steps"
            steps={log.data.specialistNextSteps}
          />

          <DisplayNextSteps
            title="Recipient's next steps"
            steps={log.data.recipientNextSteps}
          />

          <p className="text-bold font-sans-3xs base-dark">
            Date of entry:
            {' '}
            {moment(log.createdAt).format('MMM Do, YYYY')}
          </p>
        </Container>
      </div>
    </>
  );
}

ViewCommunicationLog.propTypes = {
  match: ReactRouterPropTypes.match.isRequired,
  recipientName: PropTypes.string.isRequired,
};
