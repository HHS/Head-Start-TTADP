import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import Tooltip from './Tooltip';

export default function TextTrim({ text, position }) {
  const [isTruncated, setIsTruncated] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const visibleTextRef = useRef(null);
  const hiddenTextRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const checkTruncation = () => {
      if (hiddenTextRef.current && visibleTextRef.current && containerRef.current) {
        const hiddenWidth = hiddenTextRef.current.offsetWidth;
        const visibleWidth = visibleTextRef.current.offsetWidth;

        // Calculate available width accounting for padding
        const computedStyle = window.getComputedStyle(containerRef.current);
        const paddingLeft = parseInt(computedStyle.paddingLeft, 10);
        const paddingRight = parseInt(computedStyle.paddingRight, 10);
        const availableWidth = containerRef.current.offsetWidth - (paddingLeft + paddingRight);

        setContainerWidth(availableWidth);
        setIsTruncated(hiddenWidth > visibleWidth);
      }
    };

    checkTruncation();
    window.addEventListener('resize', checkTruncation);
    return () => window.removeEventListener('resize', checkTruncation);
  }, [text]);

  if (isTruncated) {
    return (
      <div ref={containerRef} style={{ position: 'relative' }}>
        <Tooltip
          displayText={text}
          tooltipText={text}
          buttonLabel="click to reveal"
          className="text-trim-tooltip"
          maxWidth={containerWidth}
          position={position}
        />
        {/* Hidden element for comparison */}
        <div
          ref={hiddenTextRef}
          aria-hidden="true"
          style={{
            position: 'absolute',
            visibility: 'hidden',
            whiteSpace: 'nowrap',
            left: '-9999px',
          }}
        >
          {text}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <span
        ref={visibleTextRef}
        style={{
          display: 'block',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          lineHeight: 1.7,
        }}
      >
        {text}
      </span>
      {/* Hidden element for comparison */}
      <div
        ref={hiddenTextRef}
        style={{
          position: 'absolute',
          visibility: 'hidden',
          whiteSpace: 'nowrap',
          left: '-9999px',
        }}
      >
        {text}
      </div>
    </div>
  );
}

TextTrim.propTypes = {
  text: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
  position: PropTypes.string,
};

TextTrim.defaultProps = {
  position: 'top',
};
