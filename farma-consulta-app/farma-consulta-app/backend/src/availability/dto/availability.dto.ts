import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AvailabilitySlotDto {
  @IsInt()
  @Min(0)
  @Max(6)
  diaSemana: number; // 0=domingo ... 6=sábado

  @IsString()
  horaInicio: string; // "08:00"

  @IsString()
  horaFim: string; // "12:00"

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}

export class UpdateAvailabilityDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotDto)
  slots: AvailabilitySlotDto[];
}

export class CreateBlockoutDto {
  @IsDateString()
  inicio: string;

  @IsDateString()
  fim: string;

  @IsOptional()
  @IsString()
  motivo?: string;
}
