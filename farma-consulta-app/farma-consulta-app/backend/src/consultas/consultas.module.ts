import { Module } from '@nestjs/common';
import { ConsultasService } from './consultas.service';
import { JaasService } from './jaas.service';
import { ConsultasController } from './consultas.controller';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [MailModule],
  providers: [ConsultasService, JaasService],
  controllers: [ConsultasController],
})
export class ConsultasModule {}
