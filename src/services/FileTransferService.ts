import { generateSessionCode } from "../utils/code";
import Peer, { DataConnection } from "peerjs";

// Type definitions for internal structures
interface ReassemblyContext {
  total: number;
  received: number;
  chunks: Map<number, Uint8Array>;
  metadata: { name: string; type: string };
}

interface TransferHeader {
  type: "header";
  fileId: string;
  name: string;
  fileType: string;
  size: number;
  totalChunks: number;
}

interface TransferChunk {
  type: "chunk";
  fileId: string;
  index: number;
}

interface TransferEOF {
  type: "eof";
  fileId: string;
}

type TransferMessage = TransferHeader | TransferChunk | TransferEOF;

export class FileTransferService {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;

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
  private onConnectionStateChange?: (state: string) => void;

  // Track received chunks for reassembly
  private receivedChunks: Map<string, ReassemblyContext> = new Map();

  constructor() {}

  // --- Session Management ---

  async createSession(): Promise<string> {
    const code = generateSessionCode();

    // Prefix to avoid collisions on public PeerJS server
    const peerId = `LND-${code}`;

    return new Promise((resolve, reject) => {
      try {
        this.peer = new Peer(peerId, {
          debug: 1,
        });

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
          // If ID is taken (rare with random 6 chars but possible), we might need to retry?
          // For now, simple error.
          this.onConnectionStateChange?.("failed");
          reject(err);
        });

        this.peer.on("disconnected", () => {
          console.log("Peer disconnected from server");
          // Retry?
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async joinSession(code: string): Promise<boolean> {
    const targetPeerId = `LND-${code}`;

    return new Promise((resolve) => {
      try {
        // Receiver gets a random ID
        this.peer = new Peer();

        this.peer.on("open", () => {
          this.onConnectionStateChange?.("connecting");

          if (!this.peer) return;

          const connection = this.peer.connect(targetPeerId, {
            reliable: true,
          });

          this.handleConnection(connection);
          resolve(true);
        });

        this.peer.on("error", (err) => {
          console.error("Join Peer error:", err);
          this.onConnectionStateChange?.("failed");
          resolve(false);
        });
      } catch (error) {
        console.error("Join session failed:", error);
        this.onConnectionStateChange?.("failed");
        resolve(false);
      }
    });
  }

  // --- Connection Handling ---

  private handleConnection(connection: DataConnection) {
    this.conn = connection;

    this.conn.on("open", () => {
      console.log("DataConnection Open!");
      this.onConnectionStateChange?.("connected");
    });

    this.conn.on("data", (data) => {
      // PeerJS determines type automatically. We send JSON strings usually.
      // But if we sent binary, it would receive ArrayBuffer.
      // Our previous logic used JSON strings for everything including base64 chunks.
      // Let's stick to that for compatibility with existing logic structure.
      this.handleIncomingData(data as string);
    });

    this.conn.on("close", () => {
      console.log("Connection closed");
      this.onConnectionStateChange?.("disconnected");
      this.conn = null;
    });

    this.conn.on("error", (err) => {
      console.error("Connection error:", err);
      this.onConnectionStateChange?.("failed");
    });
  }

  // --- Data Transfer ---

  async sendFile(
    file: File,
    onProgress?: (progress: number) => void,
  ): Promise<void> {
    if (!this.conn || !this.conn.open) {
      throw new Error("Connection not open");
    }

    this.onConnectionStateChange?.("transferring");

    const fileId = crypto.randomUUID();

    // 1. Send Start Header
    const header: TransferHeader = {
      type: "header",
      fileId,
      name: file.name,
      fileType: file.type,
      size: file.size,
      totalChunks: Math.ceil(file.size / (128 * 1024)), // 128KB chunks
    };
    this.conn.send(JSON.stringify(header));

    // 2. Chunk & Send - "The Firehose" Strategy
    const chunkSize = 128 * 1024; // 128KB Chunks
    const totalChunks = Math.ceil(file.size / chunkSize);

    // High Water Mark: 1MB
    const HIGH_WATER_MARK = 1024 * 1024;
    let lastProgressUpdate = 0;

    for (let i = 0; i < totalChunks; i++) {
      // Stop if connection dies
      if (!this.conn.open) break;

      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);

      // Read file chunk
      const chunkBuffer = await file.slice(start, end).arrayBuffer();

      // Create Custom Binary Packet
      // Structure: [Header Length (4 bytes UI32)] [JSON Header Bytes] [Raw Chunk Bytes]
      const chunkMetadata = JSON.stringify({
        type: "chunk",
        fileId,
        index: i,
      });

      const metadataBuffer = new TextEncoder().encode(chunkMetadata);
      const metadataLength = metadataBuffer.byteLength;

      // Alloc packet: 4 bytes len + metadata + chunk
      const packet = new Uint8Array(
        4 + metadataLength + chunkBuffer.byteLength,
      );
      const view = new DataView(packet.buffer);

      // Write Header Length (Little Endian)
      view.setUint32(0, metadataLength, true);

      // Write Metadata
      packet.set(metadataBuffer, 4);

      // Write Chunk Data
      packet.set(new Uint8Array(chunkBuffer), 4 + metadataLength);

      try {
        this.conn.send(packet);
      } catch (e) {
        console.error("Send failed at chunk", i, e);
        throw e;
      }

      // Progress Throttling (Max 20fps = every 50ms)
      const now = Date.now();
      if (now - lastProgressUpdate > 50 || i === totalChunks - 1) {
        const progress = (i + 1) / totalChunks;
        onProgress?.(progress);
        this.onProgress?.(fileId, progress);
        lastProgressUpdate = now;
      }

      // Backpressure - "The Firehose"
      const bufferedAmount = this.conn.dataChannel?.bufferedAmount || 0;

      if (bufferedAmount > HIGH_WATER_MARK) {
        while ((this.conn.dataChannel?.bufferedAmount || 0) > 0) {
          await new Promise((r) => setTimeout(r, 10));
        }
      }
      if (i % 50 === 0) await new Promise((r) => setTimeout(r, 0));
    }

    // 3. Send End
    if (this.conn.open) {
      const eof: TransferEOF = { type: "eof", fileId };
      this.conn.send(JSON.stringify(eof));
      this.onConnectionStateChange?.("completed");
    }
  }

  private async handleIncomingData(data: unknown) {
    try {
      // 0. Convert to ArrayBuffer if necessary
      let buffer: ArrayBuffer | null = null;

      if (data instanceof ArrayBuffer) {
        buffer = data;
      } else if (data instanceof Uint8Array) {
        buffer = data.buffer as ArrayBuffer;
      } else if (data instanceof Blob) {
        buffer = (await data.arrayBuffer()) as ArrayBuffer;
      }

      // 1. Handle Binary Chunk (ArrayBuffer)
      if (buffer) {
        const view = new DataView(buffer);

        // Read Metadata Length
        const metadataLength = view.getUint32(0, true);

        // Decode Metadata
        const metadataBytes = new Uint8Array(buffer, 4, metadataLength);
        const metadataString = new TextDecoder().decode(metadataBytes);
        const msg = JSON.parse(metadataString);

        if (msg.type === "chunk") {
          const fileContext = this.receivedChunks.get(msg.fileId);
          if (!fileContext) return;

          // Extract Raw Chunk
          const chunkData = new Uint8Array(buffer, 4 + metadataLength);

          // Store the slice
          fileContext.chunks.set(msg.index, chunkData);
          fileContext.received++;

          const progress = fileContext.received / fileContext.total;
          this.onProgress?.(msg.fileId, progress);
        }
        return;
      }

      // 2. Handle Text Control Messages (Header/EOF)
      if (typeof data === "string") {
        const msg = JSON.parse(data) as TransferMessage;

        if (msg.type === "header") {
          // Start new file reception
          this.receivedChunks.set(msg.fileId, {
            total: msg.totalChunks,
            received: 0,
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

          this.onConnectionStateChange?.("transferring");
        } else if (msg.type === "eof") {
          const fileContext = this.receivedChunks.get(msg.fileId);
          if (!fileContext) return;

          // Reassemble
          this.reassembleFile(msg.fileId, fileContext);
        }
      }
    } catch (e) {
      console.error("Error handling data", e);
    }
  }

  private async reassembleFile(fileId: string, context: ReassemblyContext) {
    const chunks: BlobPart[] = [];

    for (let i = 0; i < context.total; i++) {
      const chunk = context.chunks.get(i);
      if (chunk) {
        // Pushing the Uint8Array view directly ensures we only use the data part,
        // ignoring the packet header bytes in the underlying buffer.
        chunks.push(chunk as unknown as BlobPart);
      }
    }

    const blob = new Blob(chunks, { type: context.metadata.type });

    // Trigger download
    this.onFileReceived?.({
      name: context.metadata.name,
      data: (await blob.arrayBuffer()) as ArrayBuffer,
      type: context.metadata.type,
    });

    this.receivedChunks.delete(fileId);
    this.onConnectionStateChange?.("completed");
  }

  // --- Handlers ---

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

  // Stub methods to satisfy calls from hooks (if any, pending hooks update)
  listenForSessionCompletion() {}
  setSessionCompletionHandler() {}

  async close() {
    if (this.conn) {
      this.conn.close();
      this.conn = null;
    }
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.receivedChunks.clear();
  }
}
