import { toast } from "sonner";

export interface GroupData {
  [custId: string]: {
    [date: string]: [string, number][];
  };
}

// Interfaces for other data types remain the same
export interface NursesData { /* ... */ }
export interface RoomsData { /* ... */ }

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
  // Core API Request Helper (Fully Implemented)
  // -------------------------------
  public async makeRequest<T>(params: Record<string, string>): Promise<T> {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const url = `${this.baseUrl}?${queryParams}`;

      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`AWS API request failed: ${response.status} - ${errorText}`);
        throw new Error(`API request failed with status ${response.status}`);
      }

      return response.json() as Promise<T>;
    } catch (error) {
      console.error("API request failed:", error);
      toast.error("Failed to fetch data from API");
      throw error;
    }
  }

  // -------------------------------
  // 🧩 BATCH DECRYPT HELPER
  // -------------------------------
  /**
   * Makes a single POST request to the server function to decrypt an array of values.
   */
  private async decryptBatchServerSide(encryptedValues: string[]): Promise<(string | null)[]> {
    if (encryptedValues.length === 0) return [];

    try {
      const res = await fetch("/decrypt-group-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: encryptedValues }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Server batch decryption failed:", res.status, errorText);
        throw new Error(`Batch Decryption failed with status ${res.status}`);
      }

      const json = await res.json();

      if (!json || !json.success || !Array.isArray(json.decrypted)) {
        console.error("Batch decryption returned invalid structure:", json);
        throw new Error(json?.error || "Server decryption failed");
      }

      return json.decrypted as (string | null)[];
    } catch (err) {
      console.error("Batch decryption request failed:", err);
      // Return nulls for all values if the entire batch request fails
      return encryptedValues.map(() => null); 
    }
  }

  // -------------------------------
  // Group data with server decryption (Rewritten for Order)
  // -------------------------------
  async getGroupData(groupName: string): Promise<GroupData> {
    console.log("--- DEBUG: 1. getGroupData STARTED ---");
    console.log("Group Name:", groupName);
    try {
      const params = { Type: "getgroupdata", GroupName: groupName };
      console.log("--- DEBUG: 2. Calling makeRequest to AWS API ---");
      const encryptedGroupData = await this.makeRequest<GroupData>(params);
      console.log("--- DEBUG: 3. makeRequest SUCCEEDED ---");

      // --- BATCHING SETUP ---
      const orderedEntryMap = new Map<number, { 
          path: [string, string, string], // [custId, date, id]
          type: 'encrypted' | 'plain', 
          value: string | number | null 
      }>();
      const batchValues: string[] = [];
      let index = 0; // The shared index for ordering

      // 1. ITERATE AND COLLECT ALL ENCRYPTED VALUES (Preserving Order)
      for (const custId in encryptedGroupData) {
        for (const date in encryptedGroupData[custId]) {
          const entries = encryptedGroupData[custId][date];

          entries.forEach(([id, val]) => {
            const path: [string, string, string] = [custId, date, id];
            
            // Handle null/undefined values
            if (val === null || val === undefined) {
                orderedEntryMap.set(index, { path, type: 'plain', value: 0 });
            } else {
                const stringVal = val.toString();

                // Check for plain number or unencrypted string
                if (typeof val === "number" || !stringVal.includes('^')) {
                    const num = parseFloat(stringVal);
                    orderedEntryMap.set(index, { path, type: 'plain', value: isNaN(num) ? 0 : num });
                } else {
                    // Collect encrypted value, map its position, and add to sequential batch array
                    orderedEntryMap.set(index, { path, type: 'encrypted', value: stringVal });
                    batchValues.push(stringVal);
                }
            }
            index++;
          });
        }
      }

      // 2. RUN BATCH DECRYPTION (ONE REQUEST)
      const decryptedResults = await this.decryptBatchServerSide(batchValues);

      // 3. RECONSTRUCT THE FINAL DATA STRUCTURE (Guaranteed Order)
      const finalGroupData: GroupData = {};
      let decryptedIndex = 0;

      for (let i = 0; i < orderedEntryMap.size; i++) {
          const entry = orderedEntryMap.get(i)!;
          const [custId, date, id] = entry.path;
          let finalValue: number;

          // Ensure the customer and date structures exist
          if (!finalGroupData[custId]) finalGroupData[custId] = {};
          if (!finalGroupData[custId][date]) finalGroupData[custId][date] = [];

          if (entry.type === 'plain') {
              // Use the plain value directly
              finalValue = entry.value as number;
          } else { // type === 'encrypted'
              // Retrieve the result from the decrypted array in sequential order
              const decryptedVal = decryptedResults[decryptedIndex];
              decryptedIndex++; // Move to the next server result

              if (decryptedVal === null) {
                  finalValue = 0;
              } 
              // Sanity check: ensure the decrypted string is clean
              else if (decryptedVal.includes('^')) {
                  console.error(`Decryption failed integrity check for ID: ${id}. Setting to 0.`);
                  finalValue = 0;
              } 
              else {
                  // Convert to number
                  const num = parseFloat(decryptedVal);
                  finalValue = isNaN(num) ? 0 : num;
              }
          }

          // Add the final [id, value] tuple to the correct array position
          finalGroupData[custId][date].push([id, finalValue]);
      }

      return finalGroupData;
    } catch (error) {
      console.error("--- DEBUG: getGroupData CRASHED ---", error);
      console.error("Failed to get group data:", error);
      toast.error("Failed to get group data");
      return {};
    }
  }

  // -------------------------------
  // Other endpoints (Fully Implemented)
  // -------------------------------
  async getUserGroup(): Promise<string> {
    if (!this.userId) {
      toast.error("User ID not set");
      return "";
    }

    try {
      const params = { Type: 'getusergroup', CustID: this.userId };
      const response = await this.makeRequest<{ Groups: string[] }>(params);
      return response.Groups[0] || "";
    } catch (error) {
      console.error("Failed to get user group:", error);
      return "";
    }
  }
  async getNurses(groupName: string): Promise<NursesData> {
    try {
      const params = { Type: 'getNurseByGroup', GroupName: groupName };
      return await this.makeRequest<NursesData>(params);
    } catch (error) {
      console.error("Failed to get nurses:", error);
      return {};
    }
  }
  async getRooms(groupName: string): Promise<RoomsData> {
    try {
      const params = { Type: 'getRoomByGroup', GroupName: groupName };
      return await this.makeRequest<RoomsData>(params);
    } catch (error) {
      console.error("Failed to get rooms:", error);
      return {};
    }
  }
  async getNames(groupName: string): Promise<Record<string, string>> {
    try {
      const params = { Type: 'getNamesByGroup', GroupName: groupName };
      return await this.makeRequest<Record<string, string>>(params);
    } catch (error) {
      console.error("Failed to get names:", error);
      return {};
    }
  }
  async newCustID(): Promise<string> {
    try {
      const params = { Type: 'newcustid' };
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