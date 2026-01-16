import React from 'react';
import QRCode from 'qrcode';

export interface QRCodeOverlayProps {
  text: string;
  size?: number;
  style?: React.CSSProperties;
}

export const QRCodeOverlay: React.FC<QRCodeOverlayProps> = ({ text, size = 200, style }) => {
  const [dataUrl, setDataUrl] = React.useState<string>('');

  React.useEffect(() => {
    QRCode.toDataURL(text, { width: size, margin: 1 }, (err, url) => {
      if (!err) setDataUrl(url);
    });
  }, [text, size]);

  if (!dataUrl) return null;

  return (
    <div style={{
      position: 'absolute',
      bottom: 40,
      right: 40,
      padding: 10,
      backgroundColor: 'white',
      borderRadius: 10,
      boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
      ...style
    }}>
      <img src={dataUrl} style={{ width: size, height: size }} />
    </div>
  );
};
