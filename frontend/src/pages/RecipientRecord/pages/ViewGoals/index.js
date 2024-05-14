import React, {
  useEffect,
  useState,
  useContext,
} from 'react';
import { DECIMAL_BASE } from '@ttahub/common';
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

export default function ViewGoals({
  recipient,
  regionId,
}) {
  const possibleGrants = recipient.grants.filter(((g) => g.status === 'Active'));

  const goalDefaults = {
    name: '',
    endDate: null,
    status: 'Draft',
    grants: possibleGrants.length === 1 ? [possibleGrants[0]] : [],
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
  const [, setGoal] = useState(goalDefaults);

  const { isAppLoading, setIsAppLoading, setAppLoadingText } = useContext(AppLoadingContext);
  const { user } = useContext(UserContext);

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
        <h2>Goal summary</h2>
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
