import React, { useState, useRef, useEffect } from "react";
import { ArrowRight, Loader2, Shield, Lock } from "lucide-react";

interface CodeEntryProps {
  onCodeSubmit: (code: string) => void;
  isConnecting: boolean;
  error?: string;
  initialCode?: string;
}

export const CodeEntry: React.FC<CodeEntryProps> = ({
  onCodeSubmit,
  isConnecting,
  initialCode = "",
}) => {
  const [code, setCode] = useState(() => {
    const arr = ["", "", "", "", "", ""];
    if (initialCode) {
      for (let i = 0; i < initialCode.length && i < 6; i++) {
        arr[i] = initialCode[i];
      }
    }
    return arr;
  });
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-submit if initialCode is provided (only once)
  const hasAutoSubmitted = useRef(false);

  useEffect(() => {
    if (
      initialCode &&
      initialCode.length === 6 &&
      !isConnecting &&
      !hasAutoSubmitted.current
    ) {
      hasAutoSubmitted.current = true;
      onCodeSubmit(initialCode);
    }
  }, [initialCode, isConnecting, onCodeSubmit]);

  const handleInputChange = (index: number, value: string) => {
    if (value.length > 1) return; // Prevent multiple characters

    const upperValue = value.toUpperCase();
    const newCode = [...code];
    newCode[index] = upperValue;
    setCode(newCode);

    // Auto-focus next input
    if (upperValue && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when code is complete
    if (newCode.every((char) => char !== "") && !isConnecting) {
      setTimeout(() => onCodeSubmit(newCode.join("")), 100);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "Enter" && code.every((char) => char !== "")) {
      onCodeSubmit(code.join(""));
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData
      .getData("text")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6);
    const newCode = ["", "", "", "", "", ""];

    for (let i = 0; i < pastedData.length && i < 6; i++) {
      newCode[i] = pastedData[i];
    }

    setCode(newCode);

    if (newCode.every((char) => char !== "") && !isConnecting) {
      setTimeout(() => onCodeSubmit(newCode.join("")), 100);
    }
  };

  const isCodeComplete = code.every((char) => char !== "");

  useEffect(() => {
    if (!initialCode) {
      inputRefs.current[0]?.focus();
    }
  }, [initialCode]);

  return (
    <div className="relative group">
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-3xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
      <div className="relative bg-black/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/10 p-8">
        <div className="text-center space-y-8">
          {/* Header with Security Indicators */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <div className="flex items-center space-x-2 bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-xs font-medium">
                <Shield className="h-3 w-3" />
                <span>Secure Connection</span>
              </div>
              <div className="flex items-center space-x-2 bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full text-xs font-medium">
                <Lock className="h-3 w-3" />
                <span>End-to-End</span>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-white mb-2">
                Receive Files
              </h3>
              <p className="text-gray-400 text-base">
                Enter the 6-character sharing code
              </p>
            </div>
          </div>

          {/* Code Input - Responsive Grid */}
          <div className="grid grid-cols-6 gap-3 max-w-xs mx-auto">
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className="aspect-square text-center text-xl font-bold border-2 border-white/20 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-900 transition-all duration-200 bg-white/5 backdrop-blur-sm shadow-sm hover:shadow-md text-white"
                disabled={isConnecting}
              />
            ))}
          </div>

          {/* Connect Button */}
          <button
            onClick={() => onCodeSubmit(code.join(""))}
            disabled={!isCodeComplete || isConnecting}
            className="w-full px-6 sm:px-8 py-3 sm:py-4 bg-white text-black rounded-xl sm:rounded-2xl font-semibold hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none text-sm sm:text-base"
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <span>Connect Securely</span>
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
