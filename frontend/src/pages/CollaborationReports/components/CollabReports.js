import React, { useState, useEffect } from 'react';
import {
  Alert,
  Grid,
} from '@trussworks/react-uswds';
import PropTypes from 'prop-types';
import CollabReportsTable from './CollabReportsTable';
import getReports from '../../../fetchers/collaboratorReports.ts';

// TODO: Add filters as a dependency/prop in future
const CollabReports = (props) => {
  const { title, emptyMsg, showCreateMsgOnEmpty } = props;
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        const { rows } = await getReports();
        setReports(rows);
        setError('');
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log(e);
        setError('Unable to fetch reports');
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  return (
    <>
      <Grid row>
        {error && (
          <Alert type="error" role="alert">
            {error}
          </Alert>
        )}
      </Grid>
      <CollabReportsTable
        reports={reports}
        title={title}
        loading={loading}
        emptyMsg={emptyMsg}
        showCreateMsgOnEmpty={showCreateMsgOnEmpty}
      />
    </>
  );
};

CollabReports.defaultProps = {
  emptyMsg: 'You have no Collaboration Reports',
  showCreateMsgOnEmpty: false,
  title: 'Collaboration Reports',
};

CollabReports.propTypes = {
  emptyMsg: PropTypes.string,
  showCreateMsgOnEmpty: PropTypes.bool,
  title: PropTypes.string,
};

export default CollabReports;
