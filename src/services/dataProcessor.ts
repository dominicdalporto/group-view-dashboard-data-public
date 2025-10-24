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
  static createDayData(groupData: GroupData): Record<string, [string, number][]> {
    const dayData: Record<string, [string, number][]> = {};
    Object.entries(groupData).forEach(([custId, values]) => {
      dayData[custId] = [];
      Object.entries(values).forEach(([date, amounts]) => {
        if (amounts && amounts.length > 0 && amounts[0]) {
          dayData[custId].push([date, amounts[0][1]]);
        }
      });
    });
    return dayData;
  }

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

      userDates.sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
      userDates.forEach(([date, amount]) => {
        dates.push(date);
        ounces.push(amount);
      });

      const validOunces = ounces.filter(oz => !isNaN(oz));
      const averageOunces = validOunces.length > 0 
        ? validOunces.reduce((sum, oz) => sum + oz, 0) / validOunces.length 
        : 0;

      const threeDayOunces = ounces.slice(0, 3).reduce((sum, oz) => sum + oz, 0);
      const sevenDayOunces = ounces.slice(0, 7).reduce((sum, oz) => sum + oz, 0);
      const daysOver60oz = ounces.filter(oz => oz >= 60).length;
      const todayOunces = ounces[0] || 0;

      let hydrationStatus: 'hydrated' | 'mild dehydration' | 'dehydrated';
      if (threeDayOunces < 40) hydrationStatus = 'dehydrated';
      else if (threeDayOunces < 120) hydrationStatus = 'mild dehydration';
      else hydrationStatus = 'hydrated';

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

    return processedData.sort((a, b) => a.sevenDayOunces - b.sevenDayOunces);
  }
}
