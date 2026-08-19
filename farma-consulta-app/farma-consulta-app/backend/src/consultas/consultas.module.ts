import { Module } from '@nestjs/common';
import { ConsultasService } from './consultas.service';
import { JaasService } from './jaas.service';
import { ConsultasController } from './consultas.controller';
import { MailModule } from '../mail/mail.module';
import { CalendarModule } from '../calendar/calendar.module';

@Module({
  imports: [MailModule, CalendarModule],
  providers: [ConsultasService, JaasService],
  controllers: [ConsultasController],
  exports: [JaasService],
})
export class ConsultasModule {}
