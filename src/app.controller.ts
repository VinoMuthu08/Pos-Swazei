import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @Public()
  getHello() {
    const result = this.appService.getHello();
    return { message: 'Health check successfully fetched', data: result };
  }
}
