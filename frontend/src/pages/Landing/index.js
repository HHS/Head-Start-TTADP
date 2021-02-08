import React, { useState, useEffect } from 'react';
import { Tag, Table, Alert } from '@trussworks/react-uswds';
import { Helmet } from 'react-helmet';
import moment from 'moment';
import { Link } from 'react-router-dom';

import Container from '../../components/Container';
import { getReports } from '../../fetchers/activityReports';
import 'uswds/dist/css/uswds.css';
import '@trussworks/react-uswds/lib/index.css';
import './index.css';

export const activityReportId = (id, regionId) => {
  return `R${
    regionId < 10
      ? `0${regionId}`
      : regionId
  }-${id <= 999999 ? `00000${id}`.slice(-6) : id}`;
}

export const getValue = (item, sortConfig) => {
  const keys = sortConfig.key.split(".");

  // const getValueForItem = (item) =>
  return keys.reduce((object, key) => {
      const result = (object || {})[key];
      if (key === "activityRecipients" || key === "collaborators") {
        return result[0].name;
      } else if (key === "topics") {
        return result[0];
      } else if (key === "startDate" || key === "lastSaved") {
        const date = (object || {})[key];
        // Format with year first
        return date
          ? moment(date, "MM/DD/YYYY", "America/New_York").format("YYYY-MM-DD")
          : undefined;
      } else if (key === "regionId") {
        return activityReportId((object || {})["id"], (object || {})[key]);
      }
      return (object || {})[key];
    }, item);
};

function renderReports(reports) {
  const emptyReport = {
    id: '',
    activityRecipients: [],
    startDate: '',
    author: '',
    topics: [],
    collaborators: [],
    lastSaved: '',
    status: '',
  };

  const displayReports = reports.length ? reports : [emptyReport];

  return displayReports.map((report) => {
    const {
      id,
      activityRecipients,
      startDate,
      author,
      topics,
      collaborators,
      lastSaved,
      status,
      regionId,
    } = report;

    const recipientsTitle = activityRecipients.reduce(
      (result, ar) => `${result + (ar.grant ? ar.grant.grantee.name : ar.name)}\n`,
      '',
    );

    const recipients = activityRecipients.map((ar) => (
      <Tag
        key={`${ar.name.slice(1, 3)}_${ar.id}`}
        className="smart-hub--table-collection"
      >
        {ar.grant ? ar.grant.grantee.name : ar.name}
      </Tag>
    ));

    const topicsTitle = topics.reduce(
      (result, topic) => `${result + topic}\n`,
      '',
    );

    const topicsWithTags = topics.map((topic) => (
      <Tag
        key={`${topic.slice(1, 13)}`}
        className="smart-hub--table-collection"
      >
        {topic}
      </Tag>
    ));

    const collaboratorsTitle = collaborators.reduce(
      (result, collaborator) => `${result + collaborator.name}\n`,
      '',
    );

    const collaboratorsWithTags = collaborators.map((collaborator) => (
      <Tag
        key={`${collaborator.name.slice(1, 13)}`}
        className="smart-hub--table-collection"
      >
        {collaborator.name}
      </Tag>
    ));
    
    const fullId = !id
      ? ''
      : activityReportId(id, regionId);

    return (
      <tr key={`landing_${id}`}>
        <td>
          <Link
            to={`/activity-reports/${id}/activity-summary`}
            href={`/activity-reports/${id}/activity-summary`}
          >
            {fullId}
          </Link>
        </td>
        <td>
          <span className="smart-hub--ellipsis" title={recipientsTitle}>
            {recipients}
          </span>
        </td>
        <td>{startDate}</td>
        <td>
          <span className="smart-hub--ellipsis" title={author.fullName}>
            {author.fullName}
          </span>
        </td>
        <td>
          <span className="smart-hub--ellipsis" title={topicsTitle}>
            {topicsWithTags}
          </span>
        </td>
        <td>
          <span className="smart-hub--ellipsis" title={collaboratorsTitle}>
            {collaboratorsWithTags}
          </span>
        </td>
        <td>{lastSaved}</td>
        <td>
          <Tag
            className={`smart-hub--table-tag-status smart-hub--status-${status}`}
          >
            {status}
          </Tag>
        </td>
        <td>
          <button type="button" className="smart-hub--dotdotdot">
            ...
          </button>
        </td>
      </tr>
    );
  });
}

