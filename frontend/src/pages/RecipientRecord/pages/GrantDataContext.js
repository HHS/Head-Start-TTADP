import React, {
  createContext,
  useState,
  useContext,
  useCallback,
} from 'react';
import PropTypes from 'prop-types';

const GrantDataContext = createContext();

export const GrantDataProvider = ({ children }) => {
  const [grantData, setGrantData] = useState({});

  const updateGrantMonitoringData = useCallback((grantNumber, hasMonitoringData) => {
    setGrantData((currentGrantData) => ({
      ...currentGrantData,
      [grantNumber]: { ...currentGrantData[grantNumber], hasMonitoringData },
    }));
  }, []);

  const updateGrantClassData = useCallback((grantNumber, hasClassData) => {
    setGrantData((currentGrantData) => ({
      ...currentGrantData,
      [grantNumber]: { ...currentGrantData[grantNumber], hasClassData },
    }));
  }, []);

  const updateGrantSpotlightData = useCallback((grantNumber, hasSpotlightData) => {
    setGrantData((currentGrantData) => ({
      ...currentGrantData,
      [grantNumber]: { ...currentGrantData[grantNumber], hasSpotlightData },
    }));
  }, []);

  const safeCheck = (grantNumber, key) => {
    if (typeof grantNumber !== 'string' || !grantData || !grantData[grantNumber]) {
      return false;
    }
    return Boolean(grantData[grantNumber][key]);
  };

  const hasMonitoringData = (grantNumber) => safeCheck(grantNumber, 'hasMonitoringData');
  const hasClassData = (grantNumber) => safeCheck(grantNumber, 'hasClassData');
  const hasSpotlightData = (grantNumber) => safeCheck(grantNumber, 'hasSpotlightData');

  return (
    <GrantDataContext.Provider value={{
      grantData,
      updateGrantMonitoringData,
      updateGrantClassData,
      updateGrantSpotlightData,
      hasMonitoringData,
      hasClassData,
      hasSpotlightData,
    }}
    >
      {children}
    </GrantDataContext.Provider>
  );
};

export const useGrantData = () => useContext(GrantDataContext);

GrantDataProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
