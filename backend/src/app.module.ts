import { Module } from '@nestjs/common'

import { InfraAppModule } from './apps/infra/infra-app.module'

@Module({
  imports: [InfraAppModule]
})
export class AppModule {}
