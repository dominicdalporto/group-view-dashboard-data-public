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

  constructor(userId: string | null = null) {
    this.baseUrl = "https://ajtwnkl2yb.execute-api.us-east-2.amazonaws.com/test/sponge";
    this.userId = userId;
  }

  setUserId(userId: string | null) {
    this.userId = userId;
  }

  // Generic request method to AWS API
  private async makeRequest<T>(params: Record<string, string>): Promise<T> {
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

  // Call Cloudflare Pages function to decrypt group data server-side
  private async decryptGroupDataServerSide(encryptedData: any): Promise<any> {
    try {
      const response = await fetch("/@/functions/decrypt-group-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ encryptedData })
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || "Server decryption failed");
      return result.data;
    } catch (err) {
      console.error("Decryption failed:", err);
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
      const params = { Type: "getusergroup", CustID: this.userId };
      const response = await this.makeRequest<{ Groups: string[] }>(params);
      return response.Groups[0] || "";
    } catch (error) {
      console.error("Failed to get user group:", error);
      return "";
    }
  }

  // Get group data (encrypted), then decrypt server-side
  async getGroupData(groupName: string): Promise<GroupData> {
    try {
      const params = { Type: "getgroupdata", GroupName: groupName };
      const encryptedData = await this.makeRequest<GroupData>(params);
      return await this.decryptGroupDataServerSide(encryptedData);
    } catch (error) {
      console.error("Failed to get group data:", error);
      return {};
    }
  }

  // Get nurses
  async getNurses(groupName: string): Promise<NursesData> {
    try {
      const params = { Type: "getNurseByGroup", GroupName: groupName };
      return await this.makeRequest<NursesData>(params);
    } catch (error) {
      console.error("Failed to get nurses:", error);
      return {};
    }
  }

  // Get rooms
  async getRooms(groupName: string): Promise<RoomsData> {
    try {
      const params = { Type: "getRoomByGroup", GroupName: groupName };
      return await this.makeRequest<RoomsData>(params);
    } catch (error) {
      console.error("Failed to get rooms:", error);
      return {};
    }
  }

  // Get names
  async getNames(groupName: string): Promise<Record<string, string>> {
    try {
      const params = { Type: "getNamesByGroup", GroupName: groupName };
      return await this.makeRequest<Record<string, string>>(params);
    } catch (error) {
      console.error("Failed to get names:", error);
      return {};
    }
  }

  // Create new customer ID
  async newCustID(): Promise<string> {
    try {
      const params = { Type: "newcustid" };
      return await this.makeRequest<string>(params);
    } catch (error) {
      console.error("Failed to get new customer ID:", error);
      throw error;
    }
  }

  // Create or update users/nurses
  async createUser(params: Record<string, string>): Promise<any> {
    return this.makeRequest(params);
  }
  async updateNurse(params: Record<string, string>): Promise<any> {
    return this.makeRequest(params);
  }
  async updateUserNurse(params: Record<string, string>): Promise<any> {
    return this.makeRequest(params);
  }
}

// Export an instance of AwsApiService
export const awsApi = new AwsApiService();
