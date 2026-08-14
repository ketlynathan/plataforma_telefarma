import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'farma-consulta-backend',
      timestamp: new Date().toISOString(),
    };
  }
}
