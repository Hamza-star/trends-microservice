import { HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { TrendsConfig } from '../config/trends.config';
import { buildtrendsAggregationPipeline } from './trends-constants/trends-aggregation';

@Injectable()
export class TrendsService {
    constructor(
        @InjectConnection() private readonly connection: Connection,
        private readonly configService: ConfigService,
    ) {}

    async getTrendsByMeters(
        startDate: string,
        endDate: string,
        meterIds: string[],
        suffixes: string[],
        userTimezone: string,
        project: string,
        useSixThirtyWindow = true, //FALSE IF GET DATA IN UTC MIDNIGHT TO MIDNIGHT
    ): Promise<any> {
        // Validation
        if (!meterIds?.length || !suffixes?.length) {
            throw new HttpException('meterIds and suffixes are required', 400);
        }

        const { projectCollections } = this.configService.getOrThrow<TrendsConfig>('trends');
        const collections = projectCollections[project] ?? [];

        if (!collections.length) {
            throw new HttpException('No zones configured', 500);
        }

        // Run queries in parallel for all zones
        const zonePromises = collections.map(async (zone) => {
            const pipeline = buildtrendsAggregationPipeline(
                meterIds,
                suffixes,
                startDate,
                endDate,
                zone,
                userTimezone,
                useSixThirtyWindow,
            );

            return this.connection
                .collection(zone)
                .aggregate(pipeline, { allowDiskUse: true })
                .toArray();
        });

        // Wait for all zones to complete
        const allZoneResults = await Promise.all(zonePromises);

        // Merge results in memory
        const mergedMap = new Map();

        for (const zoneResults of allZoneResults) {
            for (const doc of zoneResults) {
                const { zone, timestamp, ...meterData } = doc;

                if (mergedMap.has(timestamp)) {
                    // Merge existing data
                    const existing = mergedMap.get(timestamp);
                    Object.assign(existing, meterData);
                } else {
                    // Create new entry
                    mergedMap.set(timestamp, {
                        timestamp,
                        ...meterData,
                    });
                }
            }
        }

        // Convert to array and sort by timestamp
        const results = Array.from(mergedMap.values())
            .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

        return {
            timezone: userTimezone,
            data: results,
        };
    }
}