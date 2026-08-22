import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export const ATTENDANCE_TYPES = ['SIMPLES', 'USO_CONTINUO', 'URGENTE'] as const;

export class CreateProductPriceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  slug: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  nome: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsString()
  @IsIn(ATTENDANCE_TYPES)
  tipoAtendimento: string;

  @IsInt()
  @Min(1)
  @Max(100000000)
  valorCentavos: number;
}

export class UpdateProductPriceDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  nome?: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000000)
  valorCentavos?: number;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}

export class CreateCheckoutDto {
  @IsString()
  @IsNotEmpty()
  productPriceId: string;

  @IsString()
  @IsNotEmpty()
  farmaceuticoId: string;

  @IsString()
  @IsNotEmpty()
  data: string;

  @IsString()
  @IsNotEmpty()
  hora: string;

  @IsOptional()
  @IsString()
  observacoes?: string;
}

export class MercadoPagoWebhookDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  data?: { id?: string };

  @IsOptional()
  @IsString()
  action?: string;
}
