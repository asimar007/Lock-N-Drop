import Peer, { DataConnection } from "peerjs";
import { generateSessionCode } from "../utils/code";

interface ReassemblyContext {
  total: number;
  received: number;
  nextExpected: number;
  chunks: Map<number, Uint8Array>;
  metadata: { name: string; type: string };
}

interface OutgoingTransferContext {
  file: File;
  fileId: string;
  totalChunks: number;
  chunkSize: number;
  nextChunkIndex: number;
  acknowledgedChunks: number;
  inflight: Set<number>;
  eofSent: boolean;
  resolve: () => void;
  reject: (error: Error) => void;
  onProgress?: (progress: number) => void;
}

interface TransferHeader {
  type: "header";
  fileId: string;
  name: string;
  fileType: string;
  size: number;
  totalChunks: number;
  chunkSize: number;
}

interface TransferChunk {
  type: "chunk";
  fileId: string;
  index: number;
}

interface TransferChunkAck {
  type: "chunk-ack";
  fileId: string;
  nextChunkIndex: number;
}

interface TransferReady {
  type: "ready";
}

interface TransferResumeRequest {
  type: "resume-request";
  fileId: string;
  nextChunkIndex: number;
}

interface TransferEOF {
  type: "eof";
  fileId: string;
}

interface TransferSessionComplete {
  type: "session-complete";
}

interface TransferSessionCancelled {
  type: "session-cancelled";
}

type TransferMessage =
  | TransferHeader
  | TransferChunkAck
  | TransferReady
  | TransferResumeRequest
  | TransferEOF
  | TransferSessionComplete
  | TransferSessionCancelled;

const CHUNK_SIZE = 64 * 1024;
const MAX_INFLIGHT_CHUNKS = 8;
const MAX_RECONNECT_ATTEMPTS = 8;
const RECONNECT_DELAY_MS = 1500;

export class FileTransferService {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private role: "sender" | "receiver" | null = null;
  private targetPeerId: string | null = null;
  private explicitClose = false;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isPumpingTransfer = false;
  private activeTransfer: OutgoingTransferContext | null = null;

  private onProgress?: (fileId: string, progress: number) => void;
  private onFileReceived?: (file: {
    name: string;
    data: ArrayBuffer;
    type: string;
  }) => void;
  private onFileStarted?: (file: {
    fileId: string;
    name: string;
    size: number;
    type: string;
  }) => void;
  private onSessionComplete?: () => void;
  private onSessionCancelled?: () => void;
  private onConnectionStateChange?: (state: string) => void;

  private receivedChunks: Map<string, ReassemblyContext> = new Map();

  async createSession(): Promise<string> {
    const code = generateSessionCode();
    const peerId = `LND-${code}`;

    this.role = "sender";
    this.explicitClose = false;

    return new Promise((resolve, reject) => {
      try {
        this.peer = new Peer(peerId, {
          debug: 1,
        });

        this.attachPeerHandlers(resolve, reject, code);
      } catch (error) {
        reject(error);
      }
    });
  }

  async joinSession(code: string): Promise<boolean> {
    this.role = "receiver";
    this.targetPeerId = `LND-${code}`;
    this.explicitClose = false;

    return new Promise((resolve) => {
      try {
        this.peer = new Peer();

        this.peer.on("open", () => {
          this.onConnectionStateChange?.("connecting");
          this.openReceiverConnection();
          resolve(true);
        });

        this.peer.on("error", (err) => {
          console.error("Join Peer error:", err);
          this.onConnectionStateChange?.("failed");
          resolve(false);
        });

        this.peer.on("disconnected", () => {
          console.log("Peer disconnected from signaling server");
          if (!this.explicitClose) {
            this.onConnectionStateChange?.("reconnecting");
            this.peer?.reconnect();
          }
        });
      } catch (error) {
        console.error("Join session failed:", error);
        this.onConnectionStateChange?.("failed");
        resolve(false);
      }
    });
  }

  private attachPeerHandlers(
    resolve: (code: string) => void,
    reject: (error: unknown) => void,
    code: string,
  ) {
    if (!this.peer) return;

    this.peer.on("open", (id) => {
      console.log("My Peer ID is:", id);
      this.onConnectionStateChange?.("waiting");
      resolve(code);
    });

    this.peer.on("connection", (connection) => {
      console.log("Incoming connection...");
      this.handleConnection(connection);
    });

    this.peer.on("error", (err) => {
      console.error("Peer error:", err);
      this.onConnectionStateChange?.("failed");
      reject(err);
    });

    this.peer.on("disconnected", () => {
      console.log("Peer disconnected from signaling server");
      if (!this.explicitClose) {
        this.onConnectionStateChange?.("reconnecting");
        this.peer?.reconnect();
      }
    });
  }

  private openReceiverConnection() {
    if (!this.peer || !this.targetPeerId) return;

    const connection = this.peer.connect(this.targetPeerId, {
      reliable: true,
    });

    this.handleConnection(connection);
  }

  private handleConnection(connection: DataConnection) {
    if (this.conn && this.conn !== connection) {
      this.conn.close();
    }

    this.conn = connection;

    connection.on("open", () => {
      console.log("DataConnection open");
      if (this.conn !== connection) return;

      this.reconnectAttempts = 0;
      this.clearReconnectTimer();
      this.onConnectionStateChange?.(
        this.activeTransfer ? "reconnecting" : "connected",
      );

      if (this.role === "receiver") {
        this.sendResumeOrReady();
      }
    });

    connection.on("data", (data) => {
      this.handleIncomingData(data).catch((error) => {
        console.error("Error handling data", error);
      });
    });

    connection.on("close", () => {
      console.log("Connection closed");
      if (this.conn !== connection) return;

      this.conn = null;
      this.handleConnectionLoss();
    });

    connection.on("error", (err) => {
      console.error("Connection error:", err);
      if (!this.explicitClose && this.conn === connection) {
        this.onConnectionStateChange?.("reconnecting");
      }
    });
  }

  async sendFile(
    file: File,
    onProgress?: (progress: number) => void,
  ): Promise<void> {
    if (this.role !== "sender") {
      throw new Error("Only the sender can send files");
    }

    const fileId = crypto.randomUUID();
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    return new Promise((resolve, reject) => {
      this.activeTransfer = {
        file,
        fileId,
        totalChunks,
        chunkSize: CHUNK_SIZE,
        nextChunkIndex: 0,
        acknowledgedChunks: 0,
        inflight: new Set(),
        eofSent: false,
        resolve,
        reject,
        onProgress,
      };

      this.onConnectionStateChange?.("transferring");
      this.pumpTransfer().catch((error) => {
        this.failActiveTransfer(error);
      });
    });
  }

  async sendSessionComplete() {
    if (this.conn?.open) {
      const msg: TransferSessionComplete = { type: "session-complete" };
      this.conn.send(JSON.stringify(msg));
    }
  }

