import { Module } from '@nestjs/common';
import { EmergencyService } from './emergency.service';
import { EmergencyController } from './emergency.controller';
import { MailModule } from '../mail/mail.module';
import { ConsultasModule } from '../consultas/consultas.module';

@Module({
  imports: [MailModule, ConsultasModule],
  providers: [EmergencyService],
  controllers: [EmergencyController],
  exports: [EmergencyService],
})
export class EmergencyModule {}
