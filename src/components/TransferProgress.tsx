import React from "react";
import {
  Download,
  Upload,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  Zap,
} from "lucide-react";
import {
  formatFileSize,
  formatTransferSpeed,
  formatTime,
} from "../utils/fileUtils";
import type { FileTransfer } from "../types";

interface TransferProgressProps {
  transfers: FileTransfer[];
  role: "sender" | "receiver";
  connectionStatus: string;
}

export const TransferProgress: React.FC<TransferProgressProps> = ({
  transfers,
  role,
  connectionStatus,
}) => {
  const totalFiles = transfers.length;
  const completedFiles = transfers.filter(
    (t) => t.status === "completed"
  ).length;
  const totalSize = transfers.reduce((sum, t) => sum + t.size, 0);
  const transferredSize = transfers.reduce(
    (sum, t) => sum + t.size * t.progress,
    0
  );
  const overallProgress =
    totalSize > 0 ? (transferredSize / totalSize) * 100 : 0;

  const getStatusIcon = (status: FileTransfer["status"]) => {
    switch (status) {
      case "completed":
        return (
          <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500" />
        );
      case "failed":
        return <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />;
      case "transferring":
        return role === "sender" ? (
          <Upload className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 animate-pulse" />
        ) : (
          <Download className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500 animate-pulse" />
        );
      default:
        return <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />;
    }
  };

  const getStatusColor = (status: FileTransfer["status"]) => {
    switch (status) {
      case "completed":
        return "from-emerald-500 to-teal-500";
      case "failed":
        return "from-red-500 to-rose-500";
      case "transferring":
        return role === "sender"
          ? "from-blue-500 to-indigo-500"
          : "from-emerald-500 to-teal-500";
      default:
        return "from-slate-300 to-slate-400";
    }
  };

  const getProgressBarColor = () => {
    if (role === "sender") {
      return "from-blue-500 to-indigo-500";
    }
    return "from-emerald-500 to-teal-500";
  };

  return (
    <div className="relative group">
      <div
        className={`absolute inset-0 bg-gradient-to-r ${
          role === "sender"
            ? "from-blue-600 to-indigo-600"
            : "from-emerald-500 to-teal-600"
        } rounded-2xl sm:rounded-3xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity`}
      ></div>

      <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-xl border border-white/50 p-6 sm:p-8 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
          <div className="flex items-center space-x-3">
            <div
              className={`w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br ${
                role === "sender"
                  ? "from-blue-100 to-indigo-100"
                  : "from-emerald-100 to-teal-100"
              } rounded-xl flex items-center justify-center`}
            >
              {role === "sender" ? (
                <Upload
                  className={`h-4 w-4 sm:h-5 sm:w-5 ${
                    role === "sender" ? "text-blue-600" : "text-emerald-600"
                  }`}
                />
              ) : (
                <Download className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
              )}
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                {role === "sender" ? "Sending Files" : "Receiving Files"}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500">
                {completedFiles} of {totalFiles} files completed
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-emerald-100 text-emerald-700 px-2 sm:px-3 py-1 rounded-full text-xs font-medium">
              <Shield className="h-3 w-3" />
              <span>Encrypted</span>
            </div>
            <div
              className={`w-3 h-3 rounded-full ${
                connectionStatus === "connected"
                  ? "bg-emerald-500"
                  : "bg-amber-500 animate-pulse"
              }`}
            />
          </div>
        </div>

        {/* Overall Progress */}
        <div className="space-y-3 sm:space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-slate-700">
              Overall Progress
            </span>
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-bold text-slate-900">
                {Math.round(overallProgress)}%
              </span>
            </div>
          </div>

          <div className="relative">
            <div className="w-full bg-slate-200 rounded-full h-3 sm:h-4 overflow-hidden">
              <div
                className={`h-3 sm:h-4 bg-gradient-to-r ${getProgressBarColor()} rounded-full transition-all duration-500 ease-out relative overflow-hidden`}
                style={{ width: `${overallProgress}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0 text-xs sm:text-sm">
            <span className="text-slate-600 font-medium">
              {formatFileSize(transferredSize)} of {formatFileSize(totalSize)}
            </span>
            {transfers.some((t) => t.speed) && (
              <span className="text-slate-600 font-medium">
                {formatTransferSpeed(
                  transfers.reduce((sum, t) => sum + (t.speed || 0), 0)
                )}
              </span>
            )}
          </div>
        </div>

        {/* Individual File Progress */}
        <div className="space-y-2 sm:space-y-3 max-h-60 sm:max-h-80 overflow-y-auto custom-scrollbar">
          {transfers.map((transfer, index) => (
            <div
              key={transfer.id}
              className="flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl sm:rounded-2xl border border-slate-200 hover:shadow-md transition-all duration-200"
            >
              <div className="flex-shrink-0">
                {getStatusIcon(transfer.status)}
              </div>

              <div className="flex-1 min-w-0 space-y-1 sm:space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {transfer.name}
                  </p>
                  <span className="text-xs text-slate-500 font-medium ml-2 flex-shrink-0">
                    {formatFileSize(transfer.size)}
                  </span>
                </div>

                {transfer.status === "transferring" && (
                  <>
                    <div className="relative">
                      <div className="w-full bg-slate-200 rounded-full h-1.5 sm:h-2 overflow-hidden">
                        <div
                          className={`h-1.5 sm:h-2 bg-gradient-to-r ${getStatusColor(
                            transfer.status
                          )} rounded-full transition-all duration-300 relative overflow-hidden`}
                          style={{ width: `${transfer.progress * 100}%` }}
                        >
                          <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600 font-medium">
                        {Math.round(transfer.progress * 100)}%
                      </span>
                      {transfer.remainingTime && (
                        <span className="text-slate-600">
                          ~{formatTime(transfer.remainingTime)} left
                        </span>
                      )}
                    </div>
                  </>
                )}

                {transfer.status === "completed" && (
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    <p className="text-xs text-emerald-600 font-medium">
                      Transfer complete
                    </p>
                  </div>
                )}

                {transfer.status === "failed" && (
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <p className="text-xs text-red-600 font-medium">
                      Transfer failed
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
