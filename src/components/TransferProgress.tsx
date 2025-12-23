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
        return <CheckCircle className="h-5 w-5 text-emerald-500" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "transferring":
        return role === "sender" ? (
          <Upload className="h-5 w-5 text-blue-500 animate-pulse" />
        ) : (
          <Download className="h-5 w-5 text-emerald-500 animate-pulse" />
        );
      default:
        return <Clock className="h-5 w-5 text-slate-400" />;
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
        } rounded-3xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity`}
      ></div>

      <div className="relative bg-black/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/10 p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-row flex-wrap items-center justify-between gap-3 sm:gap-0">
          <div className="flex items-center space-x-3">
            <div
              className={`w-10 h-10 bg-gradient-to-br ${
                role === "sender"
                  ? "from-blue-500/20 to-indigo-500/20"
                  : "from-emerald-500/20 to-teal-500/20"
              } rounded-xl flex items-center justify-center`}
            >
              {role === "sender" ? (
                <Upload
                  className={`h-5 w-5 ${
                    role === "sender" ? "text-blue-400" : "text-emerald-400"
                  }`}
                />
              ) : (
                <Download className="h-5 w-5 text-emerald-400" />
              )}
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">
                {role === "sender" ? "Sending Files" : "Receiving Files"}
              </h3>
              <p className="text-sm text-gray-400">
                {completedFiles} of {totalFiles} files completed
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-xs font-medium">
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
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-300">
              Overall Progress
            </span>
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-bold text-white">
                {Math.round(overallProgress)}%
              </span>
            </div>
          </div>

          <div className="relative">
            <div className="w-full bg-gray-800 rounded-full h-4 overflow-hidden">
              <div
                className={`h-4 bg-gradient-to-r ${getProgressBarColor()} rounded-full transition-all duration-500 ease-out relative overflow-hidden`}
                style={{ width: `${overallProgress}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>
          </div>

          <div className="flex flex-row justify-between gap-0 text-sm">
            <span className="text-gray-400 font-medium">
              {formatFileSize(transferredSize)} of {formatFileSize(totalSize)}
            </span>
            {transfers.some((t) => t.speed) && (
              <span className="text-gray-400 font-medium">
                {formatTransferSpeed(
                  transfers.reduce((sum, t) => sum + (t.speed || 0), 0)
                )}
              </span>
            )}
          </div>
        </div>

        {/* Individual File Progress */}
        <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
          {transfers.map((transfer) => (
            <div
              key={transfer.id}
              className="flex items-center space-x-4 p-4 bg-white/5 rounded-2xl border border-white/10 hover:shadow-md transition-all duration-200"
            >
              <div className="flex-shrink-0">
                {getStatusIcon(transfer.status)}
              </div>

              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white truncate">
                    {transfer.name}
                  </p>
                  <span className="text-xs text-gray-400 font-medium ml-2 flex-shrink-0">
                    {formatFileSize(transfer.size)}
                  </span>
                </div>

                {transfer.status === "transferring" && (
                  <>
                    <div className="relative">
                      <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 bg-gradient-to-r ${getStatusColor(
                            transfer.status
                          )} rounded-full transition-all duration-300 relative overflow-hidden`}
                          style={{ width: `${transfer.progress * 100}%` }}
                        >
                          <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400 font-medium">
                        {Math.round(transfer.progress * 100)}%
                      </span>
                      {transfer.remainingTime && (
                        <span className="text-gray-400">
                          ~{formatTime(transfer.remainingTime)} left
                        </span>
                      )}
                    </div>
                  </>
                )}

                {transfer.status === "completed" && (
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    <p className="text-xs text-emerald-400 font-medium">
                      Transfer complete
                    </p>
                  </div>
                )}

                {transfer.status === "failed" && (
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <p className="text-xs text-red-400 font-medium">
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
