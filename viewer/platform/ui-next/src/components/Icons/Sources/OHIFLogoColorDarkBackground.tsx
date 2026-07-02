import React from 'react';
import type { IconProps } from '../types';

export const OHIFLogoColorDarkBackground = (props: IconProps) => (
  <svg
    width="150px"
    height="32px"
    viewBox="0 0 150 32"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <defs>
      <linearGradient id="icare-logo-grad-dark" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0ea5e9" />
        <stop offset="100%" stopColor="#38bdf8" />
      </linearGradient>
    </defs>
    <g transform="translate(0, 2)">
      <rect
        x="0"
        y="0"
        width="28"
        height="28"
        rx="8"
        fill="url(#icare-logo-grad-dark)"
      />
      <path
        d="M9 14h10 M14 9v10"
        stroke="#ffffff"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </g>
    <text
      x="38"
      y="22"
      fill="#ffffff"
      fontFamily="system-ui, -apple-system, sans-serif"
      fontSize="20px"
      fontWeight="800"
      letterSpacing="0.5px"
    >
      Icare
    </text>
    <text
      x="92"
      y="21"
      fill="#38bdf8"
      fontFamily="system-ui, -apple-system, sans-serif"
      fontSize="11px"
      fontWeight="600"
      letterSpacing="1px"
      opacity="0.9"
    >
      VIEWER
    </text>
  </svg>
);

export default OHIFLogoColorDarkBackground;
