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
          text: "text-emerald-500",
          iconComponent: CheckCircle,
        };
      case "error":
        return {
          text: "text-red-500",
          iconComponent: AlertCircle,
        };
      case "warning":
        return {
          text: "text-amber-500",
          iconComponent: AlertCircle,
        };
      case "info":
        return {
          text: "text-blue-500",
          iconComponent: Info,
        };
      default:
        return {
          text: "text-emerald-500",
          iconComponent: CheckCircle,
        };
    }
  };

  const styles = getToastStyles();
  const IconComponent = styles.iconComponent;

  return (
    <div className="fixed top-20 right-4 z-50 animate-slide-left">
      <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-lg p-3 shadow-2xl flex items-center space-x-3 min-w-[300px]">
        <div className={`p-1.5 rounded-md bg-white/5 ${styles.text}`}>
          <IconComponent className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-white">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
