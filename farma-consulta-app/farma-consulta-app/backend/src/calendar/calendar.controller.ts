import { Controller, Get, Query, Redirect, UseGuards, Post } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CalendarService } from './calendar.service';

@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('callback')
  @Redirect()
  async callback(@Query('code') code?: string, @Query('state') state?: string, @Query('error') error?: string) {
    if (error) {
      return { url: `${this.calendarService.frontendErrorUrl()}?calendar=error&reason=${encodeURIComponent(error)}` };
    }
    try {
      const url = await this.calendarService.handleOAuthCallback(code ?? '', state ?? '');
      return { url };
    } catch (callbackError) {
      return { url: `${this.calendarService.frontendErrorUrl()}?calendar=error&reason=oauth_callback` };
    }
  }

  @Get('status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('farmaceutico')
  status(@CurrentUser() user: any) {
    return this.calendarService.getStatus(user.id);
  }

  @Get('connect')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('farmaceutico')
  connect(@CurrentUser() user: any) {
    return this.calendarService.createAuthorizationUrl(user.id);
  }

  @Post('disconnect')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('farmaceutico')
  disconnect(@CurrentUser() user: any) {
    return this.calendarService.disconnect(user.id);
  }
}
