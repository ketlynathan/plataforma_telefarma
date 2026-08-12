import { Module } from '@nestjs/common';
import { ConsultasService } from './consultas.service';
import { ConsultasController } from './consultas.controller';

@Module({
  providers: [ConsultasService],
  controllers: [ConsultasController],
})
export class ConsultasModule {}
