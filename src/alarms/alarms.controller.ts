/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Types } from 'mongoose';
import { AlarmsService } from './alarms.service';
import { ConfigAlarmDto } from './dto/alarmsConfig.dto';
import { AlarmsTypeDto } from './dto/alarmsType.dto';
import { UpdateAlarmDto } from './dto/update-alarm.dto';
import { AcknowledgeDto } from './dto/acknowledge.dto';
import { AcknowledgeManyDto } from './dto/acknowledge-many.dto';
import { SnoozeDto } from './dto/snooze.dto';
import { TriggeredAlarmResponse } from './alarms.service';
@Controller('alarms')
export class AlarmsController {
  constructor(private readonly alarmsService: AlarmsService) {}

  @Get('intervals')
  getIntervals() {
    return this.alarmsService.getIntervals();
  }

  @Get('time')
  getTime() {
    return this.alarmsService.getTime();
  }

  @Get('getlist')
  getSuffixes() {
    return this.alarmsService.getAllSuffixes();
  }

  // Types section
  @Get('types/names')
  getAllAlarmsTypes() {
    return this.alarmsService.getAlarmsTypeName();
  }

  @Get('types')
  getAllAlarmTypes() {
    return this.alarmsService.getAllAlarmTypes();
  }

  @Post('types')
  create(@Body() dto: AlarmsTypeDto) {
    return this.alarmsService.addAlarmType(dto);
  }

  @Patch('types/:typeId')
  update(@Param('typeId') typeId: string, @Body() dto: Partial<AlarmsTypeDto>) {
    return this.alarmsService.updateAlarmType(typeId, dto);
  }

  @Delete('types/:typeId')
  delete(@Param('typeId') typeId: string) {
    return this.alarmsService.deleteAlarmType(typeId);
  }

  // Alarm configurations
  @Get('configs')
  async getConfigs(@Query('typeId') typeId?: string) {
    if (typeId) {
      return this.alarmsService.getAlarmsByType(typeId);
    }
    return this.alarmsService.getAllAlarmsConfigs();
  }

  @Post('configs')
  createAlarm(@Body() dto: ConfigAlarmDto) {
    return this.alarmsService.addAlarm(dto);
  }

  @Patch('configs/:alarmConfigId')
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
  async deleteAlarm(@Param('alarmConfigId') alarmConfigId: string) {
    return this.alarmsService.deleteAlarmByConfigId(alarmConfigId);
  }

  @Get(':alarmId/type')
  getAlarmTypeByAlarmId(@Param('alarmId') alarmId: string) {
    return this.alarmsService.getAlarmTypeByAlarmId(alarmId);
  }

  @Get('active')
  getActiveAlarms(): Promise<TriggeredAlarmResponse[]> {
    return this.alarmsService.processActiveAlarms();
  }

  @Post('history')
  async getAllAlarms(@Body() filters: any) {
    return await this.alarmsService.gethistoricalAlarms(filters);
  }

  @Get('acknowledgment-actions')
  async acknowledgementActions() {
    return await this.alarmsService.acknowledgementActions();
  }

  @Patch('occurrences/:id/acknowledge')
  async acknowledgeOne(
    @Param('id') id: string,
    @Body() dto: AcknowledgeDto,
  ) {
    return this.alarmsService.acknowledgeOne(id, dto.action, dto.acknowledgedBy);
  }

  // - Acknowledge multiple occurrences
  @Patch('occurrences/acknowledge')
  async acknowledgeMany(@Body() dto: AcknowledgeManyDto) {
    return this.alarmsService.acknowledgeMany(dto.ids, dto.acknowledgedBy);
  }

  @Patch('occurrences/snooze')
  async snoozeAlarm(@Body() snoozeDto: SnoozeDto) {
    return this.alarmsService.snoozeAlarm(snoozeDto);
  }
}
