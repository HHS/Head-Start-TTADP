import { useState, useRef } from 'react';

export default function useExpanderFocusClick() {
  const [expanded, setExpanded] = useState(false);
  const btnRef = useRef(null);

  const handleExpanderClick = () => {
    setExpanded(!expanded);

    // Setting a timeout to ensure the button is focused after state update
    setTimeout(() => {
      if (btnRef.current) {
        btnRef.current.focus();
      }
    }, 200);
  };

  return { expanded, btnRef, handleExpanderClick };
}
