import { Body, Controller, HttpException, Post, Req, UseGuards } from '@nestjs/common';
import { ServiceAuthGuard } from '../auth/auth.guard';
import type { ServiceRequest } from '../auth/auth.guard';
import { TrendsService } from './trends.service';

@Controller('trends')
// @UseGuards(JwtAuthGuard) // Uncomment when JWT guard is needed
export class TrendsController {
    constructor(private readonly trendsService: TrendsService) {}

    @Post()
    @UseGuards(ServiceAuthGuard)
    async getTrends(
        @Body()
        body: {
            start_date: string;
            end_date: string;
            meterIds: string[];
            suffixes: string[];
            userTimezone?: string;
        },
        @Req() req: ServiceRequest,
    ) {
        const { start_date, end_date, meterIds, suffixes, userTimezone } = body;

        // Validation
        if (!start_date || !end_date) {
            throw new HttpException(
                'start_date and end_date are required',
                400,
            );
        }

        if (!meterIds?.length) {
            throw new HttpException(
                'meterIds array is required and cannot be empty',
                400,
            );
        }

        if (!suffixes?.length) {
            throw new HttpException(
                'suffixes array is required and cannot be empty',
                400,
            );
        }

        // Use provided timezone or fallback to user's timezone
        const effectiveTimezone = userTimezone || req?.user?.timezone || 'Asia/Karachi';

        return this.trendsService.getTrendsByMeters(
            start_date,
            end_date,
            meterIds,
            suffixes,
            effectiveTimezone,
            req.service!.project,
        );
    }
}