import React, { useEffect, useContext } from 'react';
import UserContext from '../../UserContext';

function Logout() {
  const { logout } = useContext(UserContext);

  useEffect(() => {
    logout(false);
  }, [logout]);

  return null;
}

export default Logout;
