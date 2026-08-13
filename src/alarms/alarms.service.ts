/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import { ConfigAlarmDto } from './dto/alarmsConfig.dto';
import { AlarmsTypeDto } from './dto/alarmsType.dto';
import { SnoozeDto } from './dto/snooze.dto';
import { UpdateAlarmDto } from './dto/update-alarm.dto';
import { getTimeRange, TimeRangePayload } from './helpers/generalTimeFilter';
import {
  AlarmOccurrence,
  AlarmsOccurrenceDocument,
} from './schema/alarmOccurences.schema';
import { alarmsConfiguration } from './schema/alarmsConfig.schema';
import { Alarms, AlarmsDocument } from './schema/alarmsModel.schema';
import { AlarmRulesSet } from './schema/alarmsTriggerConfig.schema';
import { AlarmsType } from './schema/alarmsType.schema';
import { Logic } from './schema/logic.schema';
import { Threshold } from './schema/threshold.schema';
import { paramsMapping } from 'src/constants/params-mapping';
import {
  AlarmConfigDocument,
  LogicEvaluationStatus,
  LogicUpdatePayload,
  PayloadMap,
  TriggeredAlarmResponse,
  TriggeredAlarmThreshold,
} from './types/alarm-types';

@Injectable()
export class AlarmsService {
  constructor(
    @InjectModel(AlarmsType.name) private alarmTypeModel: Model<AlarmsType>,
    @InjectModel(alarmsConfiguration.name)
    private alarmsModel: Model<alarmsConfiguration>,
    @InjectModel(AlarmRulesSet.name)
    private alarmsRulesSetModel: Model<AlarmRulesSet>,
    @InjectModel(Alarms.name) private alarmsEventModel: Model<AlarmsDocument>,
    @InjectModel(AlarmOccurrence.name)
    private alarmOccurrenceModel: Model<AlarmsOccurrenceDocument>,
    private readonly httpService: HttpService,
    @InjectModel('Users') private userModel: Model<any>,
    @InjectConnection() private readonly connection: Connection,
  ) { }

  private readonly intervalsSec = [5, 15, 30, 60, 120];
  private readonly Time = [1, 2, 3, 4, 5];
  private readonly logger = new Logger(AlarmsService.name);

  async getAlarmsTypeName(): Promise<string[]> {
    const alarmsType = await this.alarmTypeModel
      .find({}, { type: 1, _id: 0 })
      .exec();
    return alarmsType.map((alarm) => alarm.type);
  }

  getIntervals(): number[] {
    return this.intervalsSec;
  }

  getTime(): number[] {
    return this.Time;
  }

  /**
   * Add a new alarm type.
   * @param dto The data transfer object containing alarm type details.
   * @returns The created alarm type.
   */
  async addAlarmType(dto: AlarmsTypeDto) {
    if (dto.type) {
      dto.type = dto.type.toUpperCase();
    }

    const alarmType = new this.alarmTypeModel(dto);
    await alarmType.save();

    return {
      message: 'Alarm Type added successfully',
      data: alarmType,
    };
  }

  /**
   * Get all alarm types.
   * @returns Array of alarm types.
   */
  async getAllAlarmTypes() {
    return this.alarmTypeModel.find().exec();
  }

  /**
   * Update an existing alarm type.
   * @param id The ID of the alarm type to update.
   * @param dto The data transfer object containing updated alarm type details.
   * @returns The updated alarm type.
   */
  async updateAlarmType(
    id: string,
    dto: Partial<AlarmsTypeDto>,
  ) {
    if (dto.type) {
      dto.type = dto.type.toUpperCase();
    }

    const updated = await this.alarmTypeModel.findByIdAndUpdate(id, dto, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      throw new NotFoundException(`Alarm Type with ID ${id} not found`);
    }

    return {
      message: 'Alarm Type updated successfully',
      data: updated,
    };
  }

  /**
   * Add a new alarm configuration.
   * @param dto The data transfer object containing alarm details.
   * @returns The created alarm.
   */

  async addAlarm(dto: ConfigAlarmDto) {
    // Determine conditionType from LogicConfiguration
    const conditionType = this.getConditionType(dto.LogicConfiguration);

    // Save trigger config ruleset
    const ruleset = new this.alarmsRulesSetModel({
      persistenceTime: dto.alarmTriggerConfig.persistenceTime,
      occursCount: dto.alarmTriggerConfig.occursCount,
      occursWithin: dto.alarmTriggerConfig.occursWithin,
      conditionType,
    });

    await ruleset.save();

    // Use Logics as-is without adding PG_PC_ prefix
    const enhancedLogics = dto.Logics.map((logic) => ({
      ...logic,
      // Remove the PG_PC_ prefix - just use the provided location as is
      alarmLocation: logic.alarmLocation,
    }));

    const alarm = new this.alarmsModel({
      alarmTypeId: new Types.ObjectId(dto.alarmTypeId),
      alarmName: dto.alarmName,
      Logics: enhancedLogics,
      LogicConfiguration: dto.LogicConfiguration,
      acknowledgementActions: dto.acknowledgementActions,
      alarmTriggerConfig: ruleset._id,
    });

    await alarm.save();

    return {
      message: 'Alarm added successfully',
      data: alarm,
    };
  }

  /**
   * Update an existing alarm.
   * @param dto The data transfer object containing updated alarm details.
   * @returns The updated alarm.
   */

