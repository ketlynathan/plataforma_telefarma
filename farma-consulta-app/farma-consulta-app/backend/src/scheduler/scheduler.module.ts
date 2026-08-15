import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerService } from './scheduler.service';
import { MailModule } from '../mail/mail.module';
import { EmergencyModule } from '../emergency/emergency.module';

@Module({
  imports: [ScheduleModule.forRoot(), MailModule, EmergencyModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
