import React, { useEffect, useState, useContext } from 'react';
import PropTypes from 'prop-types';
import { useHistory, Link } from 'react-router-dom';
import parse from 'html-react-parser';
import { Helmet } from 'react-helmet';
import AppLoadingContext from '../../AppLoadingContext';
import UserContext from '../../UserContext';
import { getCommunicationLogById } from '../../fetchers/communicationLog';
import ReadOnlyField from '../../components/ReadOnlyField';
import BackLink from '../../components/BackLink';
import LogLine from '../RecipientRecord/pages/ViewCommunicationLog/components/LogLine';
import DisplayNextSteps from '../RecipientRecord/pages/ViewCommunicationLog/components/DisplayNextSteps';
import Container from '../../components/Container';
import { formatDateValueWithShortMonthOrdinalDayYear } from '../../lib/dates';

const hasRichTextContent = (html) => {
  if (!html) {
    return false;
  }
  const stripped = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, '').trim();
  return stripped.length > 0;
};

export default function ViewRegionalCommunicationLog({ match }) {
  const { params: { regionId, logId } } = match;
  const history = useHistory();
  const { setIsAppLoading } = useContext(AppLoadingContext);
  const { user } = useContext(UserContext);
  const [log, setLog] = useState();

  const isAuthor = log && log.author && log.author.id === user.id;

  useEffect(() => {
    async function fetchLog() {
      try {
        setIsAppLoading(true);
        const response = await getCommunicationLogById(regionId, logId);
        setLog(response);
      } catch (err) {
        history.push(`/something-went-wrong/${err.status}`);
      } finally {
        setIsAppLoading(false);
      }
    }

    if (!log) {
      fetchLog();
    }
  }, [regionId, logId, setIsAppLoading, history, log]);

  if (!log) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>Communication Entry</title>
      </Helmet>
      <div className="padding-y-3">
        <BackLink to="/communication-log">
          Back to communication log
        </BackLink>
        <h1 className="landing">Communication Log</h1>
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
              to={`/communication-log/region/${regionId}/log/${log.id}/log`}
            >
              Edit
            </Link>
          )}
          <ReadOnlyField label="Other TTA staff">
            {log.data.otherStaff && log.data.otherStaff.map((u) => (
              <div key={u.value}>{u.label}</div>
            ))}
          </ReadOnlyField>
          <ReadOnlyField label="Recipients">
            {log.recipients && log.recipients.map((r) => (
              <div key={r.id}>{r.name}</div>
            ))}
          </ReadOnlyField>
          <ReadOnlyField label="Purpose">
            {log.data.purpose}
          </ReadOnlyField>
          {hasRichTextContent(log.data.notes) && (
            <ReadOnlyField label="Notes">
              {parse(log.data.notes)}
            </ReadOnlyField>
          )}
          <ReadOnlyField label="Result">
            {log.data.result}
          </ReadOnlyField>
          {log.files && log.files.length > 0 && (
            <>
              <p className="usa-prose margin-bottom-0 text-bold">Supporting attachments</p>
              {log.files.map((file) => (
                <p className="usa-prose margin-top-0 margin-bottom-0" key={file.id}>
                  <a href={file.url.url}>
                    {file.originalFileName}
                  </a>
                </p>
              ))}
            </>
          )}
          <DisplayNextSteps title="Specialist's next steps" steps={log.data.specialistNextSteps} />
          <DisplayNextSteps title="Recipient's next steps" steps={log.data.recipientNextSteps} />
          <p className="text-bold font-sans-3xs base-dark">
            Date of entry:
            {formatDateValueWithShortMonthOrdinalDayYear(log.createdAt)}
          </p>
        </Container>
      </div>
    </>
  );
}

ViewRegionalCommunicationLog.propTypes = {
  match: PropTypes.shape({
    params: PropTypes.shape({
      regionId: PropTypes.string.isRequired,
      logId: PropTypes.string.isRequired,
    }).isRequired,
  }).isRequired,
};
