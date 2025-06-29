import { supabase } from "../lib/supabase";
import { FileEncryption, generateSessionCode } from "../utils/crypto";

export interface FileChunk {
  id: string;
  session_code: string;
  file_id: string;
  chunk_index: number;
  chunk_data: string; // base64 encoded
  iv: string; // base64 encoded
  total_chunks: number;
  created_at?: string;
}

export interface FileMetadata {
  id: string;
  session_code: string;
  file_name: string;
  file_size: number;
  file_type: string;
  encryption_key: string; // base64 encoded
  total_chunks: number;
  created_at?: string;
}

export class FileTransferService {
  private sessionCode: string = "";
  private onProgress?: (fileId: string, progress: number) => void;
  private onFileReceived?: (file: {
    name: string;
    data: ArrayBuffer;
    type: string;
  }) => void;
  private onConnectionStateChange?: (state: string) => void;
  private downloadedFiles: Set<string> = new Set(); // Track downloaded files
  private pollingInterval?: number;
  private isPolling: boolean = false;

  constructor() {}

  private async trackUserIP(): Promise<void> {
    if (!supabase) return;

    try {
      // Get user's IP address and user agent
      const userAgent = navigator.userAgent;

      // Call the IP tracking function
      const { error } = await supabase.rpc("track_user_ip", {
        p_ip_address: null, // Let the server determine the actual IP address
        p_user_agent: userAgent,
      });

      if (error) {
        console.warn("IP tracking failed:", error);
      } else {
        console.log("IP tracked successfully");
      }
    } catch (error) {
      console.warn("IP tracking error:", error);
    }
  }

  async createSession(): Promise<string> {
    const code = generateSessionCode();
    this.sessionCode = code;

    try {
      if (!supabase) {
        console.warn("Supabase not configured - running in demo mode");
        this.onConnectionStateChange?.("connected");
        return code;
      }

      console.log("Creating session with code:", code);

      // Track user IP
      await this.trackUserIP();

      // Create session in database
      const { data, error } = await supabase
        .from("transfer_sessions")
        .insert({
          code,
          creator_id: crypto.randomUUID(),
          status: "waiting",
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error("Failed to create session:", error);
        throw new Error(`Failed to create session: ${error.message}`);
      }

      console.log("Session created successfully:", data);
      this.onConnectionStateChange?.("connected");
      return code;
    } catch (error) {
      console.error("Session creation error:", error);
      this.onConnectionStateChange?.("failed");
      throw error;
    }
  }

  async joinSession(code: string): Promise<boolean> {
    this.sessionCode = code;
    this.downloadedFiles.clear(); // Reset downloaded files tracking

    try {
      if (!supabase) {
        console.warn("Supabase not configured - running in demo mode");
        this.onConnectionStateChange?.("connected");
        return true;
      }

      console.log("Joining session with code:", code);

      // Track user IP
      await this.trackUserIP();

      // Check if session exists
      const { data: session, error } = await supabase
        .from("transfer_sessions")
        .select("*")
        .eq("code", code)
        .eq("status", "waiting")
        .gt("expires_at", new Date().toISOString())
        .single();

      if (error || !session) {
        console.error("Session not found:", error);
        this.onConnectionStateChange?.("failed");
        return false;
      }

      console.log("Session found:", session);

      // Update session status
      const { error: updateError } = await supabase
        .from("transfer_sessions")
        .update({ status: "connected" })
        .eq("code", code);

      if (updateError) {
        console.error("Failed to update session status:", updateError);
        this.onConnectionStateChange?.("failed");
        return false;
      }

      this.onConnectionStateChange?.("connected");

      // Start polling for files
      this.startFilePolling();

      return true;
    } catch (error) {
      console.error("Failed to join session:", error);
      this.onConnectionStateChange?.("failed");
      return false;
    }
  }

  async sendFile(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    try {
      if (!supabase) {
        console.warn("Supabase not configured - simulating file transfer");
        this.simulateFileTransfer(file, onProgress);
        return;
      }

      console.log(
        "Starting file upload:",
        file.name,
        "Size:",
        file.size,
        "Type:",
        file.type
      );
      this.onConnectionStateChange?.("transferring");

      // Generate encryption key
      const encryptionKey = await FileEncryption.generateKey();
      const exportedKey = await FileEncryption.exportKey(encryptionKey);

      const fileId = crypto.randomUUID();
      const chunkSize = 64 * 1024; // 64KB chunks
      const totalChunks = Math.ceil(file.size / chunkSize);

      console.log(
        `File "${file.name}" (${file.type}) will be split into ${totalChunks} chunks`
      );

      // Store file metadata - ALWAYS store for ALL file types
      const metadata: Omit<FileMetadata, "created_at"> = {
        id: fileId,
        session_code: this.sessionCode,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type || "application/octet-stream", // Ensure file type is always set
        encryption_key: btoa(
          String.fromCharCode(...new Uint8Array(exportedKey))
        ),
        total_chunks: totalChunks,
      };

      console.log("Storing file metadata for ALL file types:", metadata);

      const { data: metadataResult, error: metadataError } = await supabase
        .from("file_metadata")
        .insert(metadata)
        .select()
        .single();

      if (metadataError) {
        console.error("Failed to store file metadata:", metadataError);
        throw new Error(
          `Failed to store file metadata: ${metadataError.message}`
        );
      }

      console.log("File metadata stored successfully:", metadataResult);

      // Upload file chunks - ALWAYS upload for ALL file types
      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);
        const chunkData = await chunk.arrayBuffer();

        console.log(
          `Processing chunk ${i + 1}/${totalChunks} for "${
            file.name
          }" (${start}-${end} bytes)`
        );

        // Encrypt chunk
        const { encryptedData, iv } = await FileEncryption.encryptFile(
          chunkData,
          encryptionKey
        );

        const chunkRecord: Omit<FileChunk, "created_at"> = {
          id: crypto.randomUUID(),
          session_code: this.sessionCode,
          file_id: fileId,
          chunk_index: i,
          chunk_data: btoa(
            String.fromCharCode(...new Uint8Array(encryptedData))
          ),
          iv: btoa(String.fromCharCode(...new Uint8Array(iv))),
          total_chunks: totalChunks,
        };

        const { data: chunkResult, error: chunkError } = await supabase
          .from("file_chunks")
          .insert(chunkRecord)
          .select()
          .single();

        if (chunkError) {
          console.error(
            `Failed to upload chunk ${i} for "${file.name}":`,
            chunkError
          );
          throw new Error(`Failed to upload chunk ${i}: ${chunkError.message}`);
        }

        console.log(
          `Chunk ${i + 1}/${totalChunks} uploaded successfully for "${
            file.name
          }":`,
          chunkResult
        );

        // Report progress
        const progress = (i + 1) / totalChunks;
        onProgress?.(progress);
        this.onProgress?.(fileId, progress);
      }

      this.onConnectionStateChange?.("completed");
      console.log("File upload completed successfully:", file.name);
    } catch (error) {
      console.error("File transfer failed:", error);
      this.onConnectionStateChange?.("failed");
      throw error;
    }
  }

  private async simulateFileTransfer(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    console.log("Simulating file transfer for:", file.name);
    // Simulate file transfer progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      const progress = i / 100;
      onProgress?.(progress);
      this.onProgress?.(file.name, progress);
    }

    this.onConnectionStateChange?.("completed");
    console.log("Demo file transfer completed:", file.name);
  }

  private async startFilePolling(): Promise<void> {
    if (!supabase || this.isPolling) return;

    this.isPolling = true;
    console.log("Starting file polling for session:", this.sessionCode);

    const pollForFiles = async () => {
      if (!supabase) {
        console.warn("Supabase not configured, stopping polling.");
        this.stopPolling();
        return;
      }
      try {
        // Get file metadata for this session that we haven't downloaded yet
        const { data: files, error } = await supabase
          .from("file_metadata")
          .select("*")
          .eq("session_code", this.sessionCode);

        if (error) {
          console.error("Error polling for files:", error);
          return;
        }

        if (!files || files.length === 0) {
          console.log("No files found for session:", this.sessionCode);
          return;
        }

        console.log(
          `Found ${files.length} files for session:`,
          this.sessionCode
        );

        // Process only new files that haven't been downloaded
        for (const fileMetadata of files) {
          if (!this.downloadedFiles.has(fileMetadata.id)) {
            console.log("Found new file to download:", fileMetadata.file_name);
            await this.downloadFile(fileMetadata);
          }
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    };

    // Initial poll
    await pollForFiles();

    // Poll every 2 seconds
    this.pollingInterval = window.setInterval(pollForFiles, 2000);

    // Stop polling after 10 minutes
    setTimeout(() => {
      this.stopPolling();
    }, 10 * 60 * 1000);
  }

  private stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = undefined;
    }
    this.isPolling = false;
    console.log("Stopped file polling");
  }

  private async downloadFile(metadata: FileMetadata): Promise<void> {
    if (!supabase) return;

    try {
      // Mark this file as being processed to prevent duplicate downloads
      if (this.downloadedFiles.has(metadata.id)) {
        console.log("File already downloaded:", metadata.file_name);
        return;
      }

      console.log("Starting download for file:", metadata.file_name);
      this.downloadedFiles.add(metadata.id);

      // Get all chunks for this file
      const { data: chunks, error } = await supabase
        .from("file_chunks")
        .select("*")
        .eq("file_id", metadata.id)
        .order("chunk_index");

      if (error) {
        console.error("Error fetching chunks:", error);
        this.downloadedFiles.delete(metadata.id); // Remove from downloaded set on error
        return;
      }

      if (!chunks || chunks.length !== metadata.total_chunks) {
        console.log(
          `File not fully uploaded yet: ${metadata.file_name} (${
            chunks?.length || 0
          }/${metadata.total_chunks} chunks)`
        );
        this.downloadedFiles.delete(metadata.id); // Remove from downloaded set to retry later
        return;
      }

      console.log(
        `All ${chunks.length} chunks found for file:`,
        metadata.file_name
      );
      this.onConnectionStateChange?.("transferring");

      // Import encryption key
      const keyData = Uint8Array.from(atob(metadata.encryption_key), (c) =>
        c.charCodeAt(0)
      );
      const encryptionKey = await FileEncryption.importKey(keyData.buffer);

      // Decrypt and combine chunks
      const decryptedChunks: ArrayBuffer[] = [];

      for (const chunk of chunks) {
        console.log(
          `Decrypting chunk ${chunk.chunk_index + 1}/${chunks.length}`
        );

        const encryptedData = Uint8Array.from(atob(chunk.chunk_data), (c) =>
          c.charCodeAt(0)
        );
        const iv = Uint8Array.from(atob(chunk.iv), (c) => c.charCodeAt(0));

        const decryptedChunk = await FileEncryption.decryptFile(
          encryptedData.buffer,
          encryptionKey,
          iv
        );

        decryptedChunks.push(decryptedChunk);

        // Report progress
        const progress = (chunk.chunk_index + 1) / metadata.total_chunks;
        this.onProgress?.(metadata.id, progress);
      }

      // Combine all chunks
      const totalSize = decryptedChunks.reduce(
        (sum, chunk) => sum + chunk.byteLength,
        0
      );
      const combinedData = new ArrayBuffer(totalSize);
      const view = new Uint8Array(combinedData);

      let offset = 0;
      for (const chunk of decryptedChunks) {
        view.set(new Uint8Array(chunk), offset);
        offset += chunk.byteLength;
      }

      console.log(
        "File reconstruction completed:",
        metadata.file_name,
        "Final size:",
        totalSize
      );

      // Trigger file received callback
      this.onFileReceived?.({
        name: metadata.file_name,
        data: combinedData,
        type: metadata.file_type,
      });

      // Clean up - delete chunks and metadata
      await this.cleanupFile(metadata.id);

      this.onConnectionStateChange?.("completed");
      console.log("File download completed:", metadata.file_name);
    } catch (error) {
      console.error("File download failed:", error);
      this.downloadedFiles.delete(metadata.id); // Remove from downloaded set on error
      this.onConnectionStateChange?.("failed");
    }
  }

  private async cleanupFile(fileId: string): Promise<void> {
    if (!supabase) return;

    try {
      console.log("Cleaning up file data for:", fileId);

      // Delete chunks
      const { error: chunksError } = await supabase
        .from("file_chunks")
        .delete()
        .eq("file_id", fileId);

      if (chunksError) {
        console.error("Failed to delete chunks:", chunksError);
      }

      // Delete metadata
      const { error: metadataError } = await supabase
        .from("file_metadata")
        .delete()
        .eq("id", fileId);

      if (metadataError) {
        console.error("Failed to delete metadata:", metadataError);
      }

      console.log("Cleaned up file data for:", fileId);
    } catch (error) {
      console.error("Cleanup failed:", error);
    }
  }

  setProgressHandler(
    handler: (fileId: string, progress: number) => void
  ): void {
    this.onProgress = handler;
  }

  setFileReceivedHandler(
    handler: (file: { name: string; data: ArrayBuffer; type: string }) => void
  ): void {
    this.onFileReceived = handler;
  }

  setConnectionStateHandler(handler: (state: string) => void): void {
    this.onConnectionStateChange = handler;
  }

  async close(): Promise<void> {
    // Stop polling
    this.stopPolling();

    // Clear downloaded files tracking
    this.downloadedFiles.clear();

    // Clean up session if needed
    if (supabase && this.sessionCode) {
      try {
        await supabase
          .from("transfer_sessions")
          .update({ status: "closed" })
          .eq("code", this.sessionCode);
      } catch (error) {
        console.error("Failed to close session:", error);
      }
    }
  }
}
