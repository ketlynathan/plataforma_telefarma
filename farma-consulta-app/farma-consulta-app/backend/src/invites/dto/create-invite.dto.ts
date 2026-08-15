import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateInviteDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;
}

export class CompleteInviteDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  nome: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  senha: string;

  @IsOptional()
  @IsString()
  telefone?: string;
}
