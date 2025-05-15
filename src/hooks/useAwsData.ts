
import { useState, useEffect } from "react";
import { awsApi, GroupData, NursesData, RoomsData } from "../services/awsApi";
import { DataProcessor } from "../services/dataProcessor";

export interface UserData {
  id: string;
  name: string;
  email: string;
  group: string;
  joinDate: string;
  lastActive: string;
  status: "hydrated" | "mild dehydration" | "dehydrated";
  height?: number;
  weight?: number;
  birthday?: string;
  gender?: string;
  nursesAssigned: string[];
  description: string;
  nurse: string;
  room: string;
  metrics: {
    logins: number;
    activity: number;
    submissions: number;
    completionRate: number;
    hydration: number; // Average ounces
    daysOver60oz: number;
    totalDays: number;
    todayOunces: number;
    threeDayOunces: number;
    sevenDayOunces: number;
  };
  activityData: {
    date: string;
    value: number;
  }[];
}

export interface NurseData {
  id: string;
  name: string;
  patientCount: number;
  patients: {
    id: string;
    name: string;
    room: string;
    hydrationStatus: "hydrated" | "mild dehydration" | "dehydrated";
  }[];
}

export function useAwsData() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userGroup, setUserGroup] = useState<string>("");
  const [groupData, setGroupData] = useState<GroupData>({});
  const [nurses, setNurses] = useState<NursesData>({});
  const [rooms, setRooms] = useState<RoomsData>({});
  const [names, setNames] = useState<Record<string, string>>({});
  const [processedUsers, setProcessedUsers] = useState<UserData[]>([]);
  const [processedNurses, setProcessedNurses] = useState<NurseData[]>([]);
  const [totalDehydrated, setTotalDehydrated] = useState(0);
  const [allNurses, setAllNurses] = useState<string[]>([]);

  // Fetch user group
  useEffect(() => {
    const fetchUserGroup = async () => {
      try {
        const group = await awsApi.getUserGroup();
        setUserGroup(group);
      } catch (err) {
        console.error("Failed to fetch user group:", err);
        setError("Failed to fetch user group");
      }
    };

    fetchUserGroup();
  }, []);

  // Fetch group data when we have the user group
  useEffect(() => {
    if (!userGroup) return;

    const fetchAllData = async () => {
      setLoading(true);
      try {
        // Fetch all required data
        const [groupData, nurses, rooms, names] = await Promise.all([
          awsApi.getGroupData(userGroup),
          awsApi.getNurses(userGroup),
          awsApi.getRooms(userGroup),
          awsApi.getNames(userGroup)
        ]);

        setGroupData(groupData);
        setNurses(nurses);
        setRooms(rooms);
        setNames(names);

        // Process the data
        const processedData = DataProcessor.processUserData(groupData, names, nurses, rooms);
        const allNursesList = DataProcessor.getAllNurses(nurses);
        
        // Convert to UserData format
        const users: UserData[] = processedData.map(user => {
          // Convert the dates and ounces to activity data format
          const activityData = user.dates.map((date, index) => ({
            date,
            value: user.ounces[index]
          })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

          return {
            id: user.custId,
            name: user.name,
            email: `${user.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
            group: userGroup,
            joinDate: activityData[0]?.date || new Date().toISOString().split('T')[0],
            lastActive: activityData[activityData.length - 1]?.date || new Date().toISOString().split('T')[0],
            status: user.hydrationStatus,
            nursesAssigned: Array.isArray(nurses[user.custId]) ? nurses[user.custId] as string[] : [user.nurse],
            description: `Patient in room ${user.room} under nurse ${user.nurse}`,
            nurse: user.nurse,
            room: user.room,
            metrics: {
              logins: Math.floor(Math.random() * 50) + 10,
              activity: Math.floor(user.averageOunces * 2),
              submissions: Math.floor(Math.random() * 20),
              completionRate: Math.floor(Math.random() * 40) + 60,
              hydration: parseFloat(user.averageOunces.toFixed(1)),
              daysOver60oz: user.daysOver60oz,
              totalDays: user.totalDays,
              todayOunces: parseFloat(user.todayOunces.toFixed(1)),
              threeDayOunces: parseFloat(user.threeDayOunces.toFixed(1)),
              sevenDayOunces: parseFloat(user.sevenDayOunces.toFixed(1))
            },
            activityData
          };
        });

        // Create list of nurses
        const nursesMap: Map<string, NurseData> = new Map();
        
        allNursesList.forEach(nurseName => {
          nursesMap.set(nurseName, {
            id: nurseName.replace(/\s+/g, ''),
            name: nurseName,
            patientCount: 0,
            patients: []
          });
        });
        
        // Assign patients to nurses
        users.forEach(user => {
          user.nursesAssigned.forEach(nurseName => {
            if (nursesMap.has(nurseName)) {
              const nurseData = nursesMap.get(nurseName)!;
              nurseData.patientCount++;
              nurseData.patients.push({
                id: user.id,
                name: user.name,
                room: user.room,
                hydrationStatus: user.status
              });
            }
          });
        });

        setProcessedNurses(Array.from(nursesMap.values()));
        setProcessedUsers(users);
        setTotalDehydrated(DataProcessor.countDehydratedPatients(processedData));
        setAllNurses(allNursesList);
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch data:", err);
        setError("Failed to fetch data");
        setLoading(false);
      }
    };

    fetchAllData();
  }, [userGroup]);

  return {
    loading,
    error,
    userGroup,
    users: processedUsers,
    nurses: processedNurses,
    allNurses,
    totalDehydrated,
    groupData,
    nursesData: nurses,
    rooms,
    names,
    refreshData: () => {
      if (userGroup) {
        // Trigger a refetch of all data
        setUserGroup(prevGroup => {
          // Setting to empty string and then back will trigger the useEffect
          setTimeout(() => setUserGroup(prevGroup), 0);
          return "";
        });
      }
    }
  };
}
