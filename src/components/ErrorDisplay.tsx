import React from "react";
import { AlertTriangle, X, RefreshCw, Shield } from "lucide-react";

interface ErrorDisplayProps {
  error: string;
  onDismiss?: () => void;
  onRetry?: () => void;
  type?: "error" | "warning" | "info";
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onDismiss,
  onRetry,
  type = "error",
}) => {
  const getErrorStyles = () => {
    switch (type) {
      case "warning":
        return {
          container: "from-amber-50 to-orange-50 border-amber-200",
          text: "text-amber-800",
          icon: "text-amber-600",
          gradient: "from-amber-500 to-orange-500",
        };
      case "info":
        return {
          container: "from-blue-50 to-indigo-50 border-blue-200",
          text: "text-blue-800",
          icon: "text-blue-600",
          gradient: "from-blue-500 to-indigo-500",
        };
      default:
        return {
          container: "from-red-50 to-rose-50 border-red-200",
          text: "text-red-800",
          icon: "text-red-600",
          gradient: "from-red-500 to-rose-500",
        };
    }
  };

  const styles = getErrorStyles();

  return (
    <div className="relative group">
      <div
        className={`absolute inset-0 bg-gradient-to-r ${styles.gradient} rounded-xl sm:rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity`}
      ></div>
      <div
        className={`relative bg-gradient-to-r ${styles.container} border rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg`}
      >
        <div className="flex items-start space-x-3 sm:space-x-4">
          <div
            className={`flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-white/80 rounded-xl flex items-center justify-center ${styles.icon}`}
          >
            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1 sm:mb-2">
              <Shield className={`h-3 w-3 sm:h-4 sm:w-4 ${styles.icon}`} />
              <p className={`text-xs sm:text-sm font-semibold ${styles.text}`}>
                Security Notice
              </p>
            </div>
            <p className={`text-sm font-medium ${styles.text} break-words`}>
              {error}
            </p>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
            {onRetry && (
              <button
                onClick={onRetry}
                className={`p-1.5 sm:p-2 hover:bg-white/50 rounded-lg sm:rounded-xl transition-colors ${styles.icon} bg-white/30`}
                title="Retry"
              >
                <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
              </button>
            )}

            {onDismiss && (
              <button
                onClick={onDismiss}
                className={`p-1.5 sm:p-2 hover:bg-white/50 rounded-lg sm:rounded-xl transition-colors ${styles.icon} bg-white/30`}
                title="Dismiss"
              >
                <X className="h-3 w-3 sm:h-4 sm:w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
