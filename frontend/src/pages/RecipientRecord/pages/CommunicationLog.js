import React from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';

export default function CommunicationLog({ recipientName, regionId }) {
  return (
    <>
      <Helmet>
        <title>
          Communication Log
          {recipientName}
          {' '}
          Region
          {' '}
          {String(regionId)}
        </title>
      </Helmet>
      <div>
        <h1>Communication Log</h1>
      </div>
    </>
  );
}

CommunicationLog.propTypes = {
  recipientName: PropTypes.string.isRequired,
  regionId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};
