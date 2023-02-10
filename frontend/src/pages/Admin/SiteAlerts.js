import { Button } from '@trussworks/react-uswds';
import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
// import { Link } from 'react-router-dom';
import Container from '../../components/Container';
import { ALERT_STATUSES } from '../../Constants';
import { deleteSiteAlert, getSiteAlerts } from '../../fetchers/Admin';
import AlertReview from './components/AlertReview';

export const DEFAULT_ALERT = {
  status: ALERT_STATUSES.UNPUBLISHED,
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
    async function fetchAlerts() {
      try {
        const alertsFromApi = await getSiteAlerts();
        setAlerts(alertsFromApi);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(`There was an error fetching alerts:${e}`);
      }
    }

    fetchAlerts();
  }, []);

  const createNewAlert = () => {
    setAlerts([DEFAULT_ALERT, ...alerts]);
  };

  const onDelete = async (alert) => {
    try {
      if (!alert.isNew) {
        await deleteSiteAlert(alert.id);
      }
      setAlerts(alerts.filter((a) => a.id !== alert.id));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`There was an error deleting an alert:${err}`);
    }
  };

  return (
    <div>
      <Helmet>
        <title>Site alerts</title>
      </Helmet>
      <Container>
        <header className="display-flex flex-align-center flex-justify">
          <h1>Site Alerts</h1>
          <Button type="button" onClick={createNewAlert}>Create new alert</Button>
        </header>

        <main>
          <div>
            {alerts.map((alert) => (
              <AlertReview
                alert={alert}
                key={alert.id}
                onDelete={onDelete}
              />
            ))}
          </div>

        </main>
      </Container>
    </div>
  );
}
