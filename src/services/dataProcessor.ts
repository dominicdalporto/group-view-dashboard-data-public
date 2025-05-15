
import { GroupData, NursesData, RoomsData } from "./awsApi";

interface ProcessedUserData {
  custId: string;
  name: string;
  nurse: string;
  room: string;
  dates: string[];
  ounces: number[];
  averageOunces: number;
  todayOunces: number;
  threeDayOunces: number;
  sevenDayOunces: number;
  daysOver60oz: number;
  totalDays: number;
  hydrationStatus: 'hydrated' | 'mild dehydration' | 'dehydrated';
}

export class DataProcessor {
  // Process day data from the API response
  static createDayData(groupData: GroupData): Record<string, [string, number][]> {
    const dayData: Record<string, [string, number][]> = {};
    
    Object.entries(groupData).forEach(([custId, values]) => {
      dayData[custId] = [];
      
      Object.entries(values).forEach(([date, amounts]) => {
        if (amounts && amounts.length > 0 && amounts[0]) {
          dayData[custId].push([date, parseFloat(amounts[0][1].toString())]);
        }
      });
    });
    
    return dayData;
  }

  // Process user data with nursing and room info
  static processUserData(
    groupData: GroupData, 
    names: Record<string, string>, 
    nurses: NursesData, 
    rooms: RoomsData
  ): ProcessedUserData[] {
    const dayData = this.createDayData(groupData);
    const processedData: ProcessedUserData[] = [];
    
    Object.entries(dayData).forEach(([custId, userDates]) => {
      const dates: string[] = [];
      const ounces: number[] = [];
      
      // Sort dates in descending order to get the most recent first
      userDates.sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
      
      userDates.forEach(([date, amount]) => {
        dates.push(date);
        ounces.push(amount);
      });
      
      // Calculate average ounces
      const validOunces = ounces.filter(oz => !isNaN(oz));
      const averageOunces = validOunces.length > 0 
        ? validOunces.reduce((sum, oz) => sum + oz, 0) / validOunces.length 
        : 0;
      
      // Sort dates chronologically for statistics
      const sortedDates = [...dates];
      const sortedOunces = [...ounces];
      
      // Calculate today's ounces (most recent date)
      const todayOunces = dates.length > 0 ? ounces[0] : 0;
      
      // Calculate 3-day total
      const threeDayOunces = ounces.slice(0, 3).reduce((sum, oz) => sum + oz, 0);
      
      // Calculate 7-day total
      const sevenDayOunces = ounces.slice(0, 7).reduce((sum, oz) => sum + oz, 0);
      
      // Calculate days over 60oz
      const daysOver60oz = ounces.filter(oz => oz >= 60).length;
      
      // Calculate hydration status based on 3-day total
      let hydrationStatus: 'hydrated' | 'mild dehydration' | 'dehydrated';
      if (threeDayOunces < 40) {
        hydrationStatus = 'dehydrated';
      } else if (threeDayOunces < 120) {
        hydrationStatus = 'mild dehydration';
      } else {
        hydrationStatus = 'hydrated';
      }
      
      const nurseValue = nurses[custId];
      const nurse = Array.isArray(nurseValue) ? nurseValue[0] || 'Unassigned' : 
                   typeof nurseValue === 'string' ? nurseValue : 'Unassigned';

      const roomValue = rooms[custId];
      const room = Array.isArray(roomValue) ? roomValue[0] || 'Unassigned' : 
                  typeof roomValue === 'string' ? roomValue : 'Unassigned';
      
      processedData.push({
        custId,
        name: names[custId] || custId,
        nurse,
        room,
        dates,
        ounces,
        averageOunces,
        todayOunces,
        threeDayOunces,
        sevenDayOunces,
        totalDays: dates.length,
        daysOver60oz,
        hydrationStatus
      });
    });
    
    // Sort by 7-day ounces in ascending order (least hydrated first)
    return processedData.sort((a, b) => a.sevenDayOunces - b.sevenDayOunces);
  }

  // Filter data for recent days
  static filterRecentDays(userData: ProcessedUserData[], days: number): ProcessedUserData[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return userData.map(user => {
      const filteredIndices: number[] = [];
      
      user.dates.forEach((dateStr, index) => {
        const date = new Date(dateStr);
        if (date >= cutoffDate) {
          filteredIndices.push(index);
        }
      });
      
      return {
        ...user,
        dates: filteredIndices.map(i => user.dates[i]),
        ounces: filteredIndices.map(i => user.ounces[i]),
        averageOunces: filteredIndices.length > 0 
          ? filteredIndices.reduce((sum, i) => sum + user.ounces[i], 0) / filteredIndices.length 
          : 0,
        todayOunces: filteredIndices.length > 0 ? user.ounces[filteredIndices[0]] : 0,
        threeDayOunces: filteredIndices.slice(0, 3).reduce((sum, i) => sum + user.ounces[i], 0),
        sevenDayOunces: filteredIndices.slice(0, 7).reduce((sum, i) => sum + user.ounces[i], 0),
      };
    });
  }

  // Convert to tabular format for display
  static createTableData(userData: ProcessedUserData[]): Record<string, any[]> {
    const tables: Record<string, any[]> = {};
    
    userData.forEach(user => {
      tables[user.custId] = user.dates.map((date, index) => ({
        date: new Date(date).toISOString().split('T')[0],
        ounces: parseFloat(user.ounces[index].toFixed(1))
      })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });
    
    return tables;
  }

  // Count dehydrated patients
  static countDehydratedPatients(userData: ProcessedUserData[]): number {
    return userData.filter(user => user.hydrationStatus === 'dehydrated').length;
  }

  // Count total nurses
  static countTotalNurses(nurses: NursesData): number {
    const uniqueNurses = new Set();
    
    Object.entries(nurses).forEach(([custId, nurseValue]) => {
      if (custId !== "status" && custId !== "group") {
        if (Array.isArray(nurseValue)) {
          nurseValue.forEach(nurse => {
            if (nurse) uniqueNurses.add(nurse);
          });
        } else if (typeof nurseValue === 'string' && nurseValue) {
          uniqueNurses.add(nurseValue);
        }
      }
    });
    
    return uniqueNurses.size;
  }

  // Get all nurses
  static getAllNurses(nurses: NursesData): string[] {
    const uniqueNurses = new Set<string>();
    
    Object.entries(nurses).forEach(([custId, nurseValue]) => {
      if (custId !== "status" && custId !== "group") {
        if (Array.isArray(nurseValue)) {
          nurseValue.forEach(nurse => {
            if (nurse) uniqueNurses.add(nurse);
          });
        } else if (typeof nurseValue === 'string' && nurseValue) {
          uniqueNurses.add(nurseValue);
        }
      }
    });
    
    return Array.from(uniqueNurses).sort();
  }
}
