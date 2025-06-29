import { useState, useCallback, useRef } from "react";
import { FileTransferService } from "../services/FileTransferService";
import { downloadFile } from "../utils/fileUtils";
import type { FileTransfer, TransferSession } from "../types";

export const useFileTransfer = () => {
  const [session, setSession] = useState<TransferSession | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<string>("disconnected");
  const [error, setError] = useState<string>("");

  const fileTransferService = useRef<FileTransferService | null>(null);
  const selectedFilesRef = useRef<File[]>([]);
  const onTransferCompleteRef = useRef<(() => void) | null>(null);

  const initializeSession = useCallback(
    async (role: "sender" | "receiver", files?: File[]) => {
      try {
        fileTransferService.current = new FileTransferService();

        // Setup handlers
        fileTransferService.current.setConnectionStateHandler((state) => {
          console.log("Connection state:", state);
          setConnectionStatus(state);

          if (state === "failed") {
            setError("Connection failed. Please try again.");
          } else if (state === "connected") {
            setError("");
          }
        });

        fileTransferService.current.setProgressHandler((fileId, progress) => {
          setSession((prev) => {
            if (!prev) return prev;

            const updatedFiles = prev.files.map((file) =>
              file.id === fileId || file.name === fileId
                ? {
                    ...file,
                    progress,
                    status:
                      progress === 1
                        ? ("completed" as const)
                        : ("transferring" as const),
                  }
                : file
            );

            // Check if all files are completed for sender
            const allCompleted = updatedFiles.every(
              (file) => file.status === "completed"
            );
            if (
              allCompleted &&
              prev.role === "sender" &&
              onTransferCompleteRef.current
            ) {
              // Delay the redirect slightly to show completion state
              setTimeout(() => {
                onTransferCompleteRef.current?.();
              }, 2000);
            }

            return { ...prev, files: updatedFiles };
          });
        });

        fileTransferService.current.setFileReceivedHandler((file) => {
          console.log("File received:", file.name);

          // Auto-download received file
          downloadFile(file.data, file.name, file.type);

          setSession((prev) => {
            if (!prev) return prev;

            const fileTransfer: FileTransfer = {
              id: crypto.randomUUID(),
              name: file.name,
              size: file.data.byteLength,
              type: file.type,
              progress: 1,
              status: "completed",
            };

            return {
              ...prev,
              files: [...prev.files, fileTransfer],
              status: "completed",
            };
          });
        });

        let code: string;

        if (role === "sender") {
          code = await fileTransferService.current.createSession();
        } else {
          code = ""; // Will be set when joining
        }

        const newSession: TransferSession = {
          id: crypto.randomUUID(),
          code,
          role,
          status: "waiting",
          files:
            files?.map((file, index) => ({
              id: `${file.name}-${index}`,
              name: file.name,
              size: file.size,
              type: file.type,
              progress: 0,
              status: "pending",
            })) || [],
        };

        if (files) {
          selectedFilesRef.current = files;
        }

        setSession(newSession);
        setError("");

        return newSession;
      } catch (error) {
        console.error("Failed to initialize session:", error);
        setError("Failed to create session. Please try again.");
        throw error;
      }
    },
    []
  );

  const startTransfer = useCallback(
    async (files: File[]) => {
      if (!fileTransferService.current || !session) return;

      try {
        setSession((prev) =>
          prev ? { ...prev, status: "transferring" } : prev
        );
        setError("");

        for (let i = 0; i < files.length; i++) {
          const file = files[i];

          // Update file status to transferring
          setSession((prev) => {
            if (!prev) return prev;

            const updatedFiles = prev.files.map((f, index) =>
              index === i ? { ...f, status: "transferring" as const } : f
            );

            return { ...prev, files: updatedFiles };
          });

          await fileTransferService.current.sendFile(file, (progress) => {
            setSession((prev) => {
              if (!prev) return prev;

              const updatedFiles = prev.files.map((f, index) =>
                index === i
                  ? {
                      ...f,
                      progress,
                      status:
                        progress === 1
                          ? ("completed" as const)
                          : ("transferring" as const),
                    }
                  : f
              );

              return { ...prev, files: updatedFiles };
            });
          });
        }

        setSession((prev) => (prev ? { ...prev, status: "completed" } : prev));
      } catch (error) {
        console.error("Transfer failed:", error);
        setError("Transfer failed. Please try again.");
        setSession((prev) => (prev ? { ...prev, status: "failed" } : prev));
      }
    },
    [session]
  );

  const connectToSession = useCallback(async (code: string) => {
    setError("");
    setConnectionStatus("connecting");

    try {
      if (!fileTransferService.current) {
        fileTransferService.current = new FileTransferService();

        // Setup handlers
        fileTransferService.current.setConnectionStateHandler((state) => {
          setConnectionStatus(state);
          if (state === "failed") {
            setError("Connection failed. Please try again.");
          }
        });

        fileTransferService.current.setFileReceivedHandler((file) => {
          console.log("File received:", file.name);
          downloadFile(file.data, file.name, file.type);

          setSession((prev) => {
            if (!prev) return prev;

            const fileTransfer: FileTransfer = {
              id: crypto.randomUUID(),
              name: file.name,
              size: file.data.byteLength,
              type: file.type,
              progress: 1,
              status: "completed",
            };

            return {
              ...prev,
              files: [...prev.files, fileTransfer],
              status: "completed",
            };
          });
        });

        fileTransferService.current.setProgressHandler((fileId, progress) => {
          setSession((prev) => {
            if (!prev) return prev;

            const updatedFiles = prev.files.map((file) =>
              file.id === fileId
                ? {
                    ...file,
                    progress,
                    status:
                      progress === 1
                        ? ("completed" as const)
                        : ("transferring" as const),
                  }
                : file
            );

            return { ...prev, files: updatedFiles };
          });
        });
      }

      const success = await fileTransferService.current.joinSession(code);

      if (!success) {
        setError("Invalid or expired code. Please check and try again.");
        setConnectionStatus("disconnected");
        return;
      }

      const newSession: TransferSession = {
        id: crypto.randomUUID(),
        code,
        role: "receiver",
        status: "waiting",
        files: [],
      };

      setSession(newSession);
    } catch (error) {
      console.error("Connection failed:", error);
      setError("Failed to connect. Please check the code and try again.");
      setConnectionStatus("disconnected");
    }
  }, []);

  const resetSession = useCallback(async () => {
    if (fileTransferService.current) {
      await fileTransferService.current.close();
      fileTransferService.current = null;
    }
    selectedFilesRef.current = [];
    onTransferCompleteRef.current = null;
    setSession(null);
    setConnectionStatus("disconnected");
    setError("");
  }, []);

  const setOnTransferComplete = useCallback((callback: () => void) => {
    onTransferCompleteRef.current = callback;
  }, []);

  const dismissError = useCallback(() => {
    setError("");
  }, []);

  return {
    session,
    connectionStatus,
    error,
    initializeSession,
    startTransfer,
    connectToSession,
    resetSession,
    setOnTransferComplete,
    dismissError,
  };
};
