export interface FileTransfer {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: "pending" | "transferring" | "completed" | "failed";
  speed?: number;
  remainingTime?: number;
}

export interface TransferSession {
  id: string;
  code: string;
  role: "sender" | "receiver";
  status: "waiting" | "connected" | "transferring" | "completed" | "failed";
  files: FileTransfer[];
}
