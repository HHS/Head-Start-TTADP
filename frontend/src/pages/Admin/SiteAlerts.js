import { Button } from '@trussworks/react-uswds';
import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
// import { Link } from 'react-router-dom';
import Container from '../../components/Container';
import { ALERT_STATUSES } from '../../Constants';
import AlertReview from './components/AlertReview';

const DEFAULT_ALERT = {
  status: ALERT_STATUSES.DRAFT,
  message: '<span></span>',
  title: '',
  startDate: '',
  endDate: '',
  id: Math.random(),
  isNew: true,
};

export default function SiteAlerts() {
  const [alerts, setAlerts] = useState([]);
  useEffect(() => {
    // async function fetchFeatures() {
    //   try {
    //     const featuresFromApi = await getFeatures();
    //     setFeatures(featuresFromApi);
    //   } catch (e) {
    //     setError('Unable to fetch features');
    //   }
    // }

    // fetchFeatures();
  }, []);

  const createNewAlert = () => {
    setAlerts([DEFAULT_ALERT, ...alerts]);
  };

  return (
    <div>
      <Helmet>
        <title>Site alerts</title>
      </Helmet>
      <Container>
        <main>
          <h1>Site Alerts</h1>
          <Button type="button" onClick={createNewAlert}>Create new alert</Button>

          <div>
            {alerts.map((alert) => (
              <AlertReview alert={alert} key={alert.id} />
            ))}
          </div>

        </main>
      </Container>
    </div>
  );
}
