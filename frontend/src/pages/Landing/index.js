import React, { useState, useEffect } from 'react';
import { Link, Tag } from '@trussworks/react-uswds';
import { Helmet } from 'react-helmet';

import UserContext from '../../UserContext';
import Container from '../../components/Container';
import { getReports } from '../../fetchers/activityReports';
import 'uswds/dist/css/uswds.css';
// import '@trussworks/react-uswds/lib/uswds.css'
import '@trussworks/react-uswds/lib/index.css';
import EllipsisText from "react-ellipsis-text";
import Pagination from "react-js-pagination";
import './index.css';
// import { GridContainer, Grid } from '@trussworks/react-uswds';
// import './index.css';

function renderReports(reports, offset, perPage) {
  return reports.map((report) => {
    const {
      id, activityRecipients, startDate, author, topics, collaborators, lastSaved, status
    } = report;

    const recipients = activityRecipients.map(ar => (
        <Tag className='smart-hub--table-collection'>{ar.grant.grantee.name}</Tag>
    ));

    const fullId = `R${author.homeRegionId < 10 ? ('0' + author.homeRegionId) : author.homeRegionId}-${id <= 999999 ? ('00000' + id).slice(-6) : id}`;

    return (
      <tr>
        <th scope="row">
          <Link href="/activity-reports">{fullId}</Link>
        </th>
        <td>
          <EllipsisText text={recipients} length={"60"} />
        </td>
        <td>{startDate}</td>
        <td>
          <EllipsisText text={author.fullName} length={"30"} />
        </td>
        <td>{topics}</td>
        <td>{collaborators}</td>
        <td>{lastSaved}</td>
        <td><Tag className={`smart-hub--table-tag-status smart-hub--status-${status}`}>{status}</Tag></td>
      </tr>
    );
  });
}

function Landing() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [reports, updateReports] = useState([]);
  const [error, updateError] = useState();
  const [sortConfig, setSortConfig] = React.useState(null);
  const [offset, setOffset] = useState(1);
  const [perPage] = useState(1);
  const [pageCount, setPageCount] = useState(1)
  const [activePage, setActivePage] = useState(1)

  const requestSort = key => {
    let direction = 'ascending';
    console.log(sortConfig);
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  }
  let sortedReports = [...reports];
  React.useMemo(() => {
    if (sortConfig !== null) {
      sortedReports.sort((a, b) => {
        let keys = sortConfig.key.split(".");
        const getValue = (item) =>
          keys.reduce((object, key) => {
            const result = (object || {})[key];
            if (key === 'activityRecipients') {
              return result.reduce((longString, ar) => {
                return longString + ' ' + ar.name;
              }, "");
            } else {
              return (object || {})[key];
            }
          }, item);
        console.log(`Value a: ${getValue(a)}`);
        if (getValue(a) < getValue(b)) {
          return sortConfig.direction === "ascending" ? -1 : 1;
        }
        if (getValue(a) > getValue(b)) {
          return sortConfig.direction === "ascending" ? 1 : -1;
        }
        return 0;
      });
    }
    return sortedReports;
  }, [reports, sortConfig]);

const handlePageChange= (pageNumber) => {
  console.log(`active page is ${pageNumber}`);
  setActivePage(pageNumber);
  setOffset(pageNumber);
}

  useEffect(() => {
    async function fetchReports() {
      setIsLoaded(false);
      try {
        console.log('using effect');
        const reps = await getReports();
        // updateReports(await getReports());
        console.log(`offset: ${offset}, perPage: ${perPage}`);
        const slice = reps.slice(offset-1, offset - 1 + perPage);
        console.log(reps);
        console.log(slice);
        // setData(slice);
        console.log('updating reports');
        updateReports(slice);
        setPageCount(Math.ceil(reports.length / perPage));
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log(e);
        updateError('Unable to fetch reports');
      }
      setIsLoaded(true);
    }
    fetchReports();
  }, [offset]);

  return (
    <>
      <Helmet>
        <title>Landing</title>
      </Helmet>
      <UserContext.Consumer>
        {({ user, logout }) => (
          <>
          <h1 className='landing'>Activity Reports
          <Link referrerPolicy="same-origin" className="usa-button" variant="unstyled" href="/activity-reports/new">
          + New Activity Report
        </Link></h1>
          <Container className='landing'>
          <table className="usa-table usa-table--borderless usa-table--striped">
              <caption>My activity report alerts</caption>
              <thead>
                <tr>
                  <th scope="col">Report ID</th>
                  <th
                    scope="col"
                    onClick={() => {
                      requestSort("activityRecipients");
                      updateReports(sortedReports);
                    }}
                  >
                    Grantee
                  </th>
                  <th scope="col">Start date</th>
                  <th
                    scope="col"
                    onClick={() => {
                      requestSort("author.name");
                      updateReports(sortedReports);
                    }}
                  >
                    Creator
                  </th>
                  <th scope="col">Collaborator(s)</th>
                  <th
                    scope="col"
                    onClick={() => {
                      requestSort("status");
                      updateReports(sortedReports);
                    }}
                  >
                    Status
                  </th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
            </Container>
          <Container className='landing'>
            <table className="usa-table usa-table--borderless usa-table--striped">
              <caption>Activity reports 
              <Pagination
              hideFirstLastPages
              prevPageText='Prev'
              nextPageText='Next'
              activePage={activePage}
              itemsCountPerPage={1}
              totalItemsCount={450}
              pageRangeDisplayed={2}
              onChange={handlePageChange}
            /></caption>
              <thead>
                <tr>
                  <th scope="col">Report ID</th>
                  <th
                    scope="col"
                    onClick={() => {
                      requestSort("activityRecipients");
                      updateReports(sortedReports);
                    }}
                  >
                    Grantee
                  </th>
                  <th scope="col">Start date</th>
                  <th
                    scope="col"
                    onClick={() => {
                      requestSort("author.name");
                      updateReports(sortedReports);
                    }}
                  >
                    Creator
                  </th>
                  <th scope="col">Topic(s)</th>
                  <th scope="col">Collaborator(s)</th>
                  <th scope="col">Last saved</th>
                  <th
                    scope="col"
                    onClick={() => {
                      requestSort("status");
                      updateReports(sortedReports);
                    }}
                  >
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>{renderReports(reports, offset, perPage)}</tbody>
            </table>
          </Container>
          </>
          )}
      </UserContext.Consumer>
    </>
  );
}

export default Landing;
