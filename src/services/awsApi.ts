import { toast } from "sonner";

// AWS API Service types
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
    this.baseUrl = "https://ajtwnkl2yb.execute-api.us-east-2.amazonaws.com/test/sponge";
    this.userId = userId;

    // Access Cloudflare Pages secret
    this.aesKeyB64 = (globalThis as any).encryption_key || ""; 
    if (!this.aesKeyB64) {
      console.warn("encryption_key not set in environment!");
    }
  }

  setUserId(userId: string | null) {
    this.userId = userId;
  }

  // Base64 decode helper for AES-GCM
  private customBase64Decode(data: string): Uint8Array {
    const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(normalized);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  // Decrypt AES-GCM string
  async decryptValue(encrypted: string): Promise<string> {
    try {
      const [nonceB64, ciphertextB64, tagB64] = encrypted.split("^");
      const nonce = this.customBase64Decode(nonceB64);
      const ciphertext = this.customBase64Decode(ciphertextB64);
      const tag = this.customBase64Decode(tagB64);

      const combined = new Uint8Array(ciphertext.length + tag.length);
      combined.set(ciphertext);
      combined.set(tag, ciphertext.length);

      const keyRaw = Uint8Array.from(atob(this.aesKeyB64), c => c.charCodeAt(0));
      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyRaw,
        { name: "AES-GCM" },
        false,
        ["decrypt"]
      );

      const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce }, cryptoKey, combined);
      return new TextDecoder().decode(decrypted);
    } catch (err) {
      console.error("Decryption failed:", err);
      return encrypted;
    }
  }

  // Generic request
  async makeRequest<T>(params: Record<string, string>): Promise<T> {
    try {
      const query = new URLSearchParams(params).toString();
      const res = await fetch(`${this.baseUrl}?${query}`);
      if (!res.ok) throw new Error(`API request failed: ${res.status}`);
      return (await res.json()) as T;
    } catch (err) {
      console.error("API request failed:", err);
      toast.error("Failed to fetch data from API");
      throw err;
    }
  }

  // Get user group
  async getUserGroup(): Promise<string> {
    if (!this.userId) {
      toast.error("User ID not set");
      return "";
    }
    try {
      const res = await this.makeRequest<{ Groups: string[] }>({
        Type: "getusergroup",
        CustID: this.userId,
      });
      return res.Groups?.[0] || "";
    } catch (err) {
      console.error("Failed to fetch user group:", err);
      return "";
    }
  }

  // Get group data
  async getGroupData(groupName: string): Promise<GroupData> {
    try {
      return await this.makeRequest<GroupData>({
        Type: "getgroupdata",
        GroupName: groupName,
      });
    } catch (err) {
      console.error("Failed to fetch group data:", err);
      return {};
    }
  }

  // Get nurses
  async getNurses(groupName: string): Promise<NursesData> {
    try {
      return await this.makeRequest<NursesData>({
        Type: "getNurseByGroup",
        GroupName: groupName,
      });
    } catch (err) {
      console.error("Failed to fetch nurses:", err);
      return {};
    }
  }

  // Get rooms
  async getRooms(groupName: string): Promise<RoomsData> {
    try {
      return await this.makeRequest<RoomsData>({
        Type: "getRoomByGroup",
        GroupName: groupName,
      });
    } catch (err) {
      console.error("Failed to fetch rooms:", err);
      return {};
    }
  }

  // Get names
  async getNames(groupName: string): Promise<Record<string, string>> {
    try {
      return await this.makeRequest<Record<string, string>>({
        Type: "getNamesByGroup",
        GroupName: groupName,
      });
    } catch (err) {
      console.error("Failed to fetch names:", err);
      return {};
    }
  }
}

// Export a single instance for use across your app
export const awsApi = new AwsApiService();