  async updateAlarm(dto: UpdateAlarmDto) {
    const {
      alarmConfigId,
      alarmTriggerConfig,
      alarmTypeId,
      Logics,
      ...restUpdateData
    } = dto;

    if (!Types.ObjectId.isValid(alarmConfigId)) {
      throw new BadRequestException('Invalid alarmConfigId');
    }

    const existingAlarm = await this.alarmsModel.findById(alarmConfigId);
    if (!existingAlarm) {
      throw new NotFoundException(`Alarm with ID ${alarmConfigId} not found`);
    }

    const updateData: Partial<alarmsConfiguration> = { ...restUpdateData };

    // Handle alarmTypeId update
    if (alarmTypeId) {
      if (!Types.ObjectId.isValid(alarmTypeId)) {
        throw new BadRequestException('Invalid alarmTypeId');
      }
      updateData.alarmTypeId = new Types.ObjectId(alarmTypeId);
    }

    // Handle Logics update with ER_ prefix
    if (Logics && Array.isArray(Logics)) {
      const enhancedLogics = Logics.map((logic) => ({
        ...logic,
        alarmLocation: logic.alarmLocation.startsWith('ER_')
          ? logic.alarmLocation
          : `${logic.alarmLocation}`,
        thresholds: logic.thresholds || [],
      })) as Logic[];
      updateData.Logics = enhancedLogics;
    }

    // Handle alarmTriggerConfig update
    if (alarmTriggerConfig) {
      if (typeof alarmTriggerConfig === 'object') {
        let rulesetId = existingAlarm.alarmTriggerConfig?.toString();

        if (rulesetId && Types.ObjectId.isValid(rulesetId)) {
          const conditionType = this.getConditionType(
            dto.LogicConfiguration || existingAlarm.LogicConfiguration,
          );

          const rulesetUpdate: Partial<AlarmRulesSet> = {
            ...alarmTriggerConfig,
            conditionType,
          };

          await this.alarmsRulesSetModel.findByIdAndUpdate(
            rulesetId,
            { $set: rulesetUpdate },
            { new: true },
          );

          updateData.alarmTriggerConfig = new Types.ObjectId(rulesetId);
        } else {
          // If no ruleset exists, create a new one
          const conditionType = this.getConditionType(dto.LogicConfiguration);

          const newRuleset = new this.alarmsRulesSetModel({
            ...alarmTriggerConfig,
            conditionType,
          });
          await newRuleset.save();

          updateData.alarmTriggerConfig = newRuleset._id;
        }
      } else if (Types.ObjectId.isValid(alarmTriggerConfig)) {
        updateData.alarmTriggerConfig = new Types.ObjectId(alarmTriggerConfig);
      } else {
        throw new BadRequestException('Invalid alarmTriggerConfig');
      }
    }

    // Handle LogicConfiguration update
    if (dto.LogicConfiguration) {
      updateData.LogicConfiguration = dto.LogicConfiguration;

      // If alarmTriggerConfig is being updated separately, also update its conditionType
      if (alarmTriggerConfig && existingAlarm.alarmTriggerConfig) {
        const conditionType = this.getConditionType(dto.LogicConfiguration);

        await this.alarmsRulesSetModel.findByIdAndUpdate(
          existingAlarm.alarmTriggerConfig,
          { $set: { conditionType } },
          { new: true },
        );
      }
    }

    const updated = await this.alarmsModel
      .findByIdAndUpdate(alarmConfigId, { $set: updateData }, { new: true })
      .populate('alarmTypeId')
      .populate('alarmTriggerConfig')
      .lean();

    if (!updated) {
      throw new NotFoundException(
        `Alarm with ID ${alarmConfigId} could not be updated`,
      );
    }

    // Ensure referenced fields are preserved if not updated
    if (!updated.alarmTypeId) {
      updated.alarmTypeId = existingAlarm.alarmTypeId;
    }
    if (!updated.alarmTriggerConfig) {
      updated.alarmTriggerConfig = existingAlarm.alarmTriggerConfig;
    }
    if (!updated.Logics) {
      updated.Logics = existingAlarm.Logics;
    }
    if (!updated.LogicConfiguration) {
      updated.LogicConfiguration = existingAlarm.LogicConfiguration;
    }

    // Transform the response to match add alarm format
    const transformedData = {
      alarmTypeId: updated.alarmTypeId?._id || updated.alarmTypeId,
      alarmName: updated.alarmName,
      Logics: updated.Logics,
      LogicConfiguration: updated.LogicConfiguration,
      acknowledgementActions: updated.acknowledgementActions,
      alarmTriggerConfig:
        updated.alarmTriggerConfig?._id || updated.alarmTriggerConfig,
      _id: updated._id,
      __v: updated.__v,
    };

    return {
      message: 'Alarm updated successfully',
      data: transformedData,
    };
  }

  /**
   * Delete an existing alarm.
   * @param alarmConfigId The ID of the alarm to delete.
   * @returns A message indicating the result of the deletion.
   */
  async deleteAlarmByConfigId(alarmConfigId: string) {
    if (!Types.ObjectId.isValid(alarmConfigId)) {
      throw new BadRequestException('Invalid AlarmConfigId');
    }

    const objectId = new Types.ObjectId(alarmConfigId);

    const existingEvent = await this.alarmsEventModel
      .findOne({ alarmConfigId: objectId })
      .populate('alarmOccurrences')
      .lean();

    if (existingEvent && existingEvent.alarmOccurrences?.length > 0) {
      throw new BadRequestException(
        `Cannot delete: AlarmConfig has ${existingEvent.alarmOccurrences.length} related occurrences`,
      );
    }

    const deleted = await this.alarmsModel.findByIdAndDelete(objectId).lean();

    if (!deleted) {
      throw new NotFoundException(`Alarm with ID ${alarmConfigId} not found`);
    }

    return {
      message: 'Alarm Configuration deleted successfully',
      data: deleted,
    };
  }

  /**
   * Delete an existing alarm type.
   * @param id The ID of the alarm type to delete.
   * @returns A message indicating the result of the deletion.
   */
  async deleteAlarmType(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid alarm type ID');
    }

    const objectId = new Types.ObjectId(id);
    const relatedAlarmsCount = await this.alarmsModel.countDocuments({
      alarmTypeId: objectId,
    });

    if (relatedAlarmsCount > 0) {
      const relatedAlarms = await this.alarmsModel
        .find({ alarmTypeId: objectId })
        .select('alarmName')
        .lean();

      throw new BadRequestException({
        message: `Cannot delete AlarmType. It is used in ${relatedAlarmsCount} alarms.`,
        count: relatedAlarmsCount,
        alarms: relatedAlarms.map((a) => a.alarmName),
      });
    }

    const deleted = await this.alarmTypeModel.findByIdAndDelete(id);

    if (!deleted) {
      throw new NotFoundException(`Alarm Type with ID ${id} not found`);
    }

    return {
      message: 'Alarm Type deleted successfully',
      data: deleted,
    };
  }

  /**
   * Get all alarm configurations.
   * @returns An object containing a message and the array of alarms.
   */
  async getAllAlarmsConfigs() {
    const alarms = await this.alarmsModel
      .find()
      .populate<{ alarmTypeId: AlarmsType }>('alarmTypeId')
      .populate<{ alarmTriggerConfig: AlarmRulesSet }>('alarmTriggerConfig')
      .lean()
      .exec();

    // Transform the alarms to ensure proper typing
    const transformedAlarms = alarms.map((alarm) => ({
      ...alarm,
      Logics: alarm.Logics || [],
      LogicConfiguration: alarm.LogicConfiguration || {
        'All-True': false,
        AnyOneTrue: false,
      },
    }));

    return {
      message: 'Alarms fetched successfully',
      data: transformedAlarms as unknown as (alarmsConfiguration & {
        alarmTypeId: AlarmsType;
        alarmTriggerConfig: AlarmRulesSet;
      })[],
    };
  }

  /**
   * Get alarms by type.
   * @param alarmTypeId The ID of the alarm type to retrieve alarms for.
   * @returns An object containing a message and the array of alarms.
   */
  async getAlarmsByType(alarmTypeId: string): Promise<{
    message: string;
    data: (alarmsConfiguration & {
      alarmTypeId: AlarmsType;
      alarmTriggerConfig: AlarmRulesSet;
    })[];
  }> {
    if (!Types.ObjectId.isValid(alarmTypeId)) {
      throw new BadRequestException('Invalid alarmTypeId');
    }

    const alarms = await this.alarmsModel
      .find({ alarmTypeId: new Types.ObjectId(alarmTypeId) })
      .populate<{ alarmTypeId: AlarmsType }>('alarmTypeId')
      .populate<{ alarmTriggerConfig: AlarmRulesSet }>('alarmTriggerConfig')
      .lean()
      .exec();

    if (!alarms || alarms.length === 0) {
      throw new NotFoundException(`No alarms found for typeId ${alarmTypeId}`);
    }

    // Transform the alarms to ensure proper typing
    const transformedAlarms = alarms.map((alarm) => ({
      ...alarm,
      Logics: alarm.Logics || [],
      LogicConfiguration: alarm.LogicConfiguration || {
        'All-True': false,
        AnyOneTrue: false,
      },
    }));

    return {
      message: 'Alarms fetched successfully',
      data: transformedAlarms as unknown as (alarmsConfiguration & {
        alarmTypeId: AlarmsType;
        alarmTriggerConfig: AlarmRulesSet;
      })[],
    };
  }

  /**
   * Get the alarm type associated with a specific alarm.
   * @param alarmId The ID of the alarm to retrieve the type for.
   * @returns An object containing a message and the alarm type.
   */
  async getAlarmTypeByAlarmId(
    alarmId: string,
  ): Promise<{ message: string; data: AlarmsType }> {
    const alarm = await this.alarmsModel
      .findById(alarmId)
      .populate<{ alarmTypeId: AlarmsType }>('alarmTypeId')
      .lean()
      .exec();

    if (!alarm) {
      throw new NotFoundException(`Alarm with ID ${alarmId} not found`);
    }

    if (!alarm.alarmTypeId) {
      throw new NotFoundException(`AlarmType not found for alarmId ${alarmId}`);
    }

    return {
      message: 'AlarmType fetched successfully',
      data: alarm.alarmTypeId as AlarmsType,
    };
  }

  private evaluateCondition(
    value: number,
    operator: string,
    threshold: number,
  ): boolean {
    switch (operator) {
      case '>':
        return value > threshold;
      case '<':
        return value < threshold;
      case '>=':
        return value >= threshold;
      case '<=':
        return value <= threshold;
      case '==':
        return value === threshold;
      case '!=':
        return value !== threshold;
      default:
        return false;
    }
  }

  private evaluateLogic(value: number, logic: Logic): boolean {
    if (!logic || !Array.isArray(logic.thresholds) || !logic.thresholds.length)
      return false;

    // Evaluate all thresholds in this logic
    const thresholdResults = logic.thresholds.map((threshold) =>
      this.evaluateCondition(value, threshold.operator, threshold.value),
    );

    // All thresholds in a logic must be true (AND condition within a logic)
    return thresholdResults.every(Boolean);
  }

  private getConditionType(
    logicConfiguration?: { 'All-True'?: boolean; AnyOneTrue?: boolean },
  ): '&&' | '||' | 'null' {
    if (logicConfiguration?.['All-True'] === true) {
      return '&&';
    }

    if (logicConfiguration?.AnyOneTrue === true) {
      return '||';
    }

    return 'null';
  }

  private getTriggeredThreshold(
    value: number,
    thresholds: Threshold[],
  ): Threshold | null {
    if (!thresholds || !thresholds.length) return null;

    return (
      thresholds.find((t) => {
        return this.evaluateCondition(value, t.operator, t.value);
      }) ?? null
    );
  }

  private async generateCustomAlarmId(): Promise<string | null> {
    const last = await this.alarmOccurrenceModel
      .findOne({}, { alarmID: 1 })
      .sort({ createdAt: -1 })
      .lean();

    if (!last || !last.alarmID) {
      return 'ALM01-001';
    }

    const match = last.alarmID.match(/ALM(\d+)-(\d+)/);

    if (!match) {
      return 'ALM01-001';
    }

    const [, majorStr, minorStr] = match;
    let major = parseInt(majorStr, 10);
    let minor = parseInt(minorStr, 10);

    minor++;

    if (minor > 999) {
      minor = 1;
      major++;
    }

    if (major > 99) {
      return null;
    }

    const newMajor = major.toString().padStart(2, '0');
    const newMinor = minor.toString().padStart(3, '0');

    return `ALM${newMajor}-${newMinor}`;
  }

  /**
   * Deactivate alarm occurrences for configurations that are no longer active.
   * This updates the last occurrence, duration, and resolve time.
   */

  private async deactivateResolvedAlarms(activeConfigIds: Set<string>) {
    const now = new Date();

    const activeEvents = await this.alarmsEventModel
      .find({})
      .populate({
        path: 'alarmOccurrences',
        model: AlarmOccurrence.name,
        match: { alarmStatus: true },
      })
      .exec();

    for (const ev of activeEvents) {
      const cfgId = ev.alarmConfigId?.toString?.() ?? '';

      if (!activeConfigIds.has(cfgId)) {
        ev.alarmLastOccurrence = now;

        if (ev.alarmFirstOccurrence) {
          const triggerTime = new Date(ev.alarmFirstOccurrence).getTime();
          const currentTime = now.getTime();
          const durationSec = Math.floor((currentTime - triggerTime) / 1000);

          if (ev.alarmOccurrences?.length) {
            const lastOccurrence = ev.alarmOccurrences[ev.alarmOccurrences.length - 1];
            const lastOccurrenceId = lastOccurrence._id ?? lastOccurrence;

            try {
              await this.alarmOccurrenceModel.findByIdAndUpdate(
                lastOccurrenceId,
                {
                  alarmStatus: false,
                  alarmDuration: durationSec,
                  resolveTime: now, // - Set resolve time
                },
              );
            } catch (err: any) {
              this.logger.error(
                'Failed to update occurrence duration',
                err?.message ?? err,
                err,
              );
            }
          }
        }

        await ev.save();
      }
    }
  }

  /**
   * Process all active alarms by fetching data from configured endpoints
   * @returns Array of triggered alarms
   */


  async processActiveAlarms() {
    const allPayloads = await this.fetchAlarmPayloads();

    this.logger.debug('Active alarm payload count', {
      count: Object.keys(allPayloads).length,
      sampleKeys: Object.keys(allPayloads).slice(0, 25),
    });

    if (!Object.keys(allPayloads).length) {
      return [];
    }

    const [alarms, activeOccurrences] = await Promise.all([
      this.alarmsModel.find().populate('alarmTypeId').lean(),
      this.alarmOccurrenceModel.find({ alarmStatus: true }).lean(),
    ]);

    this.logger.debug('Loaded alarm configs', { count: alarms.length });

    const triggeredAlarms: TriggeredAlarmResponse[] = [];
    const activeConfigIds = new Set<string>();

    for (const alarm of alarms as AlarmConfigDocument[]) {
      if (!alarm.Logics?.length) continue;

      const activeOccurrence = activeOccurrences.find(
        (o) => o.alarmConfigId?.toString() === alarm._id.toString(),
      );

      if (await this.isAlarmSnoozed(activeOccurrence)) {
        continue;
      }

      const logicStatuses = alarm.Logics.map((logic: Logic) =>
        this.evaluateLogicStatus(logic, allPayloads),
      );

      const shouldTrigger = this.shouldTriggerAlarm(
        alarm.LogicConfiguration,
        logicStatuses,
      );

      if (!shouldTrigger) {
        if (activeOccurrence) {
          await this.resolveActiveOccurrence(activeOccurrence);
        }
        continue;
      }

      const occurrence = await this.createOrUpdateActiveOccurrence(
        alarm,
        activeOccurrence,
        logicStatuses,
      );

      if (!occurrence) {
        continue;
      }

      activeConfigIds.add(alarm._id.toString());
      triggeredAlarms.push(
        this.buildTriggeredAlarmResponse(alarm, occurrence, logicStatuses),
      );
    }

    await this.deactivateResolvedAlarms(activeConfigIds);
    return triggeredAlarms;
  }

  private async fetchAlarmPayloads(): Promise<Record<string, number>> {
    const alarmsLinksStr = process.env.NODERED_URL;
    this.logger.debug(`NODERED_URL loaded: ${!!alarmsLinksStr}`);

    if (!alarmsLinksStr) {
      throw new BadRequestException('NODERED_URL not configured');
    }

    let alarmsLinks: string[] = [];

    try {
      alarmsLinks = JSON.parse(alarmsLinksStr);
    } catch {
      alarmsLinks = alarmsLinksStr
        .split(',')
        .map((l) => l.trim())
        .filter(Boolean);
    }

    const allPayloads: Record<string, number> = {};

    const fetchPromises = alarmsLinks.map(async (link) => {
      try {
        const resp = await firstValueFrom(
          this.httpService.get(link, { timeout: 10000 }),
        );
        return resp.data;
      } catch (err: any) {
        this.logger.error('Fetch error', err?.message ?? err, err);
        return null;
      }
    });

    const results = await Promise.all(fetchPromises);

    results.forEach((rawData, index) => {
      if (!rawData) {
        this.logger.warn(`Payload fetch returned empty for link index ${index}: ${alarmsLinks[index]}`);
        return;
      }
      this.logger.debug(`Payload fetched successfully for link index ${index}: ${alarmsLinks[index]}`);
      this.logger.debug(`Payload type for link index ${index}: ${Array.isArray(rawData) ? 'array' : typeof rawData}`);
      this.processDataStructure(rawData, allPayloads);
    });

    this.logger.debug(`Aggregated payload count after processing: ${Object.keys(allPayloads).length}`);
    return allPayloads;
  }

  private async isAlarmSnoozed(
    activeOccurrence?: AlarmsOccurrenceDocument | null | undefined,
  ): Promise<boolean> {
    if (!activeOccurrence?.alarmSnooze || !activeOccurrence?.snoozeAt) {
      return false;
    }

    const snoozeEnd = new Date(activeOccurrence.snoozeAt);
    snoozeEnd.setMinutes(
      snoozeEnd.getMinutes() + (activeOccurrence.snoozeDuration || 0),
    );

    if (new Date() < snoozeEnd) {
      return true;
    }

    await this.alarmOccurrenceModel.updateOne(
      { _id: activeOccurrence._id },
      { $set: { alarmSnooze: false } },
    );

    return false;
  }

  private evaluateLogicStatus(
    logic: Logic,
    payloads: PayloadMap,
  ): LogicEvaluationStatus {
    const matched = this.findMatchingData(payloads, logic);
    const matchedValue = matched?.value;
    const triggeredThreshold =
      matchedValue !== undefined
        ? this.getTriggeredThreshold(matchedValue, logic.thresholds)
        : null;

    const status: LogicEvaluationStatus = {
      alarmLocation: logic.alarmLocation,
      alarmSubLocation: logic.alarmSubLocation,
      alarmDevice: logic.alarmDevice,
      alarmParameter: logic.alarmParameter,
      value: matchedValue,
      threshold: triggeredThreshold ?? undefined,
      isTriggered: !!triggeredThreshold,
    };

    this.logger.debug('Logic evaluation', {
      location: logic.alarmLocation,
      subLocation: logic.alarmSubLocation,
      device: logic.alarmDevice,
      parameter: logic.alarmParameter,
      matchedKey: matched?.key || null,
      matchedValue,
      threshold: triggeredThreshold,
      isTriggered: status.isTriggered,
    });

    return status;
  }

  private shouldTriggerAlarm(
    logicConfiguration: any,
    logicStatuses: Array<{ isTriggered: boolean }>,
  ): boolean {
    if (logicConfiguration?.['All-True']) {
      return logicStatuses.every((status) => status.isTriggered);
    }

    return logicStatuses.some((status) => status.isTriggered);
  }

  private async resolveActiveOccurrence(
    activeOccurrence: AlarmsOccurrenceDocument,
  ) {
    const triggerTime = new Date(activeOccurrence.date).getTime();
    const durationInSeconds = Math.floor((Date.now() - triggerTime) / 1000);

    await this.alarmOccurrenceModel.updateOne(
      { _id: activeOccurrence._id },
      {
        $set: {
          alarmStatus: false,
          alarmDuration: durationInSeconds,
          resolveTime: new Date(),
        },
      },
    );
  }

  private async createOrUpdateActiveOccurrence(
    alarm: AlarmConfigDocument,
    activeOccurrence: AlarmsOccurrenceDocument | null | undefined,
    logicStatuses: LogicEvaluationStatus[],
  ): Promise<AlarmsOccurrenceDocument | null> {
    if (!activeOccurrence) {
      return await this.alarmOccurrenceModel.create({
        alarmConfigId: alarm._id,
        alarmID: alarm._id.toString(),
        alarmStatus: true,
        logicStatuses,
        date: new Date(),
        alarmDuration: 0,
      });
    }

    await this.alarmOccurrenceModel.updateOne(
      { _id: activeOccurrence._id },
      {
        $set: {
          logicStatuses,
          alarmDuration: this.calculateDuration(activeOccurrence.date),
        },
      },
    );

    return this.alarmOccurrenceModel.findById(activeOccurrence._id) as Promise<AlarmsOccurrenceDocument>;
  }

  private buildTriggeredAlarmResponse(
    alarm: AlarmConfigDocument,
    occurrence: AlarmsOccurrenceDocument,
    logicStatuses: LogicEvaluationStatus[],
  ): TriggeredAlarmResponse {
    return {
      alarmOccurrenceId: occurrence._id,
      alarmOccurenceId: occurrence._id,
      alarmName: alarm.alarmName,
      alarmStatus: true,
      alarmType: (alarm.alarmTypeId as AlarmsType)?.type,
      priority: (alarm.alarmTypeId as AlarmsType)?.priority,
      triggeredAt: occurrence.date,
      snooze: occurrence.alarmSnooze || false,
      alarmAcknowledgeStatus: occurrence.alarmAcknowledgeStatus,
      thresholds: logicStatuses
        .filter((l) => l.isTriggered)
        .map((l) => ({
          threshold: l.threshold,
          value: l.value,
          location: l.alarmLocation,
          device: l.alarmDevice,
          parameter: l.alarmParameter,
        })),
    };
  }

  async getAllSuffixes(): Promise<string[]> {
    try {
      const suffixes = new Set<string>();

      Object.values(paramsMapping).forEach((fieldArray) => {
        fieldArray.forEach((field) => {
          const emMatch = field.match(/EM\d+_(.+)/);
          if (emMatch && emMatch[1]) {
            suffixes.add(emMatch[1]);
          } else {
            suffixes.add(field);
          }
        });
      });

      return Array.from(suffixes);
    } catch (error) {
      this.logger.error('Error extracting suffixes', error);
      return [];
    }
  }

  /**
   * Process different data structures (array, object, nested) into flat key-value pairs
   */
  private processDataStructure(
    data: any,
    target: Record<string, number>,
  ): void {
    if (Array.isArray(data)) {
      // Handle array of objects
      for (const item of data) {
        if (typeof item === 'object' && item !== null) {
          this.flattenObject(item, target);
        }
      }
    } else if (typeof data === 'object' && data !== null) {
      // Handle single object
      this.flattenObject(data, target);
    } else {
      this.logger.warn(`Unsupported data type: ${typeof data}`);
    }
  }

  /**
   * Flatten nested objects into key-value pairs, extracting only numeric values
   */
  private flattenObject(
    obj: any,
    target: Record<string, number>,
    prefix: string = '',
  ): void {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        const fullKey = prefix ? `${prefix}_${key}` : key;

        if (typeof value === 'number' && !isNaN(value)) {
          // Store numeric value
          target[fullKey] = value;
        } else if (typeof value === 'object' && value !== null) {
          // Recursively flatten nested objects
          this.flattenObject(value, target, fullKey);
        } else if (typeof value === 'boolean') {
          // Convert boolean to number (0 or 1)
          target[fullKey] = value ? 1 : 0;
        }
        // Skip strings, null, undefined
      }
    }
  }

  /**
   * Match a payload key to the alarm logic using only location and parameter.
   *
   * - locationSegments are matched in order anywhere in the key.
   * - parameterSegments are matched only at the end of the key (suffix match).
   * - keys are split on non-alphanumeric characters, so underscore-separated payloads
   *   like PG_PC_Z1_GW0_PLC1_EM01_V_L1_N and U1_GW01_Voltage_AB both work.
   */
  private findMatchingData(
    payload: Record<string, number>,
    logic: Logic,
  ): { key: string; value: number } | null {
    const targetLocation = logic.alarmLocation?.toLowerCase().trim() || '';
    const targetParameter = logic.alarmParameter?.toLowerCase().trim() || '';

    const { locationSegments, parameterSegments } = this.buildTargetSegments(
      targetLocation,
      targetParameter,
    );

    this.logger.debug('Looking for alarm key match', {
      location: targetLocation,
      parameter: targetParameter,
      locationSegments,
      parameterSegments,
    });

    for (const [key, value] of Object.entries(payload)) {
      const keySegments = key
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((segment) => segment.length > 0);

      if (
        this.matchesPayloadKey(keySegments, locationSegments, parameterSegments)
      ) {
        this.logger.debug('Found match for logic', {
          logic: targetLocation,
          payloadKey: key,
          keySegments,
          locationSegments,
          parameterSegments,
        });
        return { key, value };
      }
    }

    this.logger.debug('No payload match found for logic', {
      location: targetLocation,
      parameter: targetParameter,
      locationSegments,
      parameterSegments,
    });

    return null;
  }

  /**
   * Build token segments for matching.
   *
   * - locationSegments are used for ordered matching anywhere in the payload key.
   * - parameterSegments are used for suffix matching.
   */
  private buildTargetSegments(
    targetLocation: string,
    targetParameter: string,
  ): {
    locationSegments: string[];
    parameterSegments: string[];
  } {
    const locationSegments = targetLocation
      ? targetLocation.split(/[_\s]+/).filter((s) => s.length > 0)
      : [];
    const parameterSegments = targetParameter
      ? targetParameter.split(/[_\s]+/).filter((s) => s.length > 0)
      : [];

    return { locationSegments, parameterSegments };
  }

  /**
   * Match a key using explicit delimiter-aware rules:
   * - must contain the location segments in order
   * - must end with the parameter segments
   */
  private matchesPayloadKey(
    keySegments: string[],
    locationSegments: string[],
    parameterSegments: string[],
  ): boolean {
    if (!locationSegments.length && !parameterSegments.length) {
      return false;
    }

    if (locationSegments.length) {
      if (!this.matchesOrderedSegments(keySegments, locationSegments)) {
        return false;
      }
    }

    if (parameterSegments.length) {
      if (!this.matchesSuffixSegments(keySegments, parameterSegments)) {
        return false;
      }
    }

    return true;
  }

  private matchesOrderedSegments(
    keySegments: string[],
    targetSegments: string[],
  ): boolean {
    let matchedIndex = 0;

    for (const segment of keySegments) {
      if (this.fuzzyMatch(segment, targetSegments[matchedIndex])) {
        matchedIndex += 1;
        if (matchedIndex === targetSegments.length) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Require that the payload key ends with the parameter segments.
   * This makes parameter matching much more precise for underscore-delimited keys.
   */
  private matchesSuffixSegments(
    keySegments: string[],
    parameterSegments: string[],
  ): boolean {
    if (parameterSegments.length > keySegments.length) {
      return false;
    }

    const startIndex = keySegments.length - parameterSegments.length;

    for (let i = 0; i < parameterSegments.length; i += 1) {
      if (
        !this.fuzzyMatch(keySegments[startIndex + i], parameterSegments[i])
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Fuzzy matching helper
   */
  private fuzzyMatch(part: string, target: string): boolean {
    if (!target) return true;

    // Exact match
    if (part === target) return true;

    // Case insensitive match
    if (part.toLowerCase() === target.toLowerCase()) return true;

    // Contains match
    if (part.includes(target) || target.includes(part)) return true;

    // Remove underscores and compare
    const partClean = part.replace(/_/g, '');
    const targetClean = target.replace(/_/g, '');
    if (partClean === targetClean) return true;

    return false;
  }

  async gethistoricalAlarms(filters: any = {}) {
    try {
      // Build base query for occurrences
      const occurrenceMatch: any = {};

      if (filters.alarmAcknowledgeStatus) {
        occurrenceMatch.alarmAcknowledgeStatus = filters.alarmAcknowledgeStatus;
      }

      if (filters.alarmStatus !== undefined) {
        occurrenceMatch.alarmStatus = filters.alarmStatus;
      }

      if (filters.range || filters.from || filters.to || filters.date) {
        const { start, end } = getTimeRange(filters as TimeRangePayload);
        occurrenceMatch.date = { $gte: new Date(start), $lte: new Date(end) };
      }

      // Step 1: Get filtered occurrences with basic population
      const occurrences = await this.alarmOccurrenceModel
        .find(occurrenceMatch)
        .populate({
          path: 'alarmAcknowledgedBy',
          select: '-password',
          model: 'Users',
        })
        .populate('alarmTypeId')
        .sort({ date: -1 })
        .lean();

      if (occurrences.length === 0) {
        return { data: [], total: 0 };
      }

      // - FIX: Calculate correct duration using resolveTime
      const now = new Date();
      const occurrencesWithCorrectDuration = occurrences.map((occ) => {
        const triggerTime = new Date(occ.date).getTime();
        const currentTime = now.getTime();

        let calculatedDuration = occ.alarmDuration || 0;

        if (occ.alarmStatus === true) {
          // Active alarm - real-time duration
          calculatedDuration = Math.floor((currentTime - triggerTime) / 1000);
        } else {
          // - Resolved alarm - use resolveTime if available
          let resolvedTime = currentTime;

          if (occ.resolveTime) {
            // - Use resolveTime (set once when alarm resolved)
            resolvedTime = new Date(occ.resolveTime).getTime();
          } else if (occ.updatedAt) {
            // Fallback to updatedAt
            resolvedTime = new Date(occ.updatedAt).getTime();
          }

          const actualDuration = Math.floor((resolvedTime - triggerTime) / 1000);
          calculatedDuration = actualDuration;
        }

        return {
          ...occ,
          alarmDuration: calculatedDuration,
        };
      });

      // Step 2: Get unique alarm config IDs from occurrences
      const configIds = [
        ...new Set(
          occurrencesWithCorrectDuration
            .map((occ) => occ.alarmConfigId?.toString())
            .filter(Boolean),
        ),
      ].map((id) => new Types.ObjectId(id));

      // Step 3: Get alarm configurations with all needed population
      const alarmConfigs = await this.alarmsModel
        .find({ _id: { $in: configIds } })
        .populate('alarmTypeId')
        .populate('alarmTriggerConfig')
        .lean();

      // Create a map for quick lookup
      const configMap = new Map();
      alarmConfigs.forEach((config) => {
        configMap.set(config._id.toString(), config);
      });

      // Step 4: Group occurrences by alarm config
      const occurrencesByConfig = new Map();
      occurrencesWithCorrectDuration.forEach((occurrence) => {
        const configId = occurrence.alarmConfigId?.toString();
        if (configId && configMap.has(configId)) {
          if (!occurrencesByConfig.has(configId)) {
            occurrencesByConfig.set(configId, []);
          }
          occurrencesByConfig.get(configId).push(occurrence);
        }
      });

      // Step 5: Build final response
      const result = Array.from(occurrencesByConfig.entries()).map(
        ([configId, occs]) => {
          const config = configMap.get(configId);

          return {
            alarmConfigId: config,
            alarmOccurrenceCount: occs.length,
            alarmOccurrences: occs,
            alarmFirstOccurrence:
              occs.length > 0 ? occs[occs.length - 1].date : null,
            alarmLastOccurrence: occs.length > 0 ? occs[0].date : null,
            logicStatusSummary: config?.Logics?.map((logic) => {
              const triggeredOcc = occs.find((occ) =>
                occ.logicStatuses?.some(
                  (ls) =>
                    ls.alarmLocation === logic.alarmLocation &&
                    ls.alarmSubLocation === logic.alarmSubLocation &&
                    ls.alarmDevice === logic.alarmDevice &&
                    ls.alarmParameter === logic.alarmParameter &&
                    ls.isTriggered,
                ),
              );
              return {
                ...logic,
                lastTriggered: triggeredOcc?.date,
                triggeredCount: occs.filter((occ) =>
                  occ.logicStatuses?.some(
                    (ls) =>
                      ls.alarmLocation === logic.alarmLocation &&
                      ls.alarmSubLocation === logic.alarmSubLocation &&
                      ls.alarmDevice === logic.alarmDevice &&
                      ls.alarmParameter === logic.alarmParameter &&
                      ls.isTriggered,
                  ),
                ).length,
              };
            }),
          };
        },
      );

      // Sort by most recent occurrence
      result.sort(
        (a, b) =>
          new Date(b.alarmLastOccurrence || 0).getTime() -
          new Date(a.alarmLastOccurrence || 0).getTime(),
      );

      return {
        data: result,
        total: result.length,
      };
    } catch (error) {
      this.logger.error('Error fetching historical alarms', error);
      throw error;
    }
  }


  private calculateDuration(triggerDate: Date): number {
    return Math.floor((Date.now() - new Date(triggerDate).getTime()) / 1000);
  }

  /**
   * Get all unique acknowledgement actions
   * @returns Array of unique acknowledgement actions
   */
  async acknowledgementActions() {
    const results = await this.alarmsModel.find(
      {},
      { acknowledgementActions: 1, _id: 0 },
    );
    const merged = results.flatMap((r) => r.acknowledgementActions || []);
    return [...new Set(merged)];
  }

  /**
   * Acknowledge a single alarm occurrence
   * @param occurrenceId ID of the occurrence to acknowledge
   * @param action Acknowledgement action
   * @param acknowledgedBy User ID of the person acknowledging
   * @returns Updated occurrence and parent alarm
   */



  async acknowledgeOne(
    occurrenceId: string,
    action: string,
    acknowledgedBy: string,
  ) {
    // 1. Validate IDs
    if (!Types.ObjectId.isValid(occurrenceId)) {
      throw new BadRequestException('Invalid occurrence ID');
    }

    if (!Types.ObjectId.isValid(acknowledgedBy)) {
      throw new BadRequestException('Invalid acknowledgedBy ID');
    }

    // 2. Find occurrence
    const occurrence = await this.alarmOccurrenceModel.findById(occurrenceId);
    if (!occurrence) {
      throw new NotFoundException('Occurrence not found');
    }

    if (occurrence.alarmAcknowledgeStatus === 'Acknowledged') {
      throw new BadRequestException('This occurrence is already acknowledged');
    }

    // 3. Update occurrence
    const now = new Date();
    const delay = (now.getTime() - new Date(occurrence.date).getTime()) / 1000;
    const durationInSeconds = this.calculateDuration(occurrence.date);

    occurrence.alarmAcknowledgeStatus = 'Acknowledged';
    occurrence.alarmAcknowledgmentAction = action;
    occurrence.alarmAcknowledgedBy = new Types.ObjectId(acknowledgedBy);
    occurrence.alarmAcknowledgedDelay = delay;
    occurrence.alarmDuration = durationInSeconds;
    await occurrence.save();

    // 4. Update parent alarm
    const parentAlarm = await this.alarmsEventModel.findOne({
      alarmOccurrences: occurrence._id,
    });

    if (parentAlarm) {
      const acknowledgedCount = await this.alarmOccurrenceModel.countDocuments({
        _id: { $in: parentAlarm.alarmOccurrences },
        alarmAcknowledgeStatus: 'Acknowledged',
      });

      parentAlarm.alarmAcknowledgementStatusCount = acknowledgedCount;
      await parentAlarm.save();
    }

    // 5. Fetch user details
    const user = await this.userModel
      .findById(acknowledgedBy)
      .select('name email')
      .lean();

    // 6. Build occurrence response
    const occurrenceObj = occurrence.toObject();
    occurrenceObj.alarmAcknowledgedBy = user || null;

    // 7. Build parent alarm response
    let populatedParentAlarm: any = null;

    if (parentAlarm) {
      const parentAlarmObj = parentAlarm.toObject();

      const populatedOccurrences = await Promise.all(
        (parentAlarmObj.alarmOccurrences || []).map(async (occId: any) => {
          const occ = await this.alarmOccurrenceModel
            .findById(occId)
            .lean();

          let userDetail = null;
          if (occ?.alarmAcknowledgedBy) {
            userDetail = await this.userModel
              .findById(occ.alarmAcknowledgedBy)
              .select('name email')
              .lean();
          }

          return {
            ...occ,
            alarmAcknowledgedBy: userDetail
          };
        })
      );

      populatedParentAlarm = {
        ...parentAlarmObj,
        alarmOccurrences: populatedOccurrences
      };
    }

    return {
      updatedOccurrences: [occurrenceObj],
      parentAlarms: populatedParentAlarm ? [populatedParentAlarm] : [],
    };
  }
  /**
   * Acknowledge multiple occurrences at once
   * @param occurrenceIds Array of occurrence IDs to acknowledge
   * @param acknowledgedBy User ID of the person acknowledging
   * @returns Updated occurrences and parent alarms
   */

  async acknowledgeMany(occurrenceIds: string[], acknowledgedBy: string) {
    // 1. Validate
    if (!Types.ObjectId.isValid(acknowledgedBy)) {
      throw new BadRequestException('Invalid acknowledgedBy ID format');
    }

    const acknowledgedByObjectId = new Types.ObjectId(acknowledgedBy);
    const now = new Date();

    const objectIds = occurrenceIds.map((id) => {
      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestException(`Invalid occurrence ID: ${id}`);
      }
      return new Types.ObjectId(id);
    });

    // Get occurrences first to calculate duration
    const occurrencesToUpdate = await this.alarmOccurrenceModel.find({
      _id: { $in: objectIds },
      alarmAcknowledgeStatus: { $ne: 'Acknowledged' },
    });

    // Update each occurrence with correct duration
    for (const occurrence of occurrencesToUpdate) {
      const triggerTime = new Date(occurrence.date).getTime();
      const currentTime = now.getTime();
      const durationInSeconds = Math.floor((currentTime - triggerTime) / 1000);
      const delay = (currentTime - triggerTime) / 1000;

      await this.alarmOccurrenceModel.updateOne(
        { _id: occurrence._id },
        {
          $set: {
            alarmAcknowledgeStatus: 'Acknowledged',
            alarmAcknowledgmentAction: 'Auto Mass Acknowledged',
            alarmAcknowledgedBy: acknowledgedByObjectId,
            alarmAcknowledgedDelay: delay,
            alarmDuration: durationInSeconds,
          },
        },
      );
    }

    // Get user details once
    const user = await this.userModel
      .findById(acknowledgedBy)
      .select('name email')
      .lean();

    // Get all occurrences with aggregation
    const occurrences = await this.alarmOccurrenceModel.aggregate([
      { $match: { _id: { $in: objectIds } } },
      {
        $lookup: {
          from: 'users',
          localField: 'alarmAcknowledgedBy',
          foreignField: '_id',
          as: 'acknowledgedByUser'
        }
      },
      {
        $unwind: {
          path: '$acknowledgedByUser',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          'alarmAcknowledgedBy': {
            _id: '$acknowledgedByUser._id',
            name: '$acknowledgedByUser.name',
            email: '$acknowledgedByUser.email'
          },
          date: 1,
          alarmID: 1,
          alarmStatus: 1,
          alarmConfigId: 1,
          logicStatuses: 1,
          alarmAcknowledgeStatus: 1,
          alarmAcknowledgmentAction: 1,
          alarmAcknowledgedDelay: 1,
          alarmAge: 1,
          alarmDuration: 1,
          alarmSnooze: 1,
          createdAt: 1,
          updatedAt: 1,
          resolveTime: 1, // Include resolveTime in response
        }
      }
    ]);

    // Update parent alarms
    const parentAlarms = await this.alarmsEventModel.find({
      alarmOccurrences: { $in: objectIds },
    });

    for (const parentAlarm of parentAlarms) {
      const acknowledgedCount = await this.alarmOccurrenceModel.countDocuments({
        _id: { $in: parentAlarm.alarmOccurrences },
        alarmAcknowledgeStatus: 'Acknowledged',
      });

      parentAlarm.alarmAcknowledgementStatusCount = acknowledgedCount;
      await parentAlarm.save();
    }

    // Get parent alarms with populated occurrences
    const populatedParentAlarms = await this.alarmsEventModel
      .find({ alarmOccurrences: { $in: objectIds } })
      .populate({
        path: 'alarmOccurrences',
        populate: {
          path: 'alarmAcknowledgedBy',
          select: 'name email'
        }
      })
      .lean();

    return {
      updatedOccurrences: occurrences,
      parentAlarms: populatedParentAlarms,
    };
  }

  /**
   * Snooze alarm occurrences
   * @param snoozeDto Snooze data transfer object
   * @returns Success message
   */
  async snoozeAlarm(dto: SnoozeDto) {
    const { ids, alarmSnooze, snoozeDuration, snoozeAt } = dto;

    // Validate IDs
    for (const id of ids) {
      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestException(`Invalid occurrence ID: ${id}`);
      }
    }

    const objectIds = ids.map((id) => new Types.ObjectId(id));
    const snoozeTimestamp = new Date(snoozeAt);

    if (Number.isNaN(snoozeTimestamp.getTime())) {
      throw new BadRequestException('Invalid snoozeAt date');
    }

    const occurrences = await this.alarmOccurrenceModel.find({
      _id: { $in: objectIds },
    });

    if (!occurrences.length) {
      throw new NotFoundException('No alarms found');
    }

    for (const occurrence of occurrences) {
      const durationInSeconds = this.calculateDuration(occurrence.date);

      await this.alarmOccurrenceModel.updateOne(
        { _id: occurrence._id },
        {
          $set: {
            alarmSnooze,
            snoozeDuration,
            snoozeAt: snoozeTimestamp,
            alarmDuration: durationInSeconds,
          },
        },
      );
    }

    return {
      message: 'Alarm snoozed successfully',
    };
  }

  async getParamOptions(category?: string) {
    let query = {};

    if (category) {
      query = { category: category };
    }

    const docs = await this.connection
      .collection('params')
      .find(query)
      .project({ _id: 0, options: 1, category: 1 })
      .toArray();

    if (!docs || docs.length === 0) {
      if (category) {
        throw new HttpException(
          `Parameter options not found for category: ${category}`,
          404,
        );
      }
      return [];
    }

    // If multiple categories requested, return array of all
    // If specific category requested, return just its options
    if (category) {
      return docs[0].options;
    }

    return docs;
  }
}
