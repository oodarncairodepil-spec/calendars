import { supabase } from './supabase';

// #region agent log
const logHolidays = (location: string, message: string, data: any, hypothesisId: string) => {
  fetch('http://127.0.0.1:7244/ingest/060299a5-b9d1-49ae-9e54-31d3e944dc91',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location,message,data,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId})}).catch(()=>{});
};
// #endregion

export interface Holiday {
  id: string;
  date: string; // ISO date string
  name: string;
  type: 'national' | 'joint_leave';
  emoji?: string | null;
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
    // #region agent log
    logHolidays('holidays-service.ts:29', 'getHolidaysForYear query start', { year }, 'E');
    // #endregion
    const { data, error } = await supabase
      .from('holidays')
      .select('*')
      .eq('year', year)
      .order('date', { ascending: true });

    if (error) {
      // #region agent log
      logHolidays('holidays-service.ts:36', 'getHolidaysForYear error', { error: error.message, code: error.code }, 'E');
      // #endregion
      throw error;
    }
    
    // #region agent log
    logHolidays('holidays-service.ts:41', 'getHolidaysForYear query result', { dataCount: data?.length || 0, sampleDates: data?.slice(0, 3).map(h => h.date) || [] }, 'E');
    // #endregion

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

  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/060299a5-b9d1-49ae-9e54-31d3e944dc91',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'holidays-service.ts:65',message:'getHolidaysForMonth result',data:{year,month,allHolidaysCount:Object.keys(allHolidays).length,monthHolidaysCount:Object.keys(monthHolidays).length,monthHolidaysKeys:Object.keys(monthHolidays).slice(0,5)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion

  return monthHolidays;
};

export const clearHolidaysCache = () => {
  holidaysCache = null;
};

