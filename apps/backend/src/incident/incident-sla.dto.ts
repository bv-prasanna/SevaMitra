import { IncidentSeverity } from '@prisma/client';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { INCIDENT_CATEGORIES } from './incident.dto';

export class CreateIncidentSlaPolicyDto {
  @IsString() @Matches(/\S/) @MaxLength(100)
  name: string;

  @IsEnum(IncidentSeverity)
  severity: IncidentSeverity;

  @IsOptional() @IsIn(INCIDENT_CATEGORIES)
  category?: (typeof INCIDENT_CATEGORIES)[number];

  @IsInt() @Min(1) @Max(525600)
  acknowledgeMinutes: number;

  @IsInt() @Min(1) @Max(525600)
  level1Minutes: number;

  @IsInt() @Min(1) @Max(525600)
  level2Minutes: number;

  @IsInt() @Min(1) @Max(525600)
  level3Minutes: number;

  @IsBoolean()
  businessHoursOnly: boolean;

  @IsInt() @Min(0) @Max(1439)
  businessStartMinute: number;

  @IsInt() @Min(1) @Max(1440)
  businessEndMinute: number;

  @IsArray() @ArrayUnique() @IsInt({ each: true }) @Min(0, { each: true }) @Max(6, { each: true })
  workingDays: number[];

  @IsString() @Matches(/\S/) @MaxLength(100)
  timezone: string;
}

export class CreateIncidentSlaHolidayDto {
  @IsDateString() @Matches(/^\\d{4}-\\d{2}-\\d{2}$/)
  date: string;

  @IsString() @Matches(/\S/) @MaxLength(120)
  label: string;
}
