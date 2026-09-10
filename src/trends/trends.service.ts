import { HttpException, Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { ProjectConfigService } from '../configuration/project-config.service';
import { buildtrendsAggregationPipeline } from './trends-constants/trends-aggregation';

@Injectable()
export class TrendsService {
    constructor(
        @InjectConnection() private readonly connection: Connection,
        private readonly projectConfigService: ProjectConfigService,
    ) {}

    async getTrendsByMeters(
        startDate: string,
        endDate: string,
        startTime: string,
        endTime: string,
        meterIds: string[],
        suffixes: string[],
        userTimezone: string,
        projectId: string,
        useSixThirtyWindow = true, //FALSE IF GET DATA IN UTC MIDNIGHT TO MIDNIGHT
    ): Promise<any> {
        // Validation
        if (!meterIds?.length || !suffixes?.length) {
            throw new HttpException('meterIds and suffixes are required', 400);
        }

        const projectConfig = await this.projectConfigService.getProjectConfig(projectId);

        const database = this.connection.useDb(projectConfig.databaseName, { useCache: true });

        // Run queries in parallel for all zones
        const zonePromises = projectConfig.collections.map(async (zone) => {
            const pipeline = buildtrendsAggregationPipeline(
                meterIds,
                suffixes,
                startDate,
                endDate,
                startTime,
                endTime,
                zone,
                userTimezone,
                useSixThirtyWindow,
            );

            return database
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