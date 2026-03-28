import React from 'react';

interface LogoProps {
  className?: string;
  width?: number | string;
  height?: number | string;
}

export const Logo: React.FC<LogoProps> = ({ className, width = 32, height = 28 }) => {
  return (
    <svg 
      width={width} 
      height={height} 
      viewBox="18 18 32 22" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="18" y="34" width="32" height="6" rx="3" fill="#22C55E" />
      <rect x="18" y="26" width="26" height="6" rx="3" fill="#46D977" />
      <rect x="18" y="18" width="20" height="6" rx="3" fill="#9CA3AF" />
    </svg>
  );
};

export default Logo;
