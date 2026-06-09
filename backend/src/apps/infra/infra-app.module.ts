import { Module } from '@nestjs/common'

import { AppController } from '../../app.controller'
import { HealthModule } from '../../health/health.module'
import { InfraModule } from '../../infra/infra.module'

@Module({
  imports: [HealthModule, InfraModule],
  controllers: [AppController]
})
export class InfraAppModule {}
