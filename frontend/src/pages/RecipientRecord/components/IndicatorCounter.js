import React from 'react';
import PropTypes from 'prop-types';
import './IndicatorCounter.scss';

export default function IndicatorCounter({ count, totalCount }) {
  const renderIndicators = () => {
    const indicators = [];
    for (let i = 0; i < totalCount; i += 1) {
      indicators.push(
        <div className={`height-2 flex-fill radius-md ttahub--indicator-box-${i < count ? 'filled' : 'empty'} margin-right-1`} key={`indicator-${i}`} />,
      );
    }
    return indicators;
  };

  return (
    <div className="ttahub--indicator-counter display-flex flex-row margin-top-2">
      {renderIndicators()}
    </div>
  );
}

IndicatorCounter.propTypes = {
  count: PropTypes.number.isRequired,
  totalCount: PropTypes.number.isRequired,
};
