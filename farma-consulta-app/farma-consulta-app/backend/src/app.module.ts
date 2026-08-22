import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ConsultasModule } from './consultas/consultas.module';
import { InvitesModule } from './invites/invites.module';
import { MailModule } from './mail/mail.module';
import { AvailabilityModule } from './availability/availability.module';
import { MessagesModule } from './messages/messages.module';
import { EmergencyModule } from './emergency/emergency.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { CalendarModule } from './calendar/calendar.module';
import { ProntuarioModule } from './prontuario/prontuario.module';
import { StorageModule } from './storage/storage.module';
import { PaymentsModule } from './payments/payments.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ConsultasModule,
    InvitesModule,
    MailModule,
    AvailabilityModule,
    MessagesModule,
    EmergencyModule,
    SchedulerModule,
    CalendarModule,
    ProntuarioModule,
    StorageModule,
    PaymentsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
