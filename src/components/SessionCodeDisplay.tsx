import React, { useState, useEffect } from "react";
import { Copy, Clock, Shield } from "lucide-react";
import { QRCodeDisplay } from "./QRCodeDisplay";

interface SessionCodeDisplayProps {
  code: string;
  expiresAt: number;
}

export const SessionCodeDisplay: React.FC<SessionCodeDisplayProps> = ({
  code,
  expiresAt,
}) => {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const updateTimeLeft = () => {
      const remaining = Math.max(0, expiresAt - Date.now());
      setTimeLeft(remaining);
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const formatTimeLeft = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const [linkCopied, setLinkCopied] = useState(false);

  // ... (copyToClipboard existing logic)

  const shareLink = async () => {
    const url = `${window.location.origin}/?code=${code}`;
    const shareData = {
      title: "Lock-N-Drop Secure File Transfer",
      text: `Click to receive reliable, encrypted files: ${code}`,
      url: url,
    };

    try {
      if (
        navigator.share &&
        navigator.canShare &&
        navigator.canShare(shareData)
      ) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      }
    } catch (error) {
      console.error("Error sharing:", error);
      // Fallback to clipboard if share fails
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  // const [showQr, setShowQr] = useState(true); // Removed as QR is always visible
  const sessionUrl = `${window.location.origin}/?code=${code}`;

  const isExpiringSoon = timeLeft < 60000; // Less than 1 minute

  return (
    <div className="relative group">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
      <div className="relative bg-white/90 dark:bg-black/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/50 dark:border-white/10 p-8">
        <div className="text-center space-y-6">
          {/* Header with Security Badge */}
          <div className="flex items-center justify-center space-x-3 mb-2">
            <div className="flex items-center space-x-2 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-medium">
              <Shield className="h-3 w-3" />
              <span>Encrypted</span>
            </div>
          </div>

          <div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Share this code
            </h3>
          </div>

          {/* Code Display - Responsive */}
          <div className="relative">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 font-mono text-4xl font-bold text-white tracking-wider shadow-inner backdrop-blur-md">
              <div className="grid grid-cols-4 gap-3 max-w-[200px] mx-auto">
                {code.split("").map((char, index) => (
                  <div
                    key={index}
                    className="aspect-square flex items-center justify-center text-2xl sm:text-3xl font-mono font-bold bg-black/20 border border-white/10 rounded-lg text-white"
                  >
                    {char}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* QR Code Display */}
          <QRCodeDisplay url={sessionUrl} />

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-3">
            {/* Copy Code Button */}
            <button
              onClick={copyToClipboard}
              className={`p-3 rounded-xl font-medium transition-all duration-200 border border-white/10 hover:border-white/20 active:scale-95 flex items-center gap-2 text-sm ${
                copied
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
              }`}
              title="Copy Code"
            >
              <Copy className="h-4 w-4" />
              <span className="hidden sm:inline">Copy</span>
            </button>

            {/* Share Link Button */}
            <button
              onClick={shareLink}
              className={`p-3 rounded-xl font-medium transition-all duration-200 border border-white/10 hover:border-white/20 active:scale-95 flex items-center gap-2 text-sm ${
                linkCopied
                  ? "bg-blue-500/20 text-blue-400"
                  : "bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
              }`}
              title="Share Link"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-share-2"
              >
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
                <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
              </svg>
              <span className="hidden sm:inline">Share</span>
            </button>
          </div>

          {/* Timer */}
          <div
            className={`flex items-center justify-center space-x-2 text-sm px-4 py-2 rounded-full ${
              isExpiringSoon
                ? "bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 text-orange-700 dark:text-orange-400"
                : "bg-gradient-to-r from-slate-100 to-slate-200 dark:from-white/5 dark:to-white/10 text-slate-600 dark:text-gray-400"
            }`}
          >
            <Clock className="h-4 w-4" />
            <span className="font-medium">
              Expires in {formatTimeLeft(timeLeft)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
