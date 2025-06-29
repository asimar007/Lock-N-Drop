import React, { useState, useEffect } from "react";
import {
  Lock,
  ArrowLeft,
  Plus,
  ArrowDown,
  Shield,
  Clock,
  Database,
  Moon,
  Sun,
} from "lucide-react";
import { FileSelector } from "./components/FileSelector";
import { SessionCodeDisplay } from "./components/SessionCodeDisplay";
import { CodeEntry } from "./components/CodeEntry";
import { TransferProgress } from "./components/TransferProgress";
import { SetupInstructions } from "./components/SetupInstructions";
import { ErrorDisplay } from "./components/ErrorDisplay";
import { Toast } from "./components/Toast";
import { useFileTransfer } from "./hooks/useFileTransfer";

type AppMode = "select" | "send" | "receive";

function App() {
  const [mode, setMode] = useState<AppMode>("select");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check for saved theme preference or default to light mode
    const saved = localStorage.getItem("theme");
    return (
      saved === "dark" ||
      (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches)
    );
  });

  const {
    session,
    connectionStatus,
    error,
    initializeSession,
    startTransfer,
    connectToSession,
    resetSession,
    setOnTransferComplete,
    dismissError,
  } = useFileTransfer();

  // Apply dark mode to document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  // Check if Supabase is configured
  const isSupabaseConfigured = !!(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
  );

  // Set up transfer complete handler to show toast (no auto-redirect)
  useEffect(() => {
    setOnTransferComplete(() => {
      if (session?.role === "sender") {
        setToastMessage("File ready to download");
        setShowToast(true);
      }
    });
  }, [setOnTransferComplete, session?.role]);

  const handleSendFiles = () => {
    if (selectedFiles.length === 0) return;

    initializeSession("sender", selectedFiles);
    setMode("send");
  };

  const handleStartTransfer = () => {
    if (session && selectedFiles.length > 0) {
      startTransfer(selectedFiles);
    }
  };

  const handleReceiveMode = () => {
    setMode("receive");
  };

  const handleCodeSubmit = async (code: string) => {
    await connectToSession(code);
  };

  const handleReset = () => {
    resetSession();
    setSelectedFiles([]);
    setMode("select");
    setShowToast(false);
  };

  const regenerateCode = () => {
    if (selectedFiles.length > 0) {
      resetSession();
      initializeSession("sender", selectedFiles);
    }
  };

  const handleRetryConnection = () => {
    dismissError();
    if (mode === "send" && selectedFiles.length > 0) {
      regenerateCode();
    }
  };

  const handleCloseToast = () => {
    setShowToast(false);
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isDarkMode
          ? "bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900"
          : "bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100"
      }`}
    >
      {/* Enhanced Header with Dark Mode */}
      <header
        className={`backdrop-blur-xl border-b sticky top-0 z-50 shadow-sm transition-colors duration-300 ${
          isDarkMode
            ? "bg-slate-900/80 border-slate-700/20"
            : "bg-white/80 border-white/20"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="relative">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Lock className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                </div>
              </div>
              <div>
                <h1
                  className={`text-lg sm:text-2xl font-bold bg-gradient-to-r bg-clip-text text-transparent transition-colors duration-300 ${
                    isDarkMode
                      ? "from-white to-slate-300"
                      : "from-slate-900 to-slate-700"
                  }`}
                >
                  LocknDrop
                </h1>
                <p
                  className={`text-xs font-medium hidden sm:block transition-colors duration-300 ${
                    isDarkMode ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  End-to-End Encrypted
                </p>
              </div>
            </div>

            {/* Desktop Navigation Features */}
            <div className="hidden lg:flex items-center space-x-6 xl:space-x-8">
              <div
                className={`flex items-center space-x-2 transition-colors duration-300 ${
                  isDarkMode ? "text-slate-300" : "text-slate-600"
                }`}
              >
                <Shield className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-medium">AES-256 Encryption</span>
              </div>

              <div
                className={`flex items-center space-x-2 transition-colors duration-300 ${
                  isDarkMode ? "text-slate-300" : "text-slate-600"
                }`}
              >
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">24h Auto-Delete</span>
              </div>

              <div
                className={`flex items-center space-x-2 transition-colors duration-300 ${
                  isDarkMode ? "text-slate-300" : "text-slate-600"
                }`}
              >
                <Database className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">No File Storage</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center space-x-3">
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className={`p-2 sm:p-2.5 rounded-xl transition-all duration-300 hover:scale-105 ${
                  isDarkMode
                    ? "bg-slate-800 hover:bg-slate-700 text-yellow-400"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                }`}
                title={
                  isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"
                }
              >
                {isDarkMode ? (
                  <Sun className="h-4 w-4 sm:h-5 sm:w-5" />
                ) : (
                  <Moon className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
              </button>

              {/* Demo Badge */}
              {!isSupabaseConfigured && (
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                  <span
                    className={`text-xs px-2 sm:px-3 py-1 rounded-full font-medium border transition-colors duration-300 ${
                      isDarkMode
                        ? "bg-gradient-to-r from-amber-900/50 to-orange-900/50 text-amber-300 border-amber-700"
                        : "bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border-amber-200"
                    }`}
                  >
                    Demo Mode
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Tablet Features Bar */}
          <div className="md:flex lg:hidden mt-4 items-center justify-center space-x-6 text-xs hidden">
            <div
              className={`flex items-center space-x-1 transition-colors duration-300 ${
                isDarkMode ? "text-slate-300" : "text-slate-600"
              }`}
            >
              <Shield className="h-3 w-3 text-emerald-500" />
              <span>Encrypted</span>
            </div>
            <div
              className={`flex items-center space-x-1 transition-colors duration-300 ${
                isDarkMode ? "text-slate-300" : "text-slate-600"
              }`}
            >
              <Clock className="h-3 w-3 text-blue-500" />
              <span>Auto-Delete</span>
            </div>
            <div
              className={`flex items-center space-x-1 transition-colors duration-300 ${
                isDarkMode ? "text-slate-300" : "text-slate-600"
              }`}
            >
              <Database className="h-3 w-3 text-purple-500" />
              <span>Secure</span>
            </div>
          </div>
        </div>
      </header>

      {/* Toast Notification */}
      {showToast && (
        <Toast
          message={toastMessage}
          type="success"
          onClose={handleCloseToast}
        />
      )}

      {/* Main Content */}
      <main className="max-w-sm sm:max-w-md lg:max-w-lg xl:max-w-xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Global Error Display */}
        {error && (
          <div className="mb-4 sm:mb-6">
            <ErrorDisplay
              error={error}
              onDismiss={dismissError}
              onRetry={handleRetryConnection}
              type="error"
            />
          </div>
        )}

        {!isSupabaseConfigured && mode === "select" && <SetupInstructions />}

        {mode === "select" && (
          <div className="space-y-4 sm:space-y-6">
            {/* Send Card */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl sm:rounded-3xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
              <div
                className={`relative backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-xl border p-6 sm:p-8 text-center hover:shadow-2xl transition-all duration-300 ${
                  isDarkMode
                    ? "bg-slate-800/90 border-slate-700/50"
                    : "bg-white/90 border-white/50"
                }`}
              >
                <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full"></div>
                  </div>
                </div>

                <h2
                  className={`text-xl sm:text-2xl font-bold mb-4 sm:mb-6 transition-colors duration-300 ${
                    isDarkMode ? "text-white" : "text-slate-900"
                  }`}
                >
                  Send Files
                </h2>

                <div className="mb-6 sm:mb-8">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 border-2 border-dashed border-blue-200 group-hover:border-blue-300 transition-colors">
                    <Plus className="h-8 w-8 sm:h-10 sm:w-10 text-blue-500" />
                  </div>
                  <p
                    className={`text-sm transition-colors duration-300 ${
                      isDarkMode ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    Select files to share securely
                  </p>
                </div>

                <FileSelector
                  onFilesSelected={setSelectedFiles}
                  selectedFiles={selectedFiles}
                  maxFileSize={20 * 1024 * 1024} // 20MB limit
                />

                {selectedFiles.length > 0 && (
                  <button
                    onClick={handleSendFiles}
                    className="w-full mt-4 sm:mt-6 px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl sm:rounded-2xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm sm:text-base"
                  >
                    Generate Sharing Code
                  </button>
                )}
              </div>
            </div>

            {/* Receive Card */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl sm:rounded-3xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
              <div
                className={`relative backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-xl border p-6 sm:p-8 text-center hover:shadow-2xl transition-all duration-300 ${
                  isDarkMode
                    ? "bg-slate-800/90 border-slate-700/50"
                    : "bg-white/90 border-white/50"
                }`}
              >
                <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full flex items-center justify-center">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-500 rounded-full"></div>
                  </div>
                </div>

                <h2
                  className={`text-xl sm:text-2xl font-bold mb-4 sm:mb-6 transition-colors duration-300 ${
                    isDarkMode ? "text-white" : "text-slate-900"
                  }`}
                >
                  Receive Files
                </h2>

                <div className="mb-6 sm:mb-8">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 border border-emerald-200">
                    <ArrowDown className="h-8 w-8 sm:h-10 sm:w-10 text-emerald-500" />
                  </div>
                  <p
                    className={`text-sm transition-colors duration-300 ${
                      isDarkMode ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    Enter the sharing code
                  </p>
                </div>

                <button
                  onClick={handleReceiveMode}
                  className={`w-full px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm sm:text-base ${
                    isDarkMode
                      ? "bg-gradient-to-r from-slate-700 to-slate-600 text-slate-200 hover:from-slate-600 hover:to-slate-500"
                      : "bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 hover:from-slate-200 hover:to-slate-300"
                  }`}
                >
                  Enter Code
                </button>
              </div>
            </div>
          </div>
        )}

        {mode === "send" && session && (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <button
                onClick={handleReset}
                className={`p-2 sm:p-3 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 ${
                  isDarkMode
                    ? "text-slate-400 hover:text-slate-200 bg-slate-800/80"
                    : "text-slate-400 hover:text-slate-600 bg-white/80"
                }`}
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
              <h2
                className={`text-2xl sm:text-3xl font-bold bg-gradient-to-r bg-clip-text text-transparent transition-colors duration-300 ${
                  isDarkMode
                    ? "from-white to-slate-300"
                    : "from-slate-900 to-slate-700"
                }`}
              >
                Send Files
              </h2>
            </div>

            <SessionCodeDisplay
              code={session.code}
              expiresAt={Date.now() + 10 * 60 * 1000} // 10 minutes
            />

            {session.status === "waiting" &&
              connectionStatus !== "connected" && (
                <div
                  className={`border rounded-xl sm:rounded-2xl p-4 sm:p-6 transition-colors duration-300 ${
                    isDarkMode
                      ? "bg-gradient-to-r from-amber-900/50 to-orange-900/50 border-amber-700"
                      : "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-amber-400 rounded-full animate-pulse"></div>
                    <p
                      className={`font-medium text-sm sm:text-base transition-colors duration-300 ${
                        isDarkMode ? "text-amber-300" : "text-amber-800"
                      }`}
                    >
                      Waiting for someone to connect using the code above...
                    </p>
                  </div>
                </div>
              )}

            {connectionStatus === "connected" &&
              session.status === "waiting" && (
                <div className="space-y-4">
                  <div
                    className={`border rounded-xl sm:rounded-2xl p-4 sm:p-6 transition-colors duration-300 ${
                      isDarkMode
                        ? "bg-gradient-to-r from-emerald-900/50 to-teal-900/50 border-emerald-700"
                        : "bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                      <p
                        className={`font-medium text-sm sm:text-base transition-colors duration-300 ${
                          isDarkMode ? "text-emerald-300" : "text-emerald-800"
                        }`}
                      >
                        Connected! Ready to transfer files.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleStartTransfer}
                    className="w-full px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl sm:rounded-2xl font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm sm:text-base"
                  >
                    Start Transfer
                  </button>
                </div>
              )}

            {(session.status === "transferring" ||
              session.status === "completed") && (
              <TransferProgress
                transfers={session.files}
                role="sender"
                connectionStatus={connectionStatus}
              />
            )}
          </div>
        )}

        {mode === "receive" && (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <button
                onClick={handleReset}
                className={`p-2 sm:p-3 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 ${
                  isDarkMode
                    ? "text-slate-400 hover:text-slate-200 bg-slate-800/80"
                    : "text-slate-400 hover:text-slate-600 bg-white/80"
                }`}
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
              <h2
                className={`text-2xl sm:text-3xl font-bold bg-gradient-to-r bg-clip-text text-transparent transition-colors duration-300 ${
                  isDarkMode
                    ? "from-white to-slate-300"
                    : "from-slate-900 to-slate-700"
                }`}
              >
                Receive Files
              </h2>
            </div>

            {!session && (
              <CodeEntry
                onCodeSubmit={handleCodeSubmit}
                isConnecting={connectionStatus === "connecting"}
                error={error}
              />
            )}

            {session &&
              session.files.length === 0 &&
              connectionStatus === "connected" && (
                <div
                  className={`border rounded-xl sm:rounded-2xl p-4 sm:p-6 transition-colors duration-300 ${
                    isDarkMode
                      ? "bg-gradient-to-r from-blue-900/50 to-indigo-900/50 border-blue-700"
                      : "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                    <p
                      className={`font-medium text-sm sm:text-base transition-colors duration-300 ${
                        isDarkMode ? "text-blue-300" : "text-blue-800"
                      }`}
                    >
                      Connected successfully! Waiting for files...
                    </p>
                  </div>
                </div>
              )}

            {session && session.files.length > 0 && (
              <TransferProgress
                transfers={session.files}
                role="receiver"
                connectionStatus={connectionStatus}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
