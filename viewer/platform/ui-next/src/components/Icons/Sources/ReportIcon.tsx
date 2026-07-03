import React from 'react';
import type { IconProps } from '../types';

export const ReportIcon = (props: IconProps) => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 28 28"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <g fill="none" fillRule="evenodd">
      <rect x="0" y="0" width="28" height="28" />

      {/* Report document */}
      <path
        d="M8 5.5H17.5L21 9V21a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7.5a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Folded corner */}
      <path
        d="M17.5 5.5V9H21"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Report lines */}
      <line
        x1="10"
        y1="12"
        x2="18"
        y2="12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      <line
        x1="10"
        y1="15.5"
        x2="18"
        y2="15.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Chart */}
      <line
        x1="10"
        y1="20"
        x2="10"
        y2="17.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      <line
        x1="13.5"
        y1="20"
        x2="13.5"
        y2="16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      <line
        x1="17"
        y1="20"
        x2="17"
        y2="18.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </g>
  </svg>
);

export default ReportIcon;
