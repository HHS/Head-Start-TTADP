import { Button, Alert } from '@trussworks/react-uswds';
import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
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
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const alertsFromApi = await getSiteAlerts();
        setAlerts(alertsFromApi);
      } catch (e) {
        setNotification({
          state: 'error',
          message: 'There was an error fetching alerts',
        });
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
      setNotification({
        state: 'error',
        message: 'There was an error deleting an alert',
      });
    }
  };

  return (
    <div>
      <Helmet>
        <title>Site alerts</title>
      </Helmet>
      <Container>
        <header className="display-flex flex-align-center flex-justify">
          <h1>Site alerts</h1>
          <Button type="button" onClick={createNewAlert}>Create new alert</Button>
        </header>

        <main>
          {(notification && notification.message) && (
            <Alert type={notification.state} role="alert">
              {notification.message}
            </Alert>
          )}
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
