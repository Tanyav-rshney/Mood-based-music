import React, { useState, useEffect, useRef } from 'react';

const StatCounter = ({ value, duration = 1500, prefix = '', suffix = '' }) => {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const numericValue = typeof value === 'number' ? value : parseInt(value) || 0;
    if (numericValue === 0 || hasAnimated.current) {
      setDisplay(numericValue);
      return;
    }

    hasAnimated.current = true;
    const startTime = Date.now();
    const startValue = 0;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + (numericValue - startValue) * eased);
      setDisplay(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return (
    <span ref={ref}>
      {prefix}{display}{suffix}
    </span>
  );
};

export default StatCounter;
