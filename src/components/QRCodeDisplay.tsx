import React from "react";
import { QRCodeSVG } from "qrcode.react";

interface QRCodeDisplayProps {
  url: string;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ url }) => {
  return (
    <div className="flex justify-center animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="p-4 bg-white rounded-2xl shadow-lg">
        <QRCodeSVG
          value={url}
          size={192}
          level={"H"}
          includeMargin={true}
          imageSettings={{
            src: "/icon.png",
            x: undefined,
            y: undefined,
            height: 24,
            width: 24,
            excavate: true,
          }}
        />
      </div>
    </div>
  );
};
