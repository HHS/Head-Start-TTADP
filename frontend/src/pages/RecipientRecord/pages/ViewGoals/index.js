import React, {
  useEffect,
  useState,
  useContext,
} from 'react';
import { DECIMAL_BASE } from '@ttahub/common';
import { uniq, uniqueId } from 'lodash';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';
import { Alert } from '@trussworks/react-uswds';
import PropTypes from 'prop-types';
import Container from '../../../../components/Container';
import { goalsByIdAndRecipient } from '../../../../fetchers/recipient';
import colors from '../../../../colors';
import AppLoadingContext from '../../../../AppLoadingContext';
import UserContext from '../../../../UserContext';
import GoalFormTitle from '../../../../components/GoalForm/GoalFormTitle';
import ReadOnlyGoalCollaborators from '../../../../components/ReadOnlyGoalCollaborators';
import ReadOnlyField from '../../../../components/ReadOnlyField';
import RTRGoalPrompts from '../../../../components/GoalForm/RTRGoalPrompts';

export function ResourceLink({ resource }) {
  const { url, title } = resource;
  const linkText = title || url;

  return (
    <a href={url} target="_blank" rel="noreferrer">{linkText}</a>
  );
}

export function FileLink({ file }) {
  const { url, originalFileName } = file;

  return (
    <ResourceLink resource={{
      url: url.url,
      title: originalFileName,
    }}
    />
  );
}

FileLink.propTypes = {
  file: PropTypes.shape({
    url: PropTypes.shape({
      url: PropTypes.string,
    }).isRequired,
    originalFileName: PropTypes.string.isRequired,
  }).isRequired,
};

ResourceLink.propTypes = {
  resource: PropTypes.shape({
    url: PropTypes.string.isRequired,
    title: PropTypes.string,
  }).isRequired,
};

export default function ViewGoals({
  recipient,
  regionId,
}) {
  const goalDefaults = {
    name: '',
    endDate: null,
    status: 'Draft',
    grants: [],
    objectives: [],
    id: 'new',
    onApprovedAR: false,
    onAR: false,
    prompts: {},
    isCurated: false,
    source: {},
    createdVia: '',
    goalTemplateId: null,
    isReopenedGoal: false,
  };

  const [fetchError, setFetchError] = useState('');
  const [fetchAttempted, setFetchAttempted] = useState(false);
  const [goal, setGoal] = useState(goalDefaults);

  const { isAppLoading, setIsAppLoading, setAppLoadingText } = useContext(AppLoadingContext);
  const { user } = useContext(UserContext);

  // this is checked on the backend as well but we can save a fetch by checking here
  const canView = user.permissions.filter(
    (permission) => permission.regionId === parseInt(regionId, DECIMAL_BASE),
  ).length > 0;

  // for fetching goal data from api if it exists
  useEffect(() => {
    async function fetchGoal() {
      const url = new URL(window.location);
      const params = new URLSearchParams(url.search);
      const ids = params.getAll('id[]').map((id) => parseInt(id, DECIMAL_BASE));

      setFetchAttempted(true); // as to only fetch once
      try {
        const [fetchedGoal] = await goalsByIdAndRecipient(
          ids, recipient.id.toString(),
        );

        // for these, the API sends us back things in a format we expect
        setGoal(fetchedGoal);
      } catch (err) {
        setFetchError(true);
      } finally {
        setIsAppLoading(false);
      }
    }

    if (!fetchAttempted && !isAppLoading) {
      setAppLoadingText('Loading goal');
      setIsAppLoading(true);
      fetchGoal();
    }
  }, [fetchAttempted, isAppLoading, recipient.id, setAppLoadingText, setIsAppLoading]);

  if (!canView) {
    return (
      <Alert role="alert" className="margin-y-2" type="error">
        You don&apos;t have permission to view this page
      </Alert>
    );
  }

  if (fetchError) {
    return (
      <Alert role="alert" className="margin-y-2" type="error">
        There was an error fetching your goal
      </Alert>
    );
  }

  const {
    collaborators,
    isReopenedGoal,
    goalNumbers,
    source,
    objectives,
    endDate,
    name: goalName,
    grants,
  } = goal;

  return (
    <>
      <Link
        className="ttahub-recipient-record--tabs_back-to-search margin-left-2 margin-top-4 margin-bottom-3 display-inline-block"
        to={`/recipient-tta-records/${recipient.id}/region/${regionId}/rttapa/`}
      >
        <FontAwesomeIcon className="margin-right-1" color={colors.ttahubMediumBlue} icon={faArrowLeft} />
        <span>Back to RTTAPA</span>
      </Link>

      <h1 className="page-heading margin-top-0 margin-bottom-0 margin-left-2">
        TTA Goals for
        {' '}
        {recipient.name}
        {' '}
        - Region
        {' '}
        {regionId}
      </h1>

      <Container className="margin-y-3 margin-left-2 width-tablet" paddingX={4} paddingY={5}>
        <div className="margin-bottom-5">
          <GoalFormTitle
            goalNumbers={goalNumbers}
            isReopenedGoal={isReopenedGoal}
          />
          <h3 className="margin-top-4 margin-bottom-3">Goal summary</h3>
          <ReadOnlyGoalCollaborators
            collaborators={collaborators}
          />
          <ReadOnlyField label="Recipient grant numbers">
            {grants
              .map((grant) => `${grant.recipient.name} ${grant.numberWithProgramTypes}`)
              .join('\n')}
          </ReadOnlyField>
          <ReadOnlyField label="Recipient's goal">
            {goalName}
          </ReadOnlyField>

          <RTRGoalPrompts
            userCanEdit={false}
            value={goal.prompts}
            onChange={() => {}}
            validate={() => {}}
            errors={{}}
            selectedGrants={grants}
            isCurated={goal.isCurated}
            goalTemplateId={goal.goalTemplateId}
          />

          <ReadOnlyField label="Goal source">
            {uniq(Object.values(source || {})).join(', ') || ''}
          </ReadOnlyField>

          <ReadOnlyField label="Anticipated close date (mm/dd/yyyy)">
            {endDate}
          </ReadOnlyField>
        </div>

        {objectives.map((objective) => (
          <div key={uniqueId('objective-collection-')} className="margin-bottom-5">
            <h3>Objective summary</h3>
            <ReadOnlyField label="TTA objective">
              {objective.title}
            </ReadOnlyField>
            {objective.topics.length > 0 && (
            <ReadOnlyField label="Topics">
              {objective.topics.map((topic) => topic.name).join(', ')}
            </ReadOnlyField>
            )}
            {objective.courses.length > 0 && (
            <ReadOnlyField label="iPD course names">
              {objective.courses.map((course) => course.name).join(', ')}
            </ReadOnlyField>
            )}
            {objective.resources.length > 0 && (
            <ReadOnlyField label="Resources">
              {objective.resources.map((resource) => (
                <React.Fragment key={uniqueId('objective-resource-')}>
                  <ResourceLink resource={resource} />
                  <br />
                </React.Fragment>
              ))}
            </ReadOnlyField>
            )}
            {objective.files.length > 0 && (
            <ReadOnlyField label="Files">
              {objective.files.map((file) => (
                <React.Fragment key={uniqueId('objective-file-')}>
                  <FileLink file={file} />
                  <br />
                </React.Fragment>
              ))}
            </ReadOnlyField>
            )}
          </div>
        ))}

      </Container>
    </>
  );
}

ViewGoals.propTypes = {
  recipient: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    grants: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.number,
        numberWithProgramTypes: PropTypes.string,
      }),
    ),
  }).isRequired,
  regionId: PropTypes.string.isRequired,
};