function Landing() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [reports, updateReports] = useState([]);
  const [error, updateError] = useState();
  const [sortConfig, setSortConfig] = React.useState({
    key: 'lastSaved',
    direction: 'descending',
  });

  const sortedReports = [...reports];
  const requestSort = (key) => {
    let direction = 'ascending';
    if (
      sortConfig
      && sortConfig.key === key
      && sortConfig.direction === 'ascending'
    ) {
      direction = 'descending';
    }
    console.log(direction);
    setSortConfig({ key, direction });
    updateReports(sortedReports);
  };

  React.useMemo(() => {
      sortedReports.sort((a, b) => {
        if (getValue(a, sortConfig) < getValue(b, sortConfig)) {
          return sortConfig.direction === 'descending' ? -1 : 1;
        }
        if (getValue(a, sortConfig) > getValue(b, sortConfig)) {
          return sortConfig.direction === 'descending' ? 1 : -1;
        }
        return 0;
      });
    return sortedReports;
  }, [sortConfig, sortedReports]);

  useEffect(() => {
    async function fetchReports() {
      setIsLoaded(false);
      try {
        const reps = await getReports();
        updateReports(reps);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log(e);
        updateError('Unable to fetch reports');
      }
      setIsLoaded(true);
    }
    fetchReports();
  }, []);

  const getClassNamesFor = (name) => {
    return sortConfig.key === name ? sortConfig.direction : '';
  };

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Helmet>
        <title>Landing</title>
      </Helmet>
      <h1 className="landing">
        Activity Reports
        <Link
          to="/activity-reports/new"
          referrerPolicy="same-origin"
          className="usa-button smart-hub--new-report-btn"
          variant="unstyled"
        >
          <span className="smart-hub--plus">+</span>
          <span className="smart-hub--new-report">New Activity Report</span>
        </Link>
        {error && (
          <Alert type="error" role="alert">
            {error}
          </Alert>
        )}
      </h1>
      <Container className="landing" padding={0}>
        <Table className="usa-table usa-table--borderless usa-table--striped">
          <caption>Activity reports</caption>
          <thead>
            <tr>
              <th
                scope="col"
                onClick={() => {
                  requestSort('regionId');
                }}
                className={getClassNamesFor('regionId')}
              >
                Report ID
              </th>
              <th
                scope="col"
                onClick={() => {
                  requestSort('activityRecipients');
                }}
                className={getClassNamesFor('activityRecipients')}
              >
                Grantee
              </th>
              <th
                scope="col"
                onClick={() => {
                  requestSort('startDate');
                }}
                className={getClassNamesFor('startDate')}
              >
                Start date
              </th>
              <th
                scope="col"
                onClick={() => {
                  requestSort('author.name');
                }}
                className={getClassNamesFor('author.name')}
              >
                Creator
              </th>
              <th
                scope="col"
                onClick={() => {
                  requestSort('topics');
                }}
                className={getClassNamesFor('topics')}
              >
                Topic(s)
              </th>
              <th
                scope="col"
                onClick={() => {
                  requestSort('collaborators');
                }}
                className={getClassNamesFor('collaborators')}
              >
                Collaborator(s)
              </th>
              <th
                scope="col"
                onClick={() => {
                  requestSort('lastSaved');
                }}
                className={getClassNamesFor('lastSaved')}
              >
                Last saved
              </th>
              <th
                scope="col"
                onClick={() => {
                  requestSort('status');
                }}
                className={getClassNamesFor('status')}
              >
                Status
              </th>
              <th scope="col" aria-label="..." />
            </tr>
          </thead>
          <tbody>{renderReports(reports)}</tbody>
        </Table>
      </Container>
    </>
  );
}

export default Landing;
