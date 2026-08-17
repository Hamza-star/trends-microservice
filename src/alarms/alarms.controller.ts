/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { Types } from 'mongoose';
import { AlarmsService } from './alarms.service';
import { ConfigAlarmDto } from './dto/alarmsConfig.dto';
import { AlarmsTypeDto } from './dto/alarmsType.dto';
import { UpdateAlarmDto } from './dto/update-alarm.dto';
import { AcknowledgeDto } from './dto/acknowledge.dto';
import { AcknowledgeManyDto } from './dto/acknowledge-many.dto';
import { SnoozeDto } from './dto/snooze.dto';
import { TriggeredAlarmResponse } from './types/alarm-types';

@ApiTags('Alarms')
@Controller('alarms')
export class AlarmsController {
  constructor(private readonly alarmsService: AlarmsService) { }

  // ─── Utility ────────────────────────────────────────────────────────────────

  @Get('intervals')
  @ApiOperation({ summary: 'Get available alarm check intervals' })
  @ApiResponse({ status: 200, description: 'List of interval options returned successfully' })
  getIntervals() {
    return this.alarmsService.getIntervals();
  }

  @Get('time')
  @ApiOperation({ summary: 'Get current server time used for alarm evaluation' })
  @ApiResponse({ status: 200, description: 'Server time returned successfully' })
  getTime() {
    return this.alarmsService.getTime();
  }

  @Get('getlist')
  @ApiOperation({ summary: 'Get all alarm parameter suffixes (payload keys)' })
  @ApiResponse({ status: 200, description: 'List of alarm suffixes returned successfully' })
  getSuffixes() {
    return this.alarmsService.getAllSuffixes();
  }

  @Get('param-options')
  @ApiOperation({ summary: 'Get available parameter options for alarm configuration' })
  @ApiResponse({ status: 200, description: 'Parameter options returned successfully' })
  async getParamOptions() {
    return this.alarmsService.getParamOptions();
  }

  // ─── Alarm Types ─────────────────────────────────────────────────────────────

  @Get('types/names')
  @ApiOperation({ summary: 'Get a list of all alarm type names' })
  @ApiResponse({ status: 200, description: 'Alarm type names returned successfully' })
  getAllAlarmsTypes() {
    return this.alarmsService.getAlarmsTypeName();
  }

  @Get('types')
  @ApiOperation({ summary: 'Get all alarm types with full details' })
  @ApiResponse({ status: 200, description: 'All alarm types returned successfully' })
  getAllAlarmTypes() {
    return this.alarmsService.getAllAlarmTypes();
  }

  @Post('types')
  @ApiOperation({ summary: 'Create a new alarm type' })
  @ApiBody({ type: AlarmsTypeDto })
  @ApiResponse({ status: 201, description: 'Alarm type created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error in request body' })
  create(@Body() dto: AlarmsTypeDto) {
    return this.alarmsService.addAlarmType(dto);
  }

  @Patch('types/:typeId')
  @ApiOperation({ summary: 'Update an existing alarm type by ID' })
  @ApiParam({ name: 'typeId', description: 'MongoDB ObjectId of the alarm type to update', example: '64a1f2c3e4b5a6d7e8f90123' })
  @ApiBody({ type: AlarmsTypeDto })
  @ApiResponse({ status: 200, description: 'Alarm type updated successfully' })
  @ApiResponse({ status: 404, description: 'Alarm type not found' })
  update(@Param('typeId') typeId: string, @Body() dto: Partial<AlarmsTypeDto>) {
    return this.alarmsService.updateAlarmType(typeId, dto);
  }

  @Delete('types/:typeId')
  @ApiOperation({ summary: 'Delete an alarm type by ID' })
  @ApiParam({ name: 'typeId', description: 'MongoDB ObjectId of the alarm type to delete', example: '64a1f2c3e4b5a6d7e8f90123' })
  @ApiResponse({ status: 200, description: 'Alarm type deleted successfully' })
  @ApiResponse({ status: 404, description: 'Alarm type not found' })
  delete(@Param('typeId') typeId: string) {
    return this.alarmsService.deleteAlarmType(typeId);
  }

  // ─── Alarm Configurations ─────────────────────────────────────────────────

  @Get('configs')
  @ApiOperation({ summary: 'Get alarm configurations, optionally filtered by alarm type' })
  @ApiQuery({ name: 'typeId', required: false, description: 'MongoDB ObjectId of the alarm type to filter by', example: '64a1f2c3e4b5a6d7e8f90123' })
  @ApiResponse({ status: 200, description: 'Alarm configurations returned successfully' })
  async getConfigs(@Query('typeId') typeId?: string) {
    if (typeId) {
      return this.alarmsService.getAlarmsByType(typeId);
    }
    return this.alarmsService.getAllAlarmsConfigs();
  }

  @Post('configs')
  @ApiOperation({ summary: 'Create a new alarm configuration' })
  @ApiBody({ type: ConfigAlarmDto })
  @ApiResponse({ status: 201, description: 'Alarm configuration created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error in request body' })
  createAlarm(@Body() dto: ConfigAlarmDto) {
    return this.alarmsService.addAlarm(dto);
  }

