import { Body, Controller, Post } from '@nestjs/common';
import { GetTrendsDto } from './dto/get-trends.dto';
import { TrendsService } from './trends.service';

@Controller('trends')
export class TrendsController {
    constructor(private readonly trendsService: TrendsService) {}

    @Post()
    async getTrends(@Body() body: GetTrendsDto) {
        return this.trendsService.getTrendsByMeters(
            body.start_date,
            body.end_date,
            body.start_time,
            body.end_time,
            body.meterIds,
            body.suffixes,
            body.userTimezone || 'Asia/Karachi',
            body.projectId,
        );
    }
}