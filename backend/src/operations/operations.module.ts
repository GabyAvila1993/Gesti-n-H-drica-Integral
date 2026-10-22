import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { authConfig, type AuthConfig } from '../core/config/app.config';
import { UrbanChannelsModule } from '../urban-channels/urban-channels.module';
import { OperationsService } from './application/operations.service';
import { OperationsController } from './operations.controller';
import { JwtAuthGuard } from './security/jwt-rbac.guard';

@Module({
  imports: [
    UrbanChannelsModule,
    JwtModule.registerAsync({
      inject: [authConfig.KEY],
      useFactory: (config: AuthConfig) => ({
        secret: config.jwtSecret,
        signOptions: {
          expiresIn: '12h',
        },
      }),
    }),
  ],
  controllers: [OperationsController],
  providers: [OperationsService, JwtAuthGuard],
  exports: [OperationsService],
})
export class OperationsModule {}
