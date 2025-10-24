// src/services/awsApi.ts
import { toast } from "sonner";

// Types for your data
export interface GroupData {
  [custId: string]: {
    [date: string]: [string, number][];
  };
}

export interface NursesData {
  [custId: string]: string[] | string;
  status?: string;
  group?: string;
}

export interface RoomsData {
  [custId: string]: string[] | string;
  status?: string;
  group?: string;
}

export class AwsApiService {
  private baseUrl = "https://ajtwnkl2yb.execute-api.us-east-2.amazonaws.com/test/sponge";
  private userId: string | null = null;
  private aesKeyB64: string;

  constructor(userId: string | null = null) {
    this.userId = userId;
    // Cloudflare Pages secret
    this.aesKeyB64 = process.env.encryption_key; // Ensure this is set in Pages environment
  }

  setUserId(userId: string | null) {
    this.userId = userId;
  }

  // Base64 decoder for custom format
  private customBase64Decode(data: string): Uint8Array {
    const normalized = data.replace(/-/g, "+").replace(/_/g, "/").replace(/\$/g, "=").replace(/~/g, "&");
    const binary = atob(normalized);
    return Uint8Array.from(binary, c => c.charCodeAt(0));
  }

  // AES-GCM decryption
  public async decryptValue(encrypted: string): Promise<string> {
    if (!encrypted || !encrypted.includes("^")) return encrypted;

    try {
      const [nonceB64, ciphertextB64, tagB64] = encrypted.split("^");
      if (!nonceB64 || !ciphertextB64 || !tagB64) return encrypted;

      const nonce = this.customBase64Decode(nonceB64);
      const ciphertext = this.customBase64Decode(ciphertextB64);
      const tag = this.customBase64Decode(tagB64);

      const combined = new Uint8Array(ciphertext.length + tag.length);
      combined.set(ciphertext);
      combined.set(tag, ciphertext.length);

      const keyRaw = Uint8Array.from(atob(this.aesKeyB64), c => c.charCodeAt(0));
      const cryptoKey = await crypto.subtle.importKey("raw", keyRaw, { name: "AES-GCM" }, false, ["decrypt"]);

      const decryptedBuffer = await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce }, cryptoKey, combined);
      return new TextDecoder().decode(decryptedBuffer);
    } catch (err) {
      console.error("Decryption failed:", err);
      return encrypted;
    }
  }

  // Generic API request
  private async makeRequest<T>(params: Record<string, string>): Promise<T> {
    try {
      const query = new URLSearchParams(params).toString();
      const res = await fetch(`${this.baseUrl}?${query}`);
      if (!res.ok) throw new Error(`API request failed with status ${res.status}`);
      return await res.json() as T;
    } catch (err) {
      console.error("API request failed:", err);
      toast.error("Failed to fetch data from API");
      throw err;
    }
  }

  // Get group data and decrypt
  public async getGroupData(groupName: string): Promise<GroupData> {
    const rawData = await this.makeRequest<GroupData>({ Type: "getgroupdata", GroupName: groupName });
    const decryptedData: GroupData = {};

    for (const custId in rawData) {
      decryptedData[custId] = {};
      for (const date in rawData[custId]) {
        decryptedData[custId][date] = await Promise.all(
          rawData[custId][date].map(async ([id, val]) => [id, await this.decryptValue(val)] as [string, string])
        );
      }
    }

    return decryptedData;
  }

  // Get nurses
  public async getNurses(groupName: string): Promise<NursesData> {
    const rawData = await this.makeRequest<NursesData>({ Type: "getNurseByGroup", GroupName: groupName });
    const decryptedData: NursesData = {} as NursesData;

    for (const custId in rawData) {
      const value = rawData[custId];
      if (typeof value === "string") {
        decryptedData[custId] = await this.decryptValue(value);
      } else if (Array.isArray(value)) {
        decryptedData[custId] = await Promise.all(value.map(v => this.decryptValue(v)));
      }
    }

    if (rawData.status) decryptedData.status = rawData.status;
    if (rawData.group) decryptedData.group = rawData.group;

    return decryptedData;
  }

  // Similar getRooms and getNames methods can be added in the same simple pattern
}

// Usage
export const awsApi = new AwsApiService();
