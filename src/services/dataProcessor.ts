import { GroupData, NursesData, RoomsData } from "./awsApi";

export interface ProcessedUserData {
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
  
  // Utility to force date strings to be interpreted as UTC midnight
  private static toUTCDate(dateStr: string): Date {
      return new Date(`${dateStr}T00:00:00.000Z`);
  }
  
  // Convert group data into per-user daily data
  static createDayData(groupData: GroupData): Record<string, [string, number][]> {
    const dayData: Record<string, [string, number][]> = {};

    Object.entries(groupData).forEach(([custId, datesObj]) => {
      dayData[custId] = [];

      Object.entries(datesObj).forEach(([date, values]) => {
        if (values && values.length > 0 && values[0]) {
          const amount = parseFloat(values[0][1].toString());
          dayData[custId].push([date, amount]);
        }
      });
    });

    return dayData;
  }

  // Process user data with names, nurses, rooms
  static processUserData(
    groupData: GroupData,
    names: Record<string, string>,
    nurses: NursesData,
    rooms: RoomsData
  ): ProcessedUserData[] {
    const dayData = this.createDayData(groupData);
    const processed: ProcessedUserData[] = [];

    Object.entries(dayData).forEach(([custId, userDates]) => {
      const dates: string[] = [];
      const ounces: number[] = [];

      // Sort descending by date (FIXED: Use toUTCDate for accurate timestamp comparison)
      userDates.sort((a, b) => this.toUTCDate(b[0]).getTime() - this.toUTCDate(a[0]).getTime());

      userDates.forEach(([date, amount]) => {
        dates.push(date);
        ounces.push(amount);
      });

      const validOunces = ounces.filter(oz => !isNaN(oz));
      const averageOunces = validOunces.length > 0
        ? validOunces.reduce((sum, oz) => sum + oz, 0) / validOunces.length
        : 0;

      const todayOunces = ounces[0] || 0;
      const threeDayOunces = ounces.slice(0, 3).reduce((sum, oz) => sum + oz, 0);
      const sevenDayOunces = ounces.slice(0, 7).reduce((sum, oz) => sum + oz, 0);
      const daysOver60oz = ounces.filter(oz => oz >= 60).length;

      let hydrationStatus: 'hydrated' | 'mild dehydration' | 'dehydrated';
      if (threeDayOunces < 40) hydrationStatus = 'dehydrated';
      else if (threeDayOunces < 120) hydrationStatus = 'mild dehydration';
      else hydrationStatus = 'hydrated';

      // Nurse and room assignment (rest of the logic remains the same)
      const nurseValue = nurses[custId];
      const nurse = Array.isArray(nurseValue)
        ? nurseValue[0] || 'Unassigned'
        : typeof nurseValue === 'string'
          ? nurseValue
          : 'Unassigned';

      const roomValue = rooms[custId];
      const room = Array.isArray(roomValue)
        ? roomValue[0] || 'Unassigned'
        : typeof roomValue === 'string'
          ? roomValue
          : 'Unassigned';

      processed.push({
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

    // Sort ascending by seven-day ounces (least hydrated first)
    return processed.sort((a, b) => a.sevenDayOunces - b.sevenDayOunces);
  }

  // Filter user data for recent N days
  static filterRecentDays(userData: ProcessedUserData[], days: number): ProcessedUserData[] {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return userData.map(user => {
      const indices: number[] = [];
      user.dates.forEach((dateStr, i) => {
        // FIXED: Use toUTCDate for accurate comparison against local cutoff date
        if (this.toUTCDate(dateStr) >= cutoff) indices.push(i);
      });

      return {
        ...user,
        dates: indices.map(i => user.dates[i]),
        ounces: indices.map(i => user.ounces[i]),
        averageOunces: indices.length
          ? indices.reduce((sum, i) => sum + user.ounces[i], 0) / indices.length
          : 0,
        todayOunces: indices.length ? user.ounces[indices[0]] : 0,
        threeDayOunces: indices.slice(0, 3).reduce((sum, i) => sum + user.ounces[i], 0),
        sevenDayOunces: indices.slice(0, 7).reduce((sum, i) => sum + user.ounces[i], 0),
      };
    });
  }

  // Convert to table format
  static createTableData(userData: ProcessedUserData[]): Record<string, any[]> {
    const tables: Record<string, any[]> = {};

    userData.forEach(user => {
      tables[user.custId] = user.dates
        .map((date, i) => {
            // FIXED: Use toUTCDate for correct date object creation
            const dateObj = this.toUTCDate(date);
            
            // Format the date using UTC methods to ensure the calendar day is correct
            const year = dateObj.getUTCFullYear();
            const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getUTCDate()).padStart(2, '0');
            const formattedDate = `${year}-${month}-${day}`;
            
            return { date: formattedDate, ounces: parseFloat(user.ounces[i].toFixed(1)) };
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });

    return tables;
  }

  // Count dehydrated users
  static countDehydratedPatients(userData: ProcessedUserData[]): number {
    return userData.filter(u => u.hydrationStatus === 'dehydrated').length;
  }

  // Get all unique nurses
  static getAllNurses(nurses: NursesData): string[] {
    const set = new Set<string>();
    Object.entries(nurses).forEach(([custId, value]) => {
      if (custId === "status" || custId === "group") return;
      if (Array.isArray(value)) value.forEach(n => n && set.add(n));
      else if (typeof value === "string" && value) set.add(value);
    });
    return Array.from(set).sort();
  }

  // Count total unique nurses
  static countTotalNurses(nurses: NursesData): number {
    return this.getAllNurses(nurses).length;
  }
}