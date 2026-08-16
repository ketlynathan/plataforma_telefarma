// backend/src/availability/availability.controller.ts
import {
  Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AvailabilityService } from './availability.service';
import { UpdateAvailabilityDto, CreateBlockoutDto } from './dto/availability.dto';

@Controller('availability')
@UseGuards(JwtAuthGuard, RolesGuard)   // ← adicionar esta linha
export class AvailabilityController {
  constructor(private readonly service: AvailabilityService) {}

  @Get('me')
  @Roles('farmaceutico')
  getMe(@CurrentUser() user: any) {
    return this.service.getMe(user.id);
  }

  @Put('me')
  @Roles('farmaceutico')
  updateMe(@CurrentUser() user: any, @Body() dto: UpdateAvailabilityDto) {
    return this.service.updateMe(user.id, dto.slots);
  }

  // GET /slots continua público — precisa ficar acessível sem guard
  @Get('slots')
  slots(@Query('data') data: string) {
    if (!data) throw new Error('data obrigatória (YYYY-MM-DD)');
    return this.service.getSlots(data);
  }

  @Post('blockouts')
  @Roles('farmaceutico')
  createBlockout(@CurrentUser() user: any, @Body() dto: CreateBlockoutDto) {
    return this.service.createBlockout(user.id, dto);
  }

  @Get('blockouts')
  @Roles('farmaceutico')
  getBlockouts(@CurrentUser() user: any) {
    return this.service.getBlockouts(user.id);
  }

  @Delete('blockouts/:id')
  @Roles('farmaceutico')
  deleteBlockout(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.deleteBlockout(id, user.id);
  }
}
