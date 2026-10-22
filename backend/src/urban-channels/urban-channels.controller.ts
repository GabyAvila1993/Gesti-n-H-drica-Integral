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
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiTags,
  ApiUnsupportedMediaTypeResponse,
} from '@nestjs/swagger';
import { visionConfig, type VisionConfig } from '../core/config/app.config';
import { validateUploadedImage } from '../core/security/image-upload.validator';
import { UrbanAnalysisService } from './application/urban-analysis.service';
import { CreateUrbanAlertDto } from './dto/create-urban-alert.dto';
import { UrbanAlertsQueryDto } from './dto/urban-alerts-query.dto';
import type { VisionImageInput } from './providers/vision-provider.interface';

@ApiTags('Acequias Urbanas')
@Controller('urban')
export class UrbanChannelsController {
  constructor(
    private readonly service: UrbanAnalysisService,
    @Inject(visionConfig.KEY) private readonly config: VisionConfig,
  ) {}

  /** Recibe una foto de acequia (multipart) con validación estricta de MIME, tamaño y firma binaria. */
  @Post('analyze')
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({
    summary: 'Analizar fotografía de acequia mediante IA',
    description:
      'Recibe una imagen (`multipart/form-data`, campo `image`), valida su tamaño máximo, extensión, MIME type y firma binaria (magic bytes), y devuelve los objetos detectados con sus bounding boxes porcentuales, porcentaje de obstrucción y nivel de riesgo.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Fotografía de la acequia a inspeccionar (JPEG, PNG, WebP o SVG sin scripts)',
    schema: {
      type: 'object',
      required: ['image'],
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: 'Archivo de imagen de la acequia (máx. 8 MB por defecto)',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description:
      'Resultado del análisis con porcentaje de obstrucción, nivel de riesgo (BAJO, MEDIO, CRITICO) y lista de detecciones con bounding boxes.',
  })
  @ApiBadRequestResponse({
    description: 'Archivo ausente, vacío o con extensión comprimida/ejecutable bloqueada.',
  })
  @ApiPayloadTooLargeResponse({
    description: 'El archivo supera el tamaño máximo permitido (UPLOAD_MAX_SIZE_MB).',
  })
  @ApiUnsupportedMediaTypeResponse({
    description: 'Tipo MIME no permitido o firma binaria (magic bytes) inválida.',
  })
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
  @ApiOperation({
    summary: 'Registrar alerta de acequia obstruida',
    description:
      'Registra un incidente urbano georreferenciado en el municipio indicado a partir del resultado de una inspección fotográfica.',
  })
  @ApiCreatedResponse({
    description: 'Alerta urbana creada y georreferenciada exitosamente.',
  })
  @ApiBadRequestResponse({
    description: 'Datos de entrada inválidos según validación del DTO.',
  })
  createAlert(@Body() dto: CreateUrbanAlertDto) {
    return this.service.createAlert(dto);
  }

  /** Lista las alertas de acequias registradas, filtrables por municipio o nivel de riesgo. */
  @Get('alerts')
  @ApiOperation({
    summary: 'Listar alertas de obstrucción en acequias urbanas',
    description:
      'Devuelve el historial de alertas urbanas registradas con sus coordenadas GeoJSON y detecciones asociadas, filtrables por municipio y nivel de riesgo.',
  })
  @ApiOkResponse({
    description: 'Listado de alertas urbanas de acequias.',
  })
  getAlerts(@Query() query: UrbanAlertsQueryDto) {
    return this.service.getAlerts(query);
  }
}
