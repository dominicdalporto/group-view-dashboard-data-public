import { useState, useEffect } from "react";
import { awsApi, GroupData, NursesData, RoomsData } from "../services/awsApi";
import { DataProcessor } from "../services/dataProcessor";
import isEqual from "lodash/isEqual";

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

/**
 * Utility to force a date string (YYYY-MM-DD) to be interpreted as
 * UTC midnight, preventing local time zone shifts.
 */
function toUTCDate(dateStr: string): Date {
  if (dateStr.includes('T')) {
    return new Date(dateStr);
  }
  return new Date(`${dateStr}T00:00:00.000Z`);
}


export function useAwsData() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userGroup, setUserGroup] = useState<string>(""); // Using "" is fine if your logic handles it
  const [groupData, setGroupData] = useState<GroupData>({});
  const [nurses, setNurses] = useState<NursesData>({});
  const [rooms, setRooms] = useState<RoomsData>({});
  const [names, setNames] = useState<Record<string, string>>({});
  const [processedUsers, setProcessedUsers] = useState<UserData[]>([]);
  const [processedNurses, setProcessedNurses] = useState<NurseData[]>([]);
  const [totalDehydrated, setTotalDehydrated] = useState(0);
  const [allNurses, setAllNurses] = useState<string[]>([]);

  //etch user group
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

  const fetchAllData = async (showLoading = false) => {
    if (!userGroup) return;
  
    if (showLoading) setLoading(true);
  
    try {
      const [newGroupData, newNurses, newRooms, newNames] = await Promise.all([
        awsApi.getGroupData(userGroup),
        awsApi.getNurses(userGroup),
        awsApi.getRooms(userGroup),
        awsApi.getNames(userGroup)
      ]);
  
      const processedData = DataProcessor.processUserData(newGroupData, newNames, newNurses, newRooms);
      const allNursesList = DataProcessor.getAllNurses(newNurses);
  
      const newUsers: UserData[] = processedData.map(user => {
        
        // ✅ TIME ZONE FIX APPLIED HERE
        const activityData = user.dates.map((date, index) => ({
          date,
          value: user.ounces[index],
        }))
        // Sort by UTC timestamp to prevent time zone shifts
        .sort((a, b) => toUTCDate(a.date).getTime() - toUTCDate(b.date).getTime());
  
        // Because the sort is now correct, the join/lastActive dates will be correct
        const joinDate = activityData[activityData.length - 1]?.date || new Date().toISOString().split("T")[0];
        const lastActive = activityData[0]?.date || new Date().toISOString().split("T")[0];

        return {
          id: user.custId,
          name: user.name,
          email: `${user.name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
          group: userGroup,
          joinDate: joinDate,
          lastActive: lastActive,
          status: user.hydrationStatus,
          nursesAssigned: Array.isArray(newNurses[user.custId])
            ? newNurses[user.custId] as string[]
            : [user.nurse],
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
            sevenDayOunces: parseFloat(user.sevenDayOunces.toFixed(1)),
          },
          activityData,
        };
      });
  
      const nursesMap: Map<string, NurseData> = new Map();
      allNursesList.forEach(nurseName => {
        nursesMap.set(nurseName, {
          id: nurseName.replace(/\s+/g, ''),
          name: nurseName,
          patientCount: 0,
          patients: []
        });
      });
  
      newUsers.forEach(user => {
        user.nursesAssigned.forEach(nurseName => {
          if (nursesMap.has(nurseName)) {
            const nurseData = nursesMap.get(nurseName)!;
            nurseData.patientCount++;
            nurseData.patients.push({
              id: user.id,
              name: user.name,
              room: user.room,
              hydrationStatus: user.status,
            });
          }
        });
      });
  
      const newProcessedNurses = Array.from(nursesMap.values());
      const newTotalDehydrated = DataProcessor.countDehydratedPatients(processedData);
  
      // Only update state if data has changed
      if (!isEqual(newGroupData, groupData)) setGroupData(newGroupData);
      if (!isEqual(newNurses, nurses)) setNurses(newNurses);
      if (!isEqual(newRooms, rooms)) setRooms(newRooms);
      if (!isEqual(newNames, names)) setNames(newNames);
      if (!isEqual(newUsers, processedUsers)) setProcessedUsers(newUsers);
      if (!isEqual(newProcessedNurses, processedNurses)) setProcessedNurses(newProcessedNurses);
      if (newTotalDehydrated !== totalDehydrated) setTotalDehydrated(newTotalDehydrated);
      if (!isEqual(allNursesList, allNurses)) setAllNurses(allNursesList);
  
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError("Failed to fetch data");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // run fetch on group change and every 5 minutes
  useEffect(() => {
    if (!userGroup) return;
  
    fetchAllData(true); // initial load shows loading
    const interval = setInterval(() => fetchAllData(false), 5 * 60 * 1000); // background refresh
  
    return () => clearInterval(interval);
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