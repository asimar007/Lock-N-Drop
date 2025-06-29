import React, { useEffect } from "react";
import { CheckCircle, X, AlertCircle, Info } from "lucide-react";

interface ToastProps {
  message: string;
  type?: "success" | "error" | "warning" | "info";
  duration?: number;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = "success",
  duration = 5000,
  onClose,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getToastStyles = () => {
    switch (type) {
      case "success":
        return {
          container: "from-emerald-50 to-teal-50 border-emerald-200",
          text: "text-emerald-800",
          icon: "text-emerald-600",
          iconComponent: CheckCircle,
        };
      case "error":
        return {
          container: "from-red-50 to-rose-50 border-red-200",
          text: "text-red-800",
          icon: "text-red-600",
          iconComponent: AlertCircle,
        };
      case "warning":
        return {
          container: "from-amber-50 to-orange-50 border-amber-200",
          text: "text-amber-800",
          icon: "text-amber-600",
          iconComponent: AlertCircle,
        };
      case "info":
        return {
          container: "from-blue-50 to-indigo-50 border-blue-200",
          text: "text-blue-800",
          icon: "text-blue-600",
          iconComponent: Info,
        };
      default:
        return {
          container: "from-emerald-50 to-teal-50 border-emerald-200",
          text: "text-emerald-800",
          icon: "text-emerald-600",
          iconComponent: CheckCircle,
        };
    }
  };

  const styles = getToastStyles();
  const IconComponent = styles.iconComponent;

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-down">
      <div
        className={`bg-gradient-to-r ${styles.container} border rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg max-w-sm`}
      >
        <div className="flex items-start space-x-3">
          <div
            className={`flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 bg-white/80 rounded-xl flex items-center justify-center ${styles.icon}`}
          >
            <IconComponent className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>

          <div className="flex-1 min-w-0">
            <p
              className={`text-sm sm:text-base font-medium ${styles.text} break-words`}
            >
              {message}
            </p>
          </div>

          <button
            onClick={onClose}
            className={`flex-shrink-0 p-1 hover:bg-white/50 rounded-lg transition-colors ${styles.icon} bg-white/30`}
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