  async cancelSession() {
    if (this.conn?.open) {
      const msg: TransferSessionCancelled = { type: "session-cancelled" };
      this.conn.send(JSON.stringify(msg));
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
    await this.close();
  }

  private async pumpTransfer() {
    if (this.isPumpingTransfer || !this.activeTransfer) return;

    this.isPumpingTransfer = true;

    try {
      while (this.activeTransfer && this.conn?.open) {
        const transfer = this.activeTransfer;

        if (transfer.nextChunkIndex === transfer.acknowledgedChunks) {
          this.sendHeader(transfer);
        }

        while (
          this.conn?.open &&
          transfer.inflight.size < MAX_INFLIGHT_CHUNKS &&
          transfer.nextChunkIndex < transfer.totalChunks
        ) {
          const index = transfer.nextChunkIndex;
          const chunkBuffer = await this.readChunk(transfer.file, index);
          this.sendChunkPacket(transfer.fileId, index, chunkBuffer);
          transfer.inflight.add(index);
          transfer.nextChunkIndex += 1;
        }

        if (
          transfer.nextChunkIndex >= transfer.totalChunks &&
          transfer.inflight.size === 0 &&
          !transfer.eofSent
        ) {
          const eof: TransferEOF = { type: "eof", fileId: transfer.fileId };
          this.conn.send(JSON.stringify(eof));
          transfer.eofSent = true;
          this.onProgress?.(transfer.fileId, 1);
          transfer.onProgress?.(1);
          this.onConnectionStateChange?.("completed");
          transfer.resolve();
          this.activeTransfer = null;
          break;
        }

        break;
      }
    } finally {
      this.isPumpingTransfer = false;
    }
  }

  private sendHeader(transfer: OutgoingTransferContext) {
    if (!this.conn?.open) return;

    const header: TransferHeader = {
      type: "header",
      fileId: transfer.fileId,
      name: transfer.file.name,
      fileType: transfer.file.type,
      size: transfer.file.size,
      totalChunks: transfer.totalChunks,
      chunkSize: transfer.chunkSize,
    };

    this.conn.send(JSON.stringify(header));
  }

  private async readChunk(file: File, index: number) {
    const start = index * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    return file.slice(start, end).arrayBuffer();
  }

  private sendChunkPacket(
    fileId: string,
    index: number,
    chunkBuffer: ArrayBuffer,
  ) {
    if (!this.conn?.open) return;

    const chunkMetadata: TransferChunk = {
      type: "chunk",
      fileId,
      index,
    };

    const metadataBuffer = new TextEncoder().encode(
      JSON.stringify(chunkMetadata),
    );
    const packet = new Uint8Array(4 + metadataBuffer.byteLength + chunkBuffer.byteLength);
    const view = new DataView(packet.buffer);

    view.setUint32(0, metadataBuffer.byteLength, true);
    packet.set(metadataBuffer, 4);
    packet.set(new Uint8Array(chunkBuffer), 4 + metadataBuffer.byteLength);

    this.conn.send(packet);
  }

  private async handleIncomingData(data: unknown) {
    let buffer: ArrayBuffer | null = null;

    if (data instanceof ArrayBuffer) {
      buffer = data;
    } else if (data instanceof Uint8Array) {
      buffer = data.slice().buffer;
    } else if (data instanceof Blob) {
      buffer = await data.arrayBuffer();
    }

    if (buffer) {
      this.handleBinaryChunk(buffer);
      return;
    }

    if (typeof data === "string") {
      const msg = JSON.parse(data) as TransferMessage;
      this.handleControlMessage(msg);
    }
  }

  private handleBinaryChunk(buffer: ArrayBuffer) {
    const view = new DataView(buffer);
    const metadataLength = view.getUint32(0, true);
    const metadataBytes = new Uint8Array(buffer, 4, metadataLength);
    const metadataString = new TextDecoder().decode(metadataBytes);
    const msg = JSON.parse(metadataString) as TransferChunk;

    if (msg.type !== "chunk") return;

    const fileContext = this.receivedChunks.get(msg.fileId);
    if (!fileContext) return;

    if (!fileContext.chunks.has(msg.index)) {
      const chunkData = new Uint8Array(buffer, 4 + metadataLength);
      fileContext.chunks.set(msg.index, chunkData);
      fileContext.received += 1;
    }

    while (fileContext.chunks.has(fileContext.nextExpected)) {
      fileContext.nextExpected += 1;
    }

    const progress = fileContext.nextExpected / fileContext.total;
    this.onProgress?.(msg.fileId, progress);
    this.sendChunkAck(msg.fileId, fileContext.nextExpected);
  }

  private handleControlMessage(msg: TransferMessage) {
    switch (msg.type) {
      case "header": {
        const existing = this.receivedChunks.get(msg.fileId);

        if (!existing) {
          this.receivedChunks.set(msg.fileId, {
            total: msg.totalChunks,
            received: 0,
            nextExpected: 0,
            chunks: new Map(),
            metadata: {
              name: msg.name,
              type: msg.fileType,
            },
          });

          this.onFileStarted?.({
            fileId: msg.fileId,
            name: msg.name,
            size: msg.size,
            type: msg.fileType,
          });
        }

        this.onConnectionStateChange?.("transferring");

        const context = this.receivedChunks.get(msg.fileId);
        if (context) {
          this.sendChunkAck(msg.fileId, context.nextExpected);
        }
        break;
      }
      case "chunk-ack":
        this.handleChunkAck(msg);
        break;
      case "ready":
        this.handleReady();
        break;
      case "resume-request":
        this.handleResumeRequest(msg);
        break;
      case "eof": {
        const fileContext = this.receivedChunks.get(msg.fileId);
        if (!fileContext) return;

        if (fileContext.nextExpected < fileContext.total) {
          this.sendChunkAck(msg.fileId, fileContext.nextExpected);
          return;
        }

        this.reassembleFile(msg.fileId, fileContext).catch((error) => {
          console.error("Failed to reassemble file", error);
        });
        break;
      }
      case "session-complete":
        this.onSessionComplete?.();
        break;
      case "session-cancelled":
        this.onSessionCancelled?.();
        break;
    }
  }

  private handleChunkAck(msg: TransferChunkAck) {
    const transfer = this.activeTransfer;
    if (!transfer || transfer.fileId !== msg.fileId) return;

    const acknowledged = Math.max(
      0,
      Math.min(msg.nextChunkIndex, transfer.totalChunks),
    );

    if (acknowledged < transfer.acknowledgedChunks) return;

    transfer.acknowledgedChunks = acknowledged;

    for (const index of Array.from(transfer.inflight)) {
      if (index < acknowledged) {
        transfer.inflight.delete(index);
      }
    }

    const progress = acknowledged / transfer.totalChunks;
    this.onProgress?.(transfer.fileId, progress);
    transfer.onProgress?.(progress);

    this.pumpTransfer().catch((error) => {
      this.failActiveTransfer(error);
    });
  }

  private handleReady() {
    if (!this.activeTransfer) return;

    this.activeTransfer.nextChunkIndex = this.activeTransfer.acknowledgedChunks;
    this.activeTransfer.inflight.clear();

    this.pumpTransfer().catch((error) => {
      this.failActiveTransfer(error);
    });
  }

  private handleResumeRequest(msg: TransferResumeRequest) {
    const transfer = this.activeTransfer;
    if (!transfer || transfer.fileId !== msg.fileId) return;

    transfer.acknowledgedChunks = Math.min(
      transfer.acknowledgedChunks,
      msg.nextChunkIndex,
    );
    transfer.nextChunkIndex = msg.nextChunkIndex;
    transfer.inflight.clear();
    transfer.eofSent = false;

    const progress = transfer.acknowledgedChunks / transfer.totalChunks;
    this.onProgress?.(transfer.fileId, progress);
    transfer.onProgress?.(progress);

    this.pumpTransfer().catch((error) => {
      this.failActiveTransfer(error);
    });
  }

  private sendChunkAck(fileId: string, nextChunkIndex: number) {
    if (!this.conn?.open) return;

    const msg: TransferChunkAck = {
      type: "chunk-ack",
      fileId,
      nextChunkIndex,
    };

    this.conn.send(JSON.stringify(msg));
  }

  private sendResumeOrReady() {
    if (!this.conn?.open) return;

    const incompleteTransfer = Array.from(this.receivedChunks.entries()).find(
      ([, context]) => context.nextExpected < context.total,
    );

    if (incompleteTransfer) {
      const [fileId, context] = incompleteTransfer;
      const msg: TransferResumeRequest = {
        type: "resume-request",
        fileId,
        nextChunkIndex: context.nextExpected,
      };
      this.conn.send(JSON.stringify(msg));
      return;
    }

    const ready: TransferReady = { type: "ready" };
    this.conn.send(JSON.stringify(ready));
  }

  private handleConnectionLoss() {
    if (this.explicitClose) {
      this.onConnectionStateChange?.("disconnected");
      return;
    }

    if (this.activeTransfer) {
      this.activeTransfer.nextChunkIndex = this.activeTransfer.acknowledgedChunks;
      this.activeTransfer.inflight.clear();
      this.activeTransfer.eofSent = false;
      this.onConnectionStateChange?.("reconnecting");
    } else {
      this.onConnectionStateChange?.("disconnected");
    }

    if (this.role === "receiver") {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (
      this.explicitClose ||
      this.reconnectTimer ||
      !this.peer ||
      !this.targetPeerId ||
      this.conn
    ) {
      return;
    }

    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this.onConnectionStateChange?.("failed");
      return;
    }

    this.reconnectAttempts += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;

      if (this.peer?.disconnected) {
        this.peer.reconnect();
      }

      this.openReceiverConnection();
    }, RECONNECT_DELAY_MS);
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private failActiveTransfer(error: unknown) {
    const transfer = this.activeTransfer;
    this.activeTransfer = null;

    if (transfer) {
      transfer.reject(
        error instanceof Error ? error : new Error("Transfer failed"),
      );
    }

    this.onConnectionStateChange?.("failed");
  }

