import React, { useEffect } from 'react';

interface AdUnitProps {
  adSlot: string;
  adFormat?: 'auto' | 'fluid' | 'rectangle' | 'vertical' | 'horizontal';
  className?: string;
  style?: React.CSSProperties;
}

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

const AdUnit: React.FC<AdUnitProps> = ({ 
  adSlot, 
  adFormat = 'auto',
  className = '',
  style = {}
}) => {
  useEffect(() => {
    try {
      // Push ad to AdSense queue
      if (window.adsbygoogle && Array.isArray(window.adsbygoogle)) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (err) {
      console.error('AdSense error:', err);
    }
  }, []);

  // Get publisher ID from environment variable
  const publisherId = import.meta.env.VITE_ADSENSE_PUBLISHER_ID || 'ca-pub-0000000000000000';

  return (
    <div className={`ad-container ${className}`} style={style}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', ...style }}
        data-ad-client={publisherId}
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive="true"
      />
    </div>
  );
};

export default AdUnit;
