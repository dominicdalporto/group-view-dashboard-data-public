import { toast } from "sonner";

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
  private decryptEndpoint: string;

  constructor(userId: string | null = null) {
    this.baseUrl = "https://ajtwnkl2yb.execute-api.us-east-2.amazonaws.com/test/sponge";
    this.userId = userId;

    // Server-side Pages function endpoint
    this.decryptEndpoint = "@/functions/decrypt-group-data"; //fixed
  }

  setUserId(userId: string | null) {
    this.userId = userId;
  }

  private async makeRequest<T>(params: Record<string, string>): Promise<T> {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await fetch(`${this.baseUrl}?${queryParams}`);
      
      if (!response.ok) throw new Error(`API request failed with status ${response.status}`);
      return (await response.json()) as T;
    } catch (err) {
      console.error("API request failed:", err);
      toast.error("Failed to fetch data from API");
      throw err;
    }
  }

  private async decryptValueServerSide(encrypted: string): Promise<string> {
    try {
      const response = await fetch(this.decryptEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ encrypted })
      });

      if (!response.ok) throw new Error("Server decryption failed");
      const data = await response.json();
      return data.decrypted;
    } catch (err) {
      console.error("Decryption failed:", err);
      return encrypted; // fallback
    }
  }

  private async decryptGroupData(groupData: GroupData): Promise<GroupData> {
    const decryptedData: GroupData = {};

    for (const custId in groupData) {
      decryptedData[custId] = {};
      for (const date in groupData[custId]) {
        decryptedData[custId][date] = await Promise.all(
          groupData[custId][date].map(async ([id, val]) => {
            const decryptedVal = await this.decryptValueServerSide(val.toString());
            return [id, parseFloat(decryptedVal) || 0] as [string, number];
          })
        );
      }
    }

    return decryptedData;
  }

  // ----- API methods -----

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
      console.error("Failed to fetch user group:", err);
      return "";
    }
  }

  async getGroupData(groupName: string): Promise<GroupData> {
    try {
      const params = { Type: "getgroupdata", GroupName: groupName };
      const groupData = await this.makeRequest<GroupData>(params);
      return await this.decryptGroupData(groupData);
    } catch (err) {
      console.error("Failed to get group data:", err);
      return {};
    }
  }

  async getNurses(groupName: string): Promise<NursesData> {
    try {
      const params = { Type: "getNurseByGroup", GroupName: groupName };
      return await this.makeRequest<NursesData>(params);
    } catch (err) {
      console.error("Failed to get nurses:", err);
      return {};
    }
  }

  async getRooms(groupName: string): Promise<RoomsData> {
    try {
      const params = { Type: "getRoomByGroup", GroupName: groupName };
      return await this.makeRequest<RoomsData>(params);
    } catch (err) {
      console.error("Failed to get rooms:", err);
      return {};
    }
  }

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
