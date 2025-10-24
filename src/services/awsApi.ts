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

  constructor(userId: string | null = null) {
    this.baseUrl =
      "https://ajtwnkl2yb.execute-api.us-east-2.amazonaws.com/test/sponge";
    this.userId = userId;
  }

  setUserId(userId: string | null) {
    this.userId = userId;
  }

  // -------------------------------
  // 🧩 New server-side decrypt helper
  // -------------------------------
  private async decryptServerSide(encryptedValue: string): Promise<string> {
    try {
      const res = await fetch("/decrypt-group-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: encryptedValue }),
      });

      if (!res.ok) {
        console.error("Server returned:", res.status, await res.text());
        throw new Error(`Server returned ${res.status}`);
      }

      const json = await res.json();

      if (!json || !json.success) {
        console.error("Decryption failed:", json?.error || "Unknown error");
        throw new Error(json?.error || "Server decryption failed");
      }

      return json.decrypted;
    } catch (err) {
      console.error("Decryption failed:", err);
      // Fallback to raw value if decryption fails
      return encryptedValue;
    }
  }

  // -------------------------------
  // Generic AWS API call
  // -------------------------------
  public async makeRequest<T>(params: Record<string, string>): Promise<T> {
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

  // -------------------------------
  // User group
  // -------------------------------
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

  // -------------------------------
  // Group data with server decryption
  // -------------------------------
  async getGroupData(groupName: string): Promise<GroupData> {
    try {
      const params = { Type: "getgroupdata", GroupName: groupName };
      const encryptedGroupData = await this.makeRequest<GroupData>(params);

      const decryptedGroupData: GroupData = {};

      for (const custId in encryptedGroupData) {
        decryptedGroupData[custId] = {};

        for (const date in encryptedGroupData[custId]) {
          const entries = encryptedGroupData[custId][date];

          decryptedGroupData[custId][date] = await Promise.all(
            entries.map(async ([id, val]) => {
              // Some values might already be numbers — skip decryption
              if (typeof val === "number") return [id, val];

              const decrypted = await this.decryptServerSide(val.toString());

              const num = parseFloat(decrypted);
              return [id, isNaN(num) ? 0 : num];
            })
          );
        }
      }

      return decryptedGroupData;
    } catch (error) {
      console.error("Failed to get group data:", error);
      toast.error("Failed to get group data");
      return {};
    }
  }

  // -------------------------------
  // Other endpoints
  // -------------------------------
  async getNurses(groupName: string): Promise<NursesData> {
    try {
      const params = { Type: "getNurseByGroup", GroupName: groupName };
      return await this.makeRequest<NursesData>(params);
    } catch (error) {
      console.error("Failed to get nurses:", error);
      return {};
    }
  }

  async getRooms(groupName: string): Promise<RoomsData> {
    try {
      const params = { Type: "getRoomByGroup", GroupName: groupName };
      return await this.makeRequest<RoomsData>(params);
    } catch (error) {
      console.error("Failed to get rooms:", error);
      return {};
    }
  }

  async getNames(groupName: string): Promise<Record<string, string>> {
    try {
      const params = { Type: "getNamesByGroup", GroupName: groupName };
      return await this.makeRequest<Record<string, string>>(params);
    } catch (error) {
      console.error("Failed to get names:", error);
      return {};
    }
  }

  async newCustID(): Promise<string> {
    try {
      const params = { Type: "newcustid" };
      return await this.makeRequest<string>(params);
    } catch (error) {
      console.error("Failed to get new customer ID:", error);
      throw error;
    }
  }

  async createUser(params: Record<string, string>): Promise<any> {
    try {
      return await this.makeRequest(params);
    } catch (error) {
      console.error("Failed to create user:", error);
      throw error;
    }
  }

  async updateNurse(params: Record<string, string>): Promise<any> {
    try {
      return await this.makeRequest(params);
    } catch (error) {
      console.error("Failed to update nurse:", error);
      throw error;
    }
  }

  async updateUserNurse(params: Record<string, string>): Promise<any> {
    try {
      return await this.makeRequest(params);
    } catch (error) {
      console.error("Failed to update user nurse:", error);
      throw error;
    }
  }
}

// ✅ Initialize API service
export const awsApi = new AwsApiService("rn0Np34StiZ92U0ywZW96MVXBDx1");
