import React, { useContext } from 'react';
import { Helmet } from 'react-helmet';
import AvatarGroup from '../../components/AvatarGroup';
import WidgetCard from '../../components/WidgetCard';
import WidgetHeader from '../../components/WidgetHeader';
import UserContext from '../../UserContext';
import Groups from './components/Groups';

function AccountManagement() {
  const { user } = useContext(UserContext);

  const lastLoginFormatted = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(user.lastLogin));

  return (
    <>
      <Helmet>
        <title>Account Management</title>
      </Helmet>

      <h1 className="landing margin-top-0 margin-bottom-3">Account Management</h1>

      {/* Profile box */}
      <WidgetCard header={<WidgetHeader>Profile</WidgetHeader>}>
        {/* Avatar w/ name */}
        <div className="margin-bottom-3">
          <AvatarGroup userName={user.name} className="padding-bottom-3" />
        </div>

        {/* Last login */}
        <div>
          <div className="text-bold">Last login</div>
          <div>{lastLoginFormatted}</div>
        </div>
      </WidgetCard>

      {/* Groups box */}
      <Groups />
    </>
  );
}

export default AccountManagement;
