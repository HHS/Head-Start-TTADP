import React from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import './index.scss';
// import UserContext from '../../UserContext';

export default function TrainingReports() {
  // const { user } = useContext(UserContext);

  return (
    <div className="ttahub-training-reports">
      <Helmet titleTemplate="%s - Training Reports - TTA Hub" defaultTitle="TTA Hub - Training Reports" />
      <>
        <Helmet titleTemplate="%s - Training Reports - TTA Hub" defaultTitle="TTA Hub - Training Reports" />
        <h1 className="landing margin-top-0 margin-bottom-3">
          Training reports
        </h1>
        Coming soon!
      </>
    </div>

  );
}

TrainingReports.propTypes = {
  user: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    role: PropTypes.arrayOf(PropTypes.string),
    homeRegionId: PropTypes.number,
    permissions: PropTypes.arrayOf(PropTypes.shape({
      userId: PropTypes.number,
      scopeId: PropTypes.number,
      regionId: PropTypes.number,
    })),
  }),
};

TrainingReports.defaultProps = {
  user: null,
};
