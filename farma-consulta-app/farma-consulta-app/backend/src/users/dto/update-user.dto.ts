import { IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @IsOptional() @IsString() nome?: string;
  @IsOptional() @IsString() telefone?: string;
  @IsOptional() @IsString() cpf?: string;
  @IsOptional() @IsString() dataNascimento?: string;
  @IsOptional() @IsString() cep?: string;
  @IsOptional() @IsString() endereco?: string;
  @IsOptional() @IsString() cidade?: string;
  @IsOptional() @IsString() estado?: string;
  @IsOptional() @IsString() doencasCronicas?: string;
  @IsOptional() @IsString() alergias?: string;
  @IsOptional() @IsString() medicamentosUso?: string;
}
