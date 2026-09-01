import { getIntervalWindow } from "./geIntervalWindow";

export function buildtrendsAggregationPipeline(
  meterIds: string[],
  suffixes: string[],
  startDate: string,
  endDate: string,
  zoneName: string,
  timezone: string,
  useSixThirtyWindow = true,
) {
  let start: Date;
  let end: Date;

  if (useSixThirtyWindow) {
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
      date: '$timestamp',
      timezone,
      format: '%Y-%m-%dT%H:%M:%S',
    },
  };

  return [
    // 1. Filter by date
    {
      $match: {
        timestamp: { $gte: start, $lte: end },
      },
    },

    // 2. Project only needed fields (NO REGEX, NO arrayToObject)
    {
      $project: projection,
    },

    // 3. Add zone
    {
      $addFields: { zone: zoneName },
    },
  ];
}