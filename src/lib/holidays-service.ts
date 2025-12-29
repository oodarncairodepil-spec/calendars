import { supabase } from './supabase';

export interface Holiday {
  id: string;
  date: string; // ISO date string
  name: string;
  type: 'national' | 'joint_leave';
  year: number;
}

export interface HolidayMap {
  [dateKey: string]: Holiday[]; // dateKey format: "YYYY-MM-DD"
}

// Cache for holidays to avoid repeated queries
let holidaysCache: { year: number; holidays: HolidayMap } | null = null;

export const getHolidaysForYear = async (year: number): Promise<HolidayMap> => {
  // Return cached data if available
  if (holidaysCache && holidaysCache.year === year) {
    return holidaysCache.holidays;
  }

  try {
    const { data, error } = await supabase
      .from('holidays')
      .select('*')
      .eq('year', year)
      .order('date', { ascending: true });

    if (error) {
      throw error;
    }

    // Convert array to map by date
    const holidayMap: HolidayMap = {};
    (data || []).forEach((holiday) => {
      const dateKey = holiday.date; // Already in YYYY-MM-DD format
      if (!holidayMap[dateKey]) {
        holidayMap[dateKey] = [];
      }
      holidayMap[dateKey].push(holiday);
    });

    // Update cache
    holidaysCache = { year, holidays: holidayMap };

    return holidayMap;
  } catch (error) {
    console.error('Failed to load holidays:', error);
    return {};
  }
};

export const getHolidaysForMonth = async (year: number, month: number): Promise<HolidayMap> => {
  const allHolidays = await getHolidaysForYear(year);
  
  // Filter holidays for the specific month
  const monthHolidays: HolidayMap = {};
  Object.keys(allHolidays).forEach((dateKey) => {
    const date = new Date(dateKey);
    if (date.getFullYear() === year && date.getMonth() + 1 === month) {
      monthHolidays[dateKey] = allHolidays[dateKey];
    }
  });

  return monthHolidays;
};

export const clearHolidaysCache = () => {
  holidaysCache = null;
};

