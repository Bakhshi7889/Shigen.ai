
import React from 'react';

const PaintBrushIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-3.48-2.146l-4.118-4.117a3 3 0 00-4.243 4.242l4.118 4.117a3 3 0 002.146 3.48l1.325.265.992-1.238.992 1.238 1.325-.265a3 3 0 002.146-3.48l-4.118-4.117zM15.53 8.878a3 3 0 00-4.242 0l-4.118 4.117a3 3 0 000 4.242l4.118 4.117a3 3 0 004.242 0l4.118-4.117a3 3 0 000-4.242l-4.118-4.117zM18 5.25a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
  </svg>
);

export default PaintBrushIcon;
