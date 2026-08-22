import { Module } from '@nestjs/common';
import { CalendarModule } from '../calendar/calendar.module';
import { MailModule } from '../mail/mail.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [CalendarModule, MailModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
