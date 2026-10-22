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
import type {
  PresetScenarioKey,
  VisionImageInput,
} from './providers/vision-provider.interface';

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
    summary: 'Analizar fotografía de acequia',
    description:
      'Recibe una imagen (`multipart/form-data`, campo `image`). Si incluye `presetId` (`critico`, `medio`, `bajo`), utiliza la escena de prueba; si es una foto subida por el usuario, analiza la imagen píxel por píxel o mediante el proveedor configurado.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Fotografía de la acequia a relevar (JPEG, PNG, WebP o SVG sin scripts)',
    schema: {
      type: 'object',
      required: ['image'],
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: 'Archivo de imagen de la acequia (máx. 10 MB)',
        },
        presetId: {
          type: 'string',
          enum: ['critico', 'medio', 'bajo'],
          description: 'Opcional. Identificador de escena de prueba para carga inmediata.',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description:
      'Resultado del análisis con porcentaje de obstrucción, nivel de riesgo (BAJO, MEDIO, CRITICO) y lista de materiales detectados.',
  })
  @ApiBadRequestResponse({
    description: 'Archivo ausente, vacío o con extensión comprimida/ejecutable bloqueada.',
  })
  @ApiPayloadTooLargeResponse({
    description: 'El archivo supera el tamaño máximo permitido (UPLOAD_MAX_SIZE_MB).',
  })
  @ApiUnsupportedMediaTypeResponse({
    description: 'Formato MIME no permitido o firma binaria (magic bytes) inválida.',
  })
  analyzeImage(
    @UploadedFile() file?: VisionImageInput,
    @Body('presetId') presetId?: PresetScenarioKey,
  ) {
    validateUploadedImage(file, this.config.uploadMaxSizeMb);

    const validPreset =
      presetId === 'critico' || presetId === 'medio' || presetId === 'bajo'
        ? presetId
        : undefined;

    return this.service.analyzeImage({
      buffer: file!.buffer,
      originalname: file!.originalname,
      mimetype: file!.mimetype,
      size: file!.size,
      presetId: validPreset,
    });
  }

  /** Registra una alerta de obstrucción de acequia a partir de un relevamiento fotográfico. */
  @Post('alerts')
  @ApiOperation({
    summary: 'Registrar alerta de acequia obstruida',
    description:
      'Registra un incidente urbano georreferenciado en el municipio indicado a partir del resultado de una foto analizada.',
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
      'Devuelve el historial de alertas urbanas registradas con sus coordenadas GeoJSON y materiales detectados, filtrables por municipio y nivel de riesgo.',
  })
  @ApiOkResponse({
    description: 'Listado de alertas urbanas de acequias.',
  })
  getAlerts(@Query() query: UrbanAlertsQueryDto) {
    return this.service.getAlerts(query);
  }
}
