
import React, { useEffect, useRef } from 'react';

interface MathRendererProps {
  content: string;
  className?: string;
}

const MathRenderer: React.FC<MathRendererProps> = ({ content, className = "" }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fix: Access MathJax through the window object with type assertion to avoid TS errors
    const mathJax = (window as any).MathJax;
    if (mathJax && containerRef.current) {
      mathJax.typesetPromise([containerRef.current]).catch((err: any) => 
        console.error('MathJax typeset failed: ', err)
      );
    }
  }, [content]);

  return (
    <div 
      ref={containerRef} 
      className={`math-container ${className}`}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
};

export default MathRenderer;
