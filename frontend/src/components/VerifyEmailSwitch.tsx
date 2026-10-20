import React, { useContext } from 'react';
import { useParams } from 'react-router';
import { Redirect } from 'react-router-dom';
import { canSeeBehindFeatureFlag } from '../permissions';
import UserContext from '../UserContext';

export default function VerifyEmailSwitch() {
  const { token } = useParams();
  const { user } = useContext(UserContext);

  const hasNotificationFlag = canSeeBehindFeatureFlag(user, 'actionable_notifications');

  if (hasNotificationFlag) {
    return <Redirect to={`/account/notifications/${token}`} />;
  }

  return <Redirect to={`/account/verify-email/${token}`} />;
}
