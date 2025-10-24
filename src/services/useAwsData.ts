import { toast } from "sonner";

// AWS API Service for interacting with your backend
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
  private baseUrl: string;
  private userId: string | null = null;
  private aesKeyB64: string;

  constructor(userId: string | null = null) {
    this.baseUrl =
      "https://ajtwnkl2yb.execute-api.us-east-2.amazonaws.com/test/sponge";
    this.userId = userId;

    const key = import.meta.env.ENCRYPTION_KEY;
    if (!key) {
      console.error("ENCRYPTION_KEY not set in environment!");
      throw new Error("ENCRYPTION_KEY not set in environment!");
    }

    // Print first 4 chars only, mask the rest for safety
    const maskedKey = key.slice(0, 4) + "*".repeat(Math.max(0, key.length - 4));
    console.log("ENCRYPTION_KEY partially loaded:", maskedKey);

    this.aesKeyB64 = key;
  }

  setUserId(userId: string | null) {
    this.userId = userId;
  }

  private customBase64Decode(data: string): Uint8Array {
    const normalized = data.replace(/-/g, "+").replace(/_/g, "/").replace(/\$/g, "=").replace(/~/g, "&");
    const binary = atob(normalized);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  // Decrypt AES-GCM encrypted string
  async decryptValue(encrypted: string): Promise<string> {
    try {
      const [nonceB64, ciphertextB64, tagB64] = encrypted.split("^");
      const nonce = this.customBase64Decode(nonceB64);
      const ciphertext = this.customBase64Decode(ciphertextB64);
      const tag = this.customBase64Decode(tagB64);

      const combined = new Uint8Array(ciphertext.length + tag.length);
      combined.set(ciphertext);
      combined.set(tag, ciphertext.length);

      const keyRaw = Uint8Array.from(atob(this.aesKeyB64), (c) => c.charCodeAt(0));
      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyRaw,
        { name: "AES-GCM" },
        false,
        ["decrypt"]
      );

      const plaintextBuffer = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: nonce },
        cryptoKey,
        combined
      );

      return new TextDecoder().decode(plaintextBuffer);
    } catch (err) {
      console.error("Decryption failed:", err);
      return encrypted; // fallback: return raw encrypted string
    }
  }

  // Recursively decrypt object fields containing encrypted strings
  async decryptObjectFields<T>(obj: T): Promise<T> {
    if (!obj || typeof obj !== "object") return obj;
    const cloned: any = Array.isArray(obj) ? [] : {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "string" && value.includes("^")) {
        cloned[key] = await this.decryptValue(value);
      } else if (typeof value === "object" && value !== null) {
        cloned[key] = await this.decryptObjectFields(value);
      } else {
        cloned[key] = value;
      }
    }

    return cloned;
  }

  // Generic request method
  async makeRequest<T>(params: Record<string, string>): Promise<T> {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await fetch(`${this.baseUrl}?${queryParams}`);

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      console.error("API request failed:", error);
      toast.error("Failed to fetch data from API");
      throw error;
    }
  }

  // Example API calls
  async getUserGroup(): Promise<string> {
    if (!this.userId) {
      toast.error("User ID not set");
      return "";
    }
    const params = { Type: "getusergroup", CustID: this.userId };
    const response = await this.makeRequest<{ Groups: string[] }>(params);
    return response.Groups[0] || "";
  }

  async getGroupData(groupName: string): Promise<GroupData> {
    const params = { Type: "getgroupdata", GroupName: groupName };
    const data = await this.makeRequest<GroupData>(params);
    return await this.decryptObjectFields(data);
  }

  async getNurses(groupName: string): Promise<NursesData> {
    const params = { Type: "getNurseByGroup", GroupName: groupName };
    const data = await this.makeRequest<NursesData>(params);
    return await this.decryptObjectFields(data);
  }

  async getRooms(groupName: string): Promise<RoomsData> {
    const params = { Type: "getRoomByGroup", GroupName: groupName };
    const data = await this.makeRequest<RoomsData>(params);
    return await this.decryptObjectFields(data);
  }

  async getNames(groupName: string): Promise<Record<string, string>> {
    const params = { Type: "getNamesByGroup", GroupName: groupName };
    const data = await this.makeRequest<Record<string, string>>(params);
    return await this.decryptObjectFields(data);
  }
}

// Export service instance
export const awsApi = new AwsApiService();
