import React, { useState, useEffect, useCallback } from "react";
import {
  Lock,
  ArrowLeft,
  Plus,
  ArrowDown,
  Shield,
  Database,
  Github,
  Zap,
} from "lucide-react";
import { FileSelector } from "./components/FileSelector";
import { SessionCodeDisplay } from "./components/SessionCodeDisplay";
import { CodeEntry } from "./components/CodeEntry";
import { TransferProgress } from "./components/TransferProgress";
import { ErrorDisplay } from "./components/ErrorDisplay";
import { Toast } from "./components/Toast";
import { PrivacyPolicy, TermsOfService } from "./components/LegalModals";
import { NotFound } from "./components/NotFound";

import { useFileTransfer } from "./hooks/useFileTransfer";

type AppMode = "select" | "send" | "receive";

function App() {
  const [mode, setMode] = useState<AppMode>("select");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<
    "success" | "error" | "warning" | "info"
  >("success");

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

  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const [initialCode, setInitialCode] = useState("");

  // Enforce dark mode on mount and check for shared code
  useEffect(() => {
    document.documentElement.classList.add("dark");

    // Check for "code" query parameter
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get("code");

    if (codeParam) {
      // Check if WE are the sender of this code (via sessionStorage)
      const isMyCode = sessionStorage.getItem("lnd_sender_code") === codeParam;

      if (isMyCode) {
        // Clear the URL and storage, stay in "select" mode
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );
        sessionStorage.removeItem("lnd_sender_code");
        return;
      }

      const sanitizedCode = codeParam
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 6);

      if (sanitizedCode.length === 6) {
        setInitialCode(sanitizedCode);
        setMode("receive");
        // Clear the query param from URL without refreshing
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );
      }
    }
  }, []);

  // Update URL with code when session is active (Sender)
  useEffect(() => {
    if (session && session.role === "sender" && session.code) {
      const url = new URL(window.location.href);
      url.searchParams.set("code", session.code);
      window.history.pushState({}, "", url);

      // Mark this code as ours
      sessionStorage.setItem("lnd_sender_code", session.code);
    } else if (!session && mode === "select") {
      // Clear code from URL when resetting to select mode
      const url = new URL(window.location.href);
      if (url.searchParams.has("code")) {
        url.searchParams.delete("code");
        window.history.pushState({}, "", url);
      }
      // Clear our ownership flag
      sessionStorage.removeItem("lnd_sender_code");
    }
  }, [session, mode]);

  // Prevent accidental refresh during active session
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (
        session &&
        session.status !== "completed" &&
        session.status !== "failed"
      ) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [session]);

  const handleSendFiles = () => {
    if (selectedFiles.length === 0) return;

    initializeSession("sender", selectedFiles);
    setMode("send");
  };

  const handleStartTransfer = useCallback(() => {
    if (session && selectedFiles.length > 0) {
      startTransfer(selectedFiles);
    }
  }, [session, selectedFiles, startTransfer]);

  // Auto-start transfer when connected
  useEffect(() => {
    if (
      session &&
      session.role === "sender" &&
      session.status === "waiting" &&
      connectionStatus === "connected" &&
      selectedFiles.length > 0
    ) {
      // Small delay to ensure connection is stable and UI updates
      const timer = setTimeout(() => {
        handleStartTransfer();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [session, connectionStatus, selectedFiles, handleStartTransfer]);

  const handleReceiveMode = () => {
    setMode("receive");
  };

  const handleCodeSubmit = async (code: string) => {
    await connectToSession(code);
  };

  const handleReset = React.useCallback(() => {
    resetSession();
    setSelectedFiles([]);
    setMode("select");
  }, [resetSession]);

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

  // Handle specific errors via Toast instead of ErrorDisplay
  useEffect(() => {
    if (error === "Invalid or expired code. Please check and try again.") {
      setToastMessage(error);
      setToastType("error");
      setShowToast(true);
      dismissError();
    }
  }, [error, dismissError]);

  // Set up transfer complete handler to reset to home page with delay
  useEffect(() => {
    setOnTransferComplete(() => {
      // Small delay to show success state before redirecting
      setTimeout(() => {
        handleReset();
        // Show a toast to confirm success
        setToastMessage("Transfer completed successfully!");
        setToastType("success");
        setShowToast(true);
      }, 3000);
    });
  }, [setOnTransferComplete, handleReset]);

  // Check proper path
  if (
    window.location.pathname !== "/" &&
    window.location.pathname !== "/index.html"
  ) {
    return <NotFound />;
  }

  return (
    <div className="min-h-screen relative font-sans selection:bg-white selection:text-black bg-black text-white">
      {/* Background Grid Pattern */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#222_1px,transparent_1px),linear-gradient(to_bottom,#222_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40"></div>
        <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-blue-900/10 via-transparent to-transparent blur-3xl opacity-30"></div>
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <header className="border-b backdrop-blur-md sticky top-0 z-50 border-white/10 bg-black/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={handleReset}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-lg bg-white text-black">
                <Lock className="h-4 w-4" />
              </div>
              <span className="font-bold tracking-tight text-lg">
                LocknDrop
              </span>
            </div>

            <div className="hidden md:flex items-center gap-6 text-sm font-medium opacity-60">
              <span
                className="flex items-center gap-1.5 hover:opacity-100 transition-opacity cursor-help"
                title="AES-256 GCM encryption in browser"
              >
                <Shield className="h-3.5 w-3.5" /> End-to-End Encrypted
              </span>
              <span
                className="flex items-center gap-1.5 hover:opacity-100 transition-opacity cursor-help"
                title="Files travel directly between devices"
              >
                <Database className="h-3.5 w-3.5" /> No Cloud Storage
              </span>
              <span
                className="flex items-center gap-1.5 hover:opacity-100 transition-opacity cursor-help"
                title="Direct P2P transfer"
              >
                <Zap className="h-3.5 w-3.5" /> Unlimited Speed (P2P)
              </span>
            </div>

            <div className="flex items-center gap-3">
              <a
                href="https://github.com/asimar007/Lock-N-Drop"
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-full transition-colors hover:bg-white/10"
              >
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>
        </header>

        {/* Toast */}
        {showToast && (
          <Toast
            message={toastMessage}
            type={toastType}
            onClose={handleCloseToast}
          />
        )}

        {/* Main Content */}
        <main className="flex-grow flex flex-col items-center justify-start pt-6 sm:pt-10 px-4 sm:px-6 pb-12">
          {/* Hero Text */}
          {mode === "select" && (
            <div className="text-center mb-12 animate-fade-in space-y-4">
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-3xl mx-auto bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-500">
                Share files securely. <br /> Leave no trace.
              </h1>
            </div>
          )}

          <div className="w-full max-w-lg">
            {/* Global Error Display */}
            {error && (
              <div className="mb-6">
                <ErrorDisplay
                  error={error}
                  onDismiss={dismissError}
                  onRetry={handleRetryConnection}
                  type="error"
                />
              </div>
            )}

            {mode === "select" && (
              <div className="grid gap-6 animate-slide-up">
                {/* Send Card */}
                <div className="group relative p-1 rounded-2xl transition-all duration-300 hover:bg-gradient-to-br hover:from-blue-500/20 hover:to-purple-500/20">
                  <div className="relative p-6 rounded-xl border transition-all duration-300 bg-black border-white/10 hover:border-white/20">
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <h2 className="text-2xl font-bold mb-2">Send Files</h2>
                        <p className="text-sm text-gray-400">
                          Create a secure, ephemeral link.
                        </p>
                      </div>
                      <div className="p-3 rounded-full bg-white/5">
                        <Plus className="h-6 w-6 text-blue-400" />
                      </div>
                    </div>

                    <FileSelector
                      onFilesSelected={setSelectedFiles}
                      selectedFiles={selectedFiles}
                    />

                    {selectedFiles.length > 0 && (
                      <button
                        onClick={handleSendFiles}
                        className="w-full mt-6 py-3.5 px-4 rounded-lg font-medium transition-all transform active:scale-95 bg-white text-black hover:bg-gray-200"
                      >
                        Generate Sharing Code
                      </button>
                    )}
                  </div>
                </div>

                {/* Receive Card */}
                <div className="group relative p-1 rounded-2xl transition-all duration-300 hover:bg-gradient-to-br hover:from-emerald-500/20 hover:to-teal-500/20">
                  <div className="relative p-6 rounded-xl border transition-all duration-300 bg-black border-white/10 hover:border-white/20">
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <h2 className="text-2xl font-bold mb-2">
                          Receive Files
                        </h2>
                        <p className="text-sm text-gray-400">
                          Enter a code to retrieve files.
                        </p>
                      </div>
                      <div className="p-3 rounded-full bg-white/5">
                        <ArrowDown className="h-6 w-6 text-emerald-400" />
                      </div>
                    </div>

                    <button
                      onClick={handleReceiveMode}
                      className="w-full py-3.5 px-4 rounded-lg font-medium border transition-all border-white/20 hover:bg-white/5 text-white"
                    >
                      I have a code
                    </button>
                  </div>
                </div>
              </div>
            )}

            {mode === "send" && session && (
              <div className="animate-slide-up">
                <div className="flex items-center gap-4 mb-8">
                  <button
                    onClick={handleReset}
                    className="p-2 rounded-full border transition-colors border-white/10 hover:bg-white/10"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <h2 className="text-2xl font-bold">Your Secure Session</h2>
                </div>

                <div className="mb-6">
                  {connectionStatus !== "connected" &&
                    connectionStatus !== "transferring" && (
                      <>
                        <SessionCodeDisplay
                          code={session.code}
                          expiresAt={Date.now() + 10 * 60 * 1000} // 10 minutes
                        />

                        {session.status === "waiting" && (
                          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-amber-500">
                            <span className="relative flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                            </span>
                            Waiting for peer connection...
                          </div>
                        )}
                      </>
                    )}

                  {connectionStatus === "connected" &&
                    session.status === "waiting" && (
                      <div className="mt-8 text-center animate-pulse">
                        <p className="text-emerald-400 font-medium mb-2">
                          Peer Connected!
                        </p>
                        <p className="text-sm text-gray-400">
                          Starting transfer automatically...
                        </p>
                      </div>
                    )}
                </div>

                {(session.status === "transferring" ||
                  session.status === "completed") && (
                  <div className="">
                    <TransferProgress
                      transfers={session.files}
                      role="sender"
                      connectionStatus={connectionStatus}
                    />
                  </div>
                )}
              </div>
            )}

            {mode === "receive" && (
              <div className="animate-slide-up">
                <div className="flex items-center gap-4 mb-8">
                  <button
                    onClick={handleReset}
                    className="p-2 rounded-full border transition-colors border-white/10 hover:bg-white/10"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <h2 className="text-2xl font-bold">Receive Files</h2>
                </div>

                {!session && (
                  <div className="p-8 rounded-xl border bg-black border-white/10">
                    <CodeEntry
                      onCodeSubmit={handleCodeSubmit}
                      isConnecting={connectionStatus === "connecting"}
                      error={error}
                      initialCode={initialCode}
                    />
                  </div>
                )}

                {session && (
                  <div className="">
                    {session.files.length === 0 &&
                      connectionStatus === "connected" && (
                        <div className="text-center py-8">
                          <div className="inline-flex p-4 rounded-full bg-blue-500/10 mb-4">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-75 mx-1"></div>
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-150"></div>
                          </div>
                          <h3 className="text-lg font-medium mb-1">
                            Connected to Sender
                          </h3>
                          <p className="text-sm text-gray-400">
                            Waiting for them to start the transfer...
                          </p>
                        </div>
                      )}

                    {session.files.length > 0 && (
                      <TransferProgress
                        transfers={session.files}
                        role="receiver"
                        connectionStatus={connectionStatus}
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <footer className="mt-auto pt-12 text-center text-xs text-gray-600">
            <p className="flex items-center justify-center gap-2 mb-4">
              <Lock className="h-3 w-3" /> End-to-End Encrypted • Serverless P2P
              • Open Source
            </p>
            <div className="flex items-center justify-center gap-6 text-gray-500">
              <button
                onClick={() => setShowPrivacy(true)}
                className="hover:text-white transition-colors"
              >
                Privacy Policy
              </button>
              <button
                onClick={() => setShowTerms(true)}
                className="hover:text-white transition-colors"
              >
                Terms of Service
              </button>
            </div>
          </footer>
        </main>
      </div>

      <PrivacyPolicy
        isOpen={showPrivacy}
        onClose={() => setShowPrivacy(false)}
      />
      <TermsOfService isOpen={showTerms} onClose={() => setShowTerms(false)} />
    </div>
  );
}

export default App;
