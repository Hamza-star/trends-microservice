import { getIntervalWindow } from "./geIntervalWindow";
import { DateTime } from 'luxon';

export function buildtrendsAggregationPipeline(
  meterIds: string[],
  suffixes: string[],
  startDate: string,
  endDate: string,
  startTime: string,
  endTime: string,
  zoneName: string,
  timezone: string,
  useSixThirtyWindow = true,
) {
  let start: Date;
  let end: Date;

  if (startTime && endTime) {
    start = DateTime.fromISO(`${startDate}T${startTime}`, { zone: timezone })
      .toUTC()
      .toJSDate();
    end = DateTime.fromISO(`${endDate}T${endTime}`, { zone: timezone })
      .toUTC()
      .toJSDate();
  } else if (useSixThirtyWindow) {
    const startWindow = getIntervalWindow(startDate, timezone);
    const endWindow = getIntervalWindow(endDate, timezone);
    start = startWindow.start;
    end = endWindow.end;
  } else {
    start = new Date(startDate);
    end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
  }

  // Build explicit projection (NO REGEX)
  const projection: any = { _id: 0 };
  for (const meterId of meterIds) {
    for (const suffix of suffixes) {
      projection[`${meterId}_${suffix}`] = 1;
    }
  }

  // Add timestamp
  projection.timestamp = {
    $dateToString: {
      date: '$normalizedTimestamp',
      timezone,
      format: '%Y-%m-%dT%H:%M:%S',
    },
  };

  return [
    // 1. Normalize BSON dates and ISO timestamp strings to a BSON date.
    {
      $set: {
        normalizedTimestamp: {
          $convert: {
            input: '$timestamp',
            to: 'date',
            onError: null,
            onNull: null,
          },
        },
      },
    },

    // 2. Filter by date
    {
      $match: {
        normalizedTimestamp: { $ne: null, $gte: start, $lte: end },
      },
    },

    // 3. Project only needed fields (NO REGEX, NO arrayToObject)
    {
      $project: projection,
    },

    // 4. Add zone
    {
      $addFields: { zone: zoneName },
    },
  ];
}