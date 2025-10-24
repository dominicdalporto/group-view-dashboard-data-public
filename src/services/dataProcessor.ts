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
  // Transform raw GroupData into dayData [custId -> [date, amount][]]
  static createDayData(groupData: GroupData): Record<string, [string, number][]> {
    const dayData: Record<string, [string, number][]> = {};

    for (const [custId, dates] of Object.entries(groupData)) {
      dayData[custId] = [];
      for (const [date, values] of Object.entries(dates)) {
        if (values && values.length > 0) {
          dayData[custId].push([date, values[0][1]]); // already number
        }
      }
    }

    return dayData;
  }

  // Process user data into detailed stats
  static processUserData(
    groupData: GroupData,
    names: Record<string, string>,
    nurses: NursesData,
    rooms: RoomsData
  ): ProcessedUserData[] {
    const dayData = this.createDayData(groupData);
    const processed: ProcessedUserData[] = [];

    for (const [custId, userDates] of Object.entries(dayData)) {
      const dates: string[] = [];
      const ounces: number[] = [];

      // Sort descending by date (most recent first)
      userDates.sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());

      userDates.forEach(([date, amt]) => {
        dates.push(date);
        ounces.push(amt);
      });

      const validOunces = ounces.filter(n => !isNaN(n));
      const averageOunces = validOunces.length
        ? validOunces.reduce((sum, n) => sum + n, 0) / validOunces.length
        : 0;

      const todayOunces = ounces[0] ?? 0;
      const threeDayOunces = ounces.slice(0, 3).reduce((sum, n) => sum + n, 0);
      const sevenDayOunces = ounces.slice(0, 7).reduce((sum, n) => sum + n, 0);
      const daysOver60oz = ounces.filter(n => n >= 60).length;

      let hydrationStatus: 'hydrated' | 'mild dehydration' | 'dehydrated';
      if (threeDayOunces < 40) hydrationStatus = 'dehydrated';
      else if (threeDayOunces < 120) hydrationStatus = 'mild dehydration';
      else hydrationStatus = 'hydrated';

      // Assign nurse
      const nurseVal = nurses[custId];
      const nurse = Array.isArray(nurseVal) ? nurseVal[0] || 'Unassigned' :
                    typeof nurseVal === 'string' ? nurseVal : 'Unassigned';

      // Assign room
      const roomVal = rooms[custId];
      const room = Array.isArray(roomVal) ? roomVal[0] || 'Unassigned' :
                  typeof roomVal === 'string' ? roomVal : 'Unassigned';

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
    }

    // Sort by 7-day ounces ascending (least hydrated first)
    return processed.sort((a, b) => a.sevenDayOunces - b.sevenDayOunces);
  }

  // Create table-friendly format
  static createTableData(userData: ProcessedUserData[]): Record<string, any[]> {
    const tables: Record<string, any[]> = {};
    userData.forEach(user => {
      tables[user.custId] = user.dates.map((date, i) => ({
        date: new Date(date).toISOString().split('T')[0],
        ounces: parseFloat(user.ounces[i].toFixed(1))
      })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });
    return tables;
  }

  // Count dehydrated patients
  static countDehydratedPatients(userData: ProcessedUserData[]): number {
    return userData.filter(u => u.hydrationStatus === 'dehydrated').length;
  }

  // Count unique nurses
  static countTotalNurses(nurses: NursesData): number {
    return this.getAllNurses(nurses).length;
  }

  // Get sorted list of all unique nurses
  static getAllNurses(nurses: NursesData): string[] {
    const unique = new Set<string>();
    for (const [custId, val] of Object.entries(nurses)) {
      if (custId === 'status' || custId === 'group') continue;
      if (Array.isArray(val)) val.forEach(n => n && unique.add(n));
      else if (typeof val === 'string' && val) unique.add(val);
    }
    return Array.from(unique).sort();
  }
}
