export interface FileTransfer {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: 'pending' | 'transferring' | 'completed' | 'failed';
  speed?: number;
  remainingTime?: number;
}

export interface PeerConnection {
  id: string;
  status: 'disconnected' | 'connecting' | 'connected' | 'failed';
  dataChannel?: RTCDataChannel;
  connection?: RTCPeerConnection;
}

export interface SessionCode {
  code: string;
  expires: number;
  isActive: boolean;
}

export interface TransferSession {
  id: string;
  code: string;
  role: 'sender' | 'receiver';
  status: 'waiting' | 'connected' | 'transferring' | 'completed' | 'failed';
  files: FileTransfer[];
  peer?: PeerConnection;
}

export interface EncryptionKeys {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}