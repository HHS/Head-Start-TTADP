import React from 'react';
import PropTypes from 'prop-types';
import './IndicatorCounter.scss';

export default function IndicatorCounter({
  count, totalCount, showCountInline, noTopMargin,
}) {
  const renderIndicators = () => {
    const indicators = [];
    for (let i = 0; i < totalCount; i += 1) {
      indicators.push(
        <div className={`height-2 flex-fill radius-md ttahub--indicator-box-${i < count ? 'filled' : 'empty'} margin-right-1`} key={`indicator-${i}`} />,
      );
    }
    return indicators;
  };

  const marginClass = noTopMargin ? 'margin-top-0' : 'margin-top-2';

  return (
    <div className={`ttahub--indicator-counter display-flex flex-row flex-align-center ${marginClass}`}>
      {renderIndicators()}
      {showCountInline && (
        <p className="usa-prose margin-y-0 margin-left-1">
          {count}
          {' '}
          of
          {' '}
          {totalCount}
        </p>
      )}
    </div>
  );
}

IndicatorCounter.propTypes = {
  count: PropTypes.number.isRequired,
  totalCount: PropTypes.number.isRequired,
  showCountInline: PropTypes.bool,
  noTopMargin: PropTypes.bool,
};

IndicatorCounter.defaultProps = {
  showCountInline: false,
  noTopMargin: false,
};
