import { DateTime } from 'luxon';

const PLANT_TIMEZONE = 'Asia/Karachi';

export function getIntervalWindow(date: string, userTimezone: string) {
  // Karachi 6:30 start
  const plantStart = DateTime.fromISO(date, { zone: PLANT_TIMEZONE }).set({
    hour: 6,
    minute: 0,
    second: 0,
    millisecond: 0,
  });

  // Next day 6:30 end
  const plantEnd = plantStart.plus({ days: 1 }).set({
    hour: 6,
    minute: 0, // 1 minutes margin
    second: 0,
    millisecond: 0,
  });

  return {
    // Mongo ke liye UTC
    start: plantStart.toUTC().toJSDate(),
    end: plantEnd.toUTC().toJSDate(),

    // Debug / UI ke liye
    debug: {
      plantStart: plantStart.toISO(),
      plantEnd: plantEnd.toISO(),
      userViewStart: plantStart.setZone(userTimezone).toISO(),
      userViewEnd: plantEnd.setZone(userTimezone).toISO(),
    },
  };
}