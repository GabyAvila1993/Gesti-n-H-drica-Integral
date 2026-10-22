import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { visionConfig, type VisionConfig } from '../core/config/app.config';
import { validateUploadedImage } from '../core/security/image-upload.validator';
import { UrbanAnalysisService } from './application/urban-analysis.service';
import { CreateUrbanAlertDto } from './dto/create-urban-alert.dto';
import { UrbanAlertsQueryDto } from './dto/urban-alerts-query.dto';
import type { VisionImageInput } from './providers/vision-provider.interface';

@Controller('urban')
export class UrbanChannelsController {
  constructor(
    private readonly service: UrbanAnalysisService,
    @Inject(visionConfig.KEY) private readonly config: VisionConfig,
  ) {}

  /** Recibe una foto de acequia (multipart) con validación estricta de MIME, tamaño y firma binaria. */
  @Post('analyze')
  @UseInterceptors(FileInterceptor('image'))
  analyzeImage(@UploadedFile() file?: VisionImageInput) {
    validateUploadedImage(file, this.config.uploadMaxSizeMb);

    return this.service.analyzeImage({
      buffer: file!.buffer,
      originalname: file!.originalname,
      mimetype: file!.mimetype,
      size: file!.size,
    });
  }

  /** Registra una alerta de obstrucción de acequia a partir de una inspección analizada. */
  @Post('alerts')
  createAlert(@Body() dto: CreateUrbanAlertDto) {
    return this.service.createAlert(dto);
  }

  /** Lista las alertas de acequias registradas, filtrables por municipio o nivel de riesgo. */
  @Get('alerts')
  getAlerts(@Query() query: UrbanAlertsQueryDto) {
    return this.service.getAlerts(query);
  }
}
