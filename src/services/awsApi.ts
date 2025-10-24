// awsApi.ts
import { toast } from "sonner";

// AWS API Service
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

  constructor(userId: string | null = null) {
    this.baseUrl = "https://ajtwnkl2yb.execute-api.us-east-2.amazonaws.com/test/sponge";
    this.userId = userId;
  }

  setUserId(userId: string | null) {
    this.userId = userId;
  }

  // Generic request method
  private async makeRequest<T>(params: Record<string, string>): Promise<T> {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await fetch(`${this.baseUrl}?${queryParams}`);

      if (!response.ok) throw new Error(`API request failed with status ${response.status}`);

      return await response.json() as T;
    } catch (error) {
      console.error("API request failed:", error);
      toast.error("Failed to fetch data from API");
      throw error;
    }
  }

  // Server-side decryption
  private async decryptServerSide(encrypted: string): Promise<string> {
    try {
      const res = await fetch("/@/functions/decrypt-group-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ encrypted }),
      });

      if (!res.ok) throw new Error("Server decryption failed");

      const { decrypted } = await res.json();
      return decrypted;
    } catch (err) {
      console.error("Decryption failed:", err);
      return encrypted; // fallback
    }
  }

  // Get user group
  async getUserGroup(): Promise<string> {
    if (!this.userId) {
      toast.error("User ID not set");
      return "";
    }

    try {
      const params = { Type: "getusergroup", CustID: this.userId };
      const response = await this.makeRequest<{ Groups: string[] }>(params);
      return response.Groups[0] || "";
    } catch (err) {
      console.error("Failed to get user group:", err);
      return "";
    }
  }

  // Get group data and decrypt server-side
  async getGroupData(groupName: string): Promise<GroupData> {
    try {
      const params = { Type: "getgroupdata", GroupName: groupName };
      const data = await this.makeRequest<GroupData>(params);

      // decrypt each value using server-side function
      const decryptedData: GroupData = {};
      for (const custId in data) {
        decryptedData[custId] = {};
        for (const date in data[custId]) {
          decryptedData[custId][date] = await Promise.all(
            data[custId][date].map(async ([id, val]) => {
              const decryptedVal = await this.decryptServerSide(val.toString());
              return [id, parseFloat(decryptedVal)] as [string, number];
            })
          );
        }
      }
      return decryptedData;
    } catch (err) {
      console.error("Failed to get group data:", err);
      return {};
    }
  }

  // Get nurses
  async getNurses(groupName: string): Promise<NursesData> {
    try {
      const params = { Type: "getNurseByGroup", GroupName: groupName };
      return await this.makeRequest<NursesData>(params);
    } catch (err) {
      console.error("Failed to get nurses:", err);
      return {};
    }
  }

  // Get rooms
  async getRooms(groupName: string): Promise<RoomsData> {
    try {
      const params = { Type: "getRoomByGroup", GroupName: groupName };
      return await this.makeRequest<RoomsData>(params);
    } catch (err) {
      console.error("Failed to get rooms:", err);
      return {};
    }
  }

  // Get names
  async getNames(groupName: string): Promise<Record<string, string>> {
    try {
      const params = { Type: "getNamesByGroup", GroupName: groupName };
      return await this.makeRequest<Record<string, string>>(params);
    } catch (err) {
      console.error("Failed to get names:", err);
      return {};
    }
  }
}

export const awsApi = new AwsApiService();
