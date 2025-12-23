/**
 * Encryption utilities for secure peer-to-peer file transfer
 */

export class FileEncryption {
  private static readonly ALGORITHM = "AES-GCM";
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 12;

  /**
   * Generate a random encryption key
   */
  static async generateKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH,
      },
      true,
      ["encrypt", "decrypt"]
    );
  }

  /**
   * Encrypt file data
   */
  static async encryptFile(
    data: ArrayBuffer,
    key: CryptoKey
  ): Promise<{
    encryptedData: ArrayBuffer;
    iv: Uint8Array;
  }> {
    const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));

    const encryptedData = await crypto.subtle.encrypt(
      {
        name: this.ALGORITHM,
        iv: iv,
      },
      key,
      data
    );

    return { encryptedData, iv };
  }

  /**
   * Decrypt file data
   */
  static async decryptFile(
    encryptedData: ArrayBuffer,
    key: CryptoKey,
    iv: Uint8Array
  ): Promise<ArrayBuffer> {
    return await crypto.subtle.decrypt(
      {
        name: this.ALGORITHM,
        iv: iv as unknown as BufferSource,
      },
      key,
      encryptedData
    );
  }

  /**
   * Export key to transferable format
   */
  static async exportKey(key: CryptoKey): Promise<ArrayBuffer> {
    return await crypto.subtle.exportKey("raw", key);
  }

  /**
   * Import key from transferable format
   */
  static async importKey(keyData: ArrayBuffer): Promise<CryptoKey> {
    return await crypto.subtle.importKey(
      "raw",
      keyData,
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH,
      },
      true,
      ["encrypt", "decrypt"]
    );
  }
}

/**
 * Generate a secure random session code
 */
export function generateSessionCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";

  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}
