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

  @Get('mapped-location')
  getMappedLocation(): Record<string, string[]> {
    return {
      Z1: ['GW0', 'GW4'],
      Z2: ['GW1', 'GW9', 'GW10', 'GW11', 'GW12'],
      Z3: ['GW3', 'GW7'],
      Z4: ['GW0', 'GW5'],
      Z5: ['GW2'],
    };
  }
  @Get('devices')
  getAlarmDevices(): Record<string, string[]> {
    return {
      Z1: [
        'EM01',
        'EM02',
        'EM03',
        'EM04',
        'EM05',
        'EM06',
        'EM07',
        'EM08',
        'EM09',
        'EM10',
        'EM11',
        'EM12',
        'EM13',
        'EM14',
        'EM15',
        'EM16',
        'EM17',
        'EM18',
        'EM19',
        'EM20',
        'EM21',
        'EM22',
        'FM01',
        'FM02',
        'FM03',
      ],
      Z2: [
        'EM01',
        'EM02',
        'EM03',
        'EM04',
        'EM05',
        'EM06',
        'EM07',
        'EM08',
        'EM09',
        'EM10',
        'EM11',
        'EM12',
        'FM01',
        'FM02',
        'FM03',
        'FM04',
        'FM05',
        'FM06',
        'FM07',
        'FM08',
        'FM09',
        'FM10',
        'FM11',
        'FM12',
        'FM13',
        'FM14',
        'FM15',
        'FM16',
        'FM17',
        'FM18',
        'FM19',
      ],
      Z3: [
        'EM01',
        'EM02',
        'EM03',
        'EM04',
        'EM05',
        'EM06',
        'EM07',
        'EM08',
        'EM09',
        'EM10',
        'EM11',
        'FM01',
        'FM02',
        'FM03',
        'FM04',
        'FM05',
        'FM06',
      ],
      Z4: [
        'EM01',
        'EM02',
        'EM03',
        'EM04',
        'EM05',
        'EM06',
        'EM07',
        'EM08',
        'EM09',
        'EM10',
        'EM11',
        'EM12',
        'EM13',
        'EM14',
        'EM15',
        'EM16',
        'EM17',
        'EM18',
        'EM19',
        'EM20',
        'EM21',
        'EM22',
      ],
      Z5: ['EM01', 'EM02', 'EM03', 'EM04', 'EM05', 'FM1', 'FM2', 'FM3'],
    };
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
    @Body() dto: UpdateAlarmDto,
  ) {
    return this.alarmsService.updateAlarm({
      ...dto,
      alarmConfigId: new Types.ObjectId(alarmConfigId),
    });
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
  getActiveAlarms() {
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

  // ✅ Acknowledge multiple occurrences
  @Patch('occurrences/acknowledge')
  async acknowledgeMany(@Body() dto: AcknowledgeManyDto) {
    return this.alarmsService.acknowledgeMany(dto.ids, dto.acknowledgedBy);
  }

  @Patch('occurrences/snooze')
  async snoozeAlarm(@Body() snoozeDto: SnoozeDto) {
    return this.alarmsService.snoozeAlarm(snoozeDto);
  }
}
