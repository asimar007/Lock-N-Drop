import React, { useState, useEffect } from 'react';
import { Copy, Clock, Shield } from 'lucide-react';

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
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const isExpiringSoon = timeLeft < 60000; // Less than 1 minute

  return (
    <div className="relative group">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl sm:rounded-3xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
      <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-xl border border-white/50 p-6 sm:p-8">
        <div className="text-center space-y-4 sm:space-y-6">
          {/* Header with Security Badge */}
          <div className="flex items-center justify-center space-x-3 mb-2">
            <div className="flex items-center space-x-2 bg-emerald-100 text-emerald-700 px-2 sm:px-3 py-1 rounded-full text-xs font-medium">
              <Shield className="h-3 w-3" />
              <span>Encrypted</span>
            </div>
          </div>
          
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
              Share this code
            </h3>
            <p className="text-slate-500 text-sm sm:text-base">
              Give this code to the person who wants to receive your files
            </p>
          </div>

          {/* Code Display - Responsive */}
          <div className="relative">
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-8 font-mono text-2xl sm:text-4xl font-bold text-slate-900 tracking-wider shadow-inner">
              <div className="grid grid-cols-6 gap-1 sm:gap-2 max-w-xs mx-auto">
                {code.split('').map((char, index) => (
                  <div key={index} className="text-center">
                    {char}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Copy Button */}
          <div className="flex items-center justify-center">
            <button
              onClick={copyToClipboard}
              className={`px-6 sm:px-8 py-3 rounded-xl sm:rounded-2xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm sm:text-base ${
                copied
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Copy className="h-4 w-4" />
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </div>
            </button>
          </div>

          {/* Timer */}
          <div className={`flex items-center justify-center space-x-2 text-sm px-3 sm:px-4 py-2 rounded-full ${
            isExpiringSoon 
              ? 'bg-gradient-to-r from-orange-100 to-red-100 text-orange-700' 
              : 'bg-gradient-to-r from-slate-100 to-slate-200 text-slate-600'
          }`}>
            <Clock className="h-4 w-4" />
            <span className="font-medium">Expires in {formatTimeLeft(timeLeft)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};