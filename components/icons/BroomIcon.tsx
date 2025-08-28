import React from 'react';

const BroomIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v2.25a3.375 3.375 0 01-3.375 3.375H9.375a3.375 3.375 0 01-3.375-3.375V14.25m13.5 0v-2.25a3.375 3.375 0 00-3.375-3.375H9.375a3.375 3.375 0 00-3.375 3.375v2.25m13.5 0h-13.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.375 8.625l1.523-1.523a.75.75 0 011.06 0l2.862 2.862a.75.75 0 010 1.06l-1.523 1.523M16.5 8.625 12 13.125" />
  </svg>
);

export default BroomIcon;
