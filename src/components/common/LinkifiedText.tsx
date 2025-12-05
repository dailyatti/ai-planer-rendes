import React from 'react';
import { linkifyText } from '../../utils/linkDetection';

interface LinkifiedTextProps {
  text: string;
  className?: string;
}

const LinkifiedText: React.FC<LinkifiedTextProps> = ({ text, className = '' }) => {
  const linkedText = linkifyText(text);
  
  return (
    <div 
      className={className}
      dangerouslySetInnerHTML={{ __html: linkedText }}
    />
  );
};

export default LinkifiedText;