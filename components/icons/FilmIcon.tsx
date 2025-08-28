import React from 'react';

const FilmIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 3.75h12A2.25 2.25 0 0120.25 6v12A2.25 2.25 0 0118 20.25H6A2.25 2.25 0 013.75 18V6A2.25 2.25 0 016 3.75zM9 3.75v16.5m6-16.5v16.5m-10.5-9h15" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.008v.008H6.75V6.75zm.008 3.75h.008v.008H6.758v-.008zm0 3.75h.008v.008H6.758v-.008zm0 3.75h.008v.008H6.758v-.008zM16.5 6.75h.008v.008h-.008V6.75zm.008 3.75h.008v.008h-.008v-.008zm0 3.75h.008v.008h-.008v-.008zm0 3.75h.008v.008h-.008v-.008z" />
  </svg>
);

export default FilmIcon;
