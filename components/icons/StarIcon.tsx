
import React from 'react';

interface StarIconProps extends React.SVGProps<SVGSVGElement> {
  isFilled?: boolean;
}

const StarIcon: React.FC<StarIconProps> = ({ isFilled, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill={isFilled ? 'currentColor' : 'none'} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.31h5.418a.562.562 0 01.31.988l-4.382 3.185a.563.563 0 00-.182.557l1.638 5.378a.563.563 0 01-.812.622l-4.884-2.57a.563.563 0 00-.525 0l-4.884 2.57a.563.563 0 01-.812-.622l1.638-5.378a.563.563 0 00-.182-.557l-4.382-3.185a.562.562 0 01.31-.988h5.418a.563.563 0 00.475-.31L11.48 3.5z" />
  </svg>
);

export default StarIcon;