  private async reassembleFile(fileId: string, context: ReassemblyContext) {
    const chunks: BlobPart[] = [];

    for (let i = 0; i < context.total; i += 1) {
      const chunk = context.chunks.get(i);
      if (!chunk) {
        this.sendChunkAck(fileId, context.nextExpected);
        return;
      }
      chunks.push(chunk as unknown as BlobPart);
    }

    const blob = new Blob(chunks, { type: context.metadata.type });

    this.onFileReceived?.({
      name: context.metadata.name,
      data: await blob.arrayBuffer(),
      type: context.metadata.type,
    });

    this.receivedChunks.delete(fileId);
    this.onConnectionStateChange?.("completed");
    this.sendResumeOrReady();
  }

  setProgressHandler(handler: (fileId: string, progress: number) => void) {
    this.onProgress = handler;
  }

  setFileReceivedHandler(
    handler: (file: { name: string; data: ArrayBuffer; type: string }) => void,
  ) {
    this.onFileReceived = handler;
  }

  setConnectionStateHandler(handler: (state: string) => void) {
    this.onConnectionStateChange = handler;
  }

  setFileStartedHandler(
    handler: (file: {
      fileId: string;
      name: string;
      size: number;
      type: string;
    }) => void,
  ) {
    this.onFileStarted = handler;
  }

  setSessionCompleteHandler(handler: () => void) {
    this.onSessionComplete = handler;
  }

  setSessionCancelledHandler(handler: () => void) {
    this.onSessionCancelled = handler;
  }

  listenForSessionCompletion() {}
  setSessionCompletionHandler() {}

  async close() {
    this.explicitClose = true;
    this.clearReconnectTimer();

    if (this.conn) {
      this.conn.close();
      this.conn = null;
    }

    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }

    this.activeTransfer = null;
    this.receivedChunks.clear();
    this.reconnectAttempts = 0;
  }
}
