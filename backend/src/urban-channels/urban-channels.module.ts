import { BadRequestException, Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { visionConfig, type VisionConfig } from '../core/config/app.config';
import { ALLOWED_IMAGE_MIMES } from '../core/security/image-upload.validator';
import { UrbanAnalysisService } from './application/urban-analysis.service';
import { HuggingFaceVisionProvider } from './providers/huggingface-vision.provider';
import { MockVisionProvider } from './providers/mock-vision.provider';
import { RoboflowVisionProvider } from './providers/roboflow-vision.provider';
import { VISION_PROVIDER, type VisionProvider } from './providers/vision-provider.interface';
import { UrbanChannelsController } from './urban-channels.controller';

@Module({
  imports: [
    MulterModule.registerAsync({
      inject: [visionConfig.KEY],
      useFactory: (config: VisionConfig) => ({
        limits: {
          fileSize: config.uploadMaxSizeMb * 1024 * 1024,
          files: 1,
          fields: 5,
          parts: 6,
          headerPairs: 50,
        },
        fileFilter: (_req, file, callback) => {
          if (!ALLOWED_IMAGE_MIMES.has(file.mimetype)) {
            callback(
              new BadRequestException(
                `Formato de archivo no permitido (${file.mimetype}). Solo se aceptan imágenes JPG, PNG, WebP o SVG.`,
              ),
              false,
            );
            return;
          }
          callback(null, true);
        },
      }),
    }),
  ],
  controllers: [UrbanChannelsController],
  providers: [
    {
      provide: VISION_PROVIDER,
      inject: [visionConfig.KEY],
      useFactory: (config: VisionConfig): VisionProvider => {
        if (config.provider === 'huggingface' || Boolean(config.huggingface.token)) {
          return new HuggingFaceVisionProvider(config.huggingface);
        }
        if (config.provider === 'roboflow' || Boolean(config.roboflow.apiKey)) {
          return new RoboflowVisionProvider(config.roboflow);
        }
        return new MockVisionProvider();
      },
    },
    UrbanAnalysisService,
  ],
  exports: [UrbanAnalysisService],
})
export class UrbanChannelsModule {}
