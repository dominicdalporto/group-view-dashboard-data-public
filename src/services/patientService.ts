
import { awsApi } from "./awsApi";
import { toast } from "sonner";

interface CreatePatientParams {
  name: string;
  weight: number;
  height: number;
  birthday: string;
  gender: string;
  deviceSerial?: string;
  nurse?: string;
  room?: string;
}

interface UpdatePatientRoomParams {
  userID: string;
  room: string;
}

interface UpdatePatientNurseParams {
  userID: string;
  nurse: string;
  type: 'updateNurse' | 'removeNurse';
}

export class PatientService {
  async createPatient(params: CreatePatientParams): Promise<boolean> {
    try {
      // Call AWS API to create a patient
      const queryParams: Record<string, string> = {
        Type: 'makecaregiverid',
        Name: params.name,
        Height: params.height.toString(),
        Weight: params.weight.toString(),
        Birthday: params.birthday,
        Gender: params.gender
      };
      
      if (params.deviceSerial) {
        queryParams.DeviceSerial = params.deviceSerial;
      }
      
      if (params.nurse) {
        queryParams.Nurse = params.nurse;
      }
      
      if (params.room) {
        queryParams.Room = params.room;
      }
      
      // Make the API request
      await awsApi.makeRequest(queryParams);
      toast.success("Patient created successfully");
      return true;
    } catch (error) {
      console.error("Failed to create patient:", error);
      toast.error("Failed to create patient");
      return false;
    }
  }

  async updatePatientRoom(params: UpdatePatientRoomParams): Promise<boolean> {
    try {
      const queryParams = {
        Type: 'updateRoom',
        CustID: params.userID,
        Room: params.room
      };
      
      await awsApi.makeRequest(queryParams);
      toast.success("Room updated successfully");
      return true;
    } catch (error) {
      console.error("Failed to update room:", error);
      toast.error("Failed to update room");
      return false;
    }
  }

  async updatePatientNurse(params: UpdatePatientNurseParams): Promise<boolean> {
    try {
      const queryParams = {
        Type: params.type,
        CustID: params.userID,
        Nurse: params.nurse
      };
      
      await awsApi.makeRequest(queryParams);
      toast.success(params.type === 'updateNurse' ? "Nurse added successfully" : "Nurse removed successfully");
      return true;
    } catch (error) {
      console.error("Failed to update nurse:", error);
      toast.error("Failed to update nurse");
      return false;
    }
  }
}

export const patientService = new PatientService();