  @Patch('configs/:alarmConfigId')
  @ApiOperation({ summary: 'Update an alarm configuration by ID' })
  @ApiParam({ name: 'alarmConfigId', description: 'MongoDB ObjectId of the alarm configuration to update', example: '64a1f2c3e4b5a6d7e8f90123' })
  @ApiBody({ type: UpdateAlarmDto })
  @ApiResponse({ status: 200, description: 'Alarm configuration updated successfully' })
  @ApiResponse({ status: 404, description: 'Alarm configuration not found' })
  updateAlarm(
    @Param('alarmConfigId') alarmConfigId: string,
    @Body() dto: Omit<UpdateAlarmDto, 'alarmConfigId'>,
  ) {
    return this.alarmsService.updateAlarm({
      ...dto,
      alarmConfigId: new Types.ObjectId(alarmConfigId),
    } as UpdateAlarmDto);
  }

  @Delete('configs/:alarmConfigId')
  @ApiOperation({ summary: 'Delete an alarm configuration by ID' })
  @ApiParam({ name: 'alarmConfigId', description: 'MongoDB ObjectId of the alarm configuration to delete', example: '64a1f2c3e4b5a6d7e8f90123' })
  @ApiResponse({ status: 200, description: 'Alarm configuration deleted successfully' })
  @ApiResponse({ status: 404, description: 'Alarm configuration not found' })
  async deleteAlarm(@Param('alarmConfigId') alarmConfigId: string) {
    return this.alarmsService.deleteAlarmByConfigId(alarmConfigId);
  }

  @Get(':alarmId/type')
  @ApiOperation({ summary: 'Get the alarm type associated with a specific alarm configuration' })
  @ApiParam({ name: 'alarmId', description: 'MongoDB ObjectId of the alarm configuration', example: '64a1f2c3e4b5a6d7e8f90123' })
  @ApiResponse({ status: 200, description: 'Alarm type returned successfully' })
  @ApiResponse({ status: 404, description: 'Alarm not found' })
  getAlarmTypeByAlarmId(@Param('alarmId') alarmId: string) {
    return this.alarmsService.getAlarmTypeByAlarmId(alarmId);
  }

  // ─── Active & Historical Alarms ──────────────────────────────────────────────

  @Get('active')
  @ApiOperation({ summary: 'Get all currently active (triggered) alarms' })
  @ApiResponse({ status: 200, description: 'Active alarms returned successfully' })
  getActiveAlarms(): Promise<TriggeredAlarmResponse[]> {
    return this.alarmsService.processActiveAlarms();
  }

  @Post('history')
  @ApiOperation({ summary: 'Get historical alarm occurrences with optional filters' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        startDate: { type: 'string', format: 'date-time', example: '2025-01-01T00:00:00.000Z' },
        endDate: { type: 'string', format: 'date-time', example: '2025-12-31T23:59:59.999Z' },
        alarmTypeId: { type: 'string', example: '64a1f2c3e4b5a6d7e8f90123' },
        status: { type: 'string', example: 'acknowledged' },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 20 },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Historical alarm records returned successfully' })
  async getAllAlarms(@Body() filters: any) {
    return await this.alarmsService.gethistoricalAlarms(filters);
  }

  // ─── Acknowledgements ─────────────────────────────────────────────────────────

  @Get('acknowledgment-actions')
  @ApiOperation({ summary: 'Get all unique acknowledgement action labels used across alarms' })
  @ApiResponse({ status: 200, description: 'Acknowledgement action labels returned successfully' })
  async acknowledgementActions() {
    return await this.alarmsService.acknowledgementActions();
  }

  @Patch('occurrences/:id/acknowledge')
  @ApiOperation({ summary: 'Acknowledge a single alarm occurrence by ID' })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId of the alarm occurrence to acknowledge', example: '64a1f2c3e4b5a6d7e8f90123' })
  @ApiBody({ type: AcknowledgeDto })
  @ApiResponse({ status: 200, description: 'Alarm occurrence acknowledged successfully' })
  @ApiResponse({ status: 400, description: 'Invalid occurrence ID or missing fields' })
  @ApiResponse({ status: 404, description: 'Alarm occurrence not found' })
  async acknowledgeOne(
    @Param('id') id: string,
    @Body() dto: AcknowledgeDto,
  ) {
    return this.alarmsService.acknowledgeOne(id, dto.action, dto.acknowledgedBy);
  }

  @Patch('occurrences/acknowledge')
  @ApiOperation({ summary: 'Acknowledge multiple alarm occurrences at once' })
  @ApiBody({ type: AcknowledgeManyDto })
  @ApiResponse({ status: 200, description: 'Alarm occurrences acknowledged successfully' })
  @ApiResponse({ status: 400, description: 'Validation error in request body' })
  async acknowledgeMany(@Body() dto: AcknowledgeManyDto) {
    return this.alarmsService.acknowledgeMany(dto.ids, dto.acknowledgedBy);
  }

  // ─── Snooze ───────────────────────────────────────────────────────────────────

  @Patch('occurrences/snooze')
  @ApiOperation({ summary: 'Snooze one or more alarm occurrences for a given duration' })
  @ApiBody({ type: SnoozeDto })
  @ApiResponse({ status: 200, description: 'Alarm occurrences snoozed successfully' })
  @ApiResponse({ status: 400, description: 'Validation error in request body' })
  async snoozeAlarm(@Body() snoozeDto: SnoozeDto) {
    return this.alarmsService.snoozeAlarm(snoozeDto);
  }
}
