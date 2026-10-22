import { appConfig } from '../../app.config';

const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * URL base de la API resuelta dinámicamente desde `import.meta.env.VITE_API_URL`
 * (ej. `https://gesti-n-h-drica-integral.onrender.com` en producción o `http://localhost:3000` en local).
 */
export const API_BASE_URL = appConfig.api.baseUrl;

/**
 * Convierte una ruta relativa servida por el backend (ej. `/uploads/crew-evidence/...`)
 * en una URL absoluta hacia el servidor configurado en `VITE_API_URL`.
 */
export function resolveBackendAssetUrl(assetPath: string): string {
  if (!assetPath) return '';
  if (assetPath.startsWith('http://') || assetPath.startsWith('https://')) {
    return assetPath;
  }
  const normalizedPath = assetPath.startsWith('/') ? assetPath : `/${assetPath}`;
  return `${appConfig.api.origin}${normalizedPath}`;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Crea un AbortSignal compuesto que cancela la petición si el usuario navega a otra
 * vista o si el backend supera el tiempo máximo de espera (`DEFAULT_TIMEOUT_MS`).
 */
function createTimedSignal(externalSignal?: AbortSignal): {
  signal: AbortSignal;
  cleanup: () => void;
  didTimeout: () => boolean;
} {
  const controller = new AbortController();
  let timedOut = false;

  const timer = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, DEFAULT_TIMEOUT_MS);

  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  const cleanup = () => {
    window.clearTimeout(timer);
    externalSignal?.removeEventListener('abort', onExternalAbort);
  };

  return {
    signal: controller.signal,
    cleanup,
    didTimeout: () => timedOut,
  };
}

/**
 * Parsea de forma segura la respuesta JSON del servidor, capturando tanto errores HTTP
 * como fallos de formato en el JSON.
 */
async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string | string[];
    } | null;
    const rawMsg = body?.message;
    const message = Array.isArray(rawMsg)
      ? rawMsg.join(', ')
      : (rawMsg ?? `Error del servidor (HTTP ${response.status})`);
    throw new ApiError(message, response.status);
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError(
      'La respuesta recibida del servidor no tiene un formato JSON válido.',
      502,
    );
  }
}

async function executeFetch<T>(
  path: string,
  init: RequestInit,
  externalSignal?: AbortSignal,
): Promise<T> {
  const { signal, cleanup, didTimeout } = createTimedSignal(externalSignal);
  let response: Response;

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  try {
    response = await fetch(`${API_BASE_URL}${normalizedPath}`, {
      ...init,
      signal,
    });
  } catch (error) {
    cleanup();
    if (didTimeout()) {
      throw new ApiError(
        'El servidor tardó demasiado en responder. Verificá la conexión e intentá nuevamente.',
        408,
      );
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    throw new ApiError(
      'No se pudo conectar con el servidor. Verificá que el backend esté en ejecución.',
      0,
    );
  }

  try {
    return await parseResponse<T>(response);
  } finally {
    cleanup();
  }
}

/** Cliente HTTP GET basado en fetch con timeout, validación de JSON y Bearer token opcional. */
export async function httpGet<T>(
  path: string,
  signal?: AbortSignal,
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return executeFetch<T>(path, { headers }, signal);
}

/** Cliente HTTP POST JSON con timeout, validación de JSON y Bearer token opcional. */
export async function httpPost<T, B = unknown>(
  path: string,
  body: B,
  signal?: AbortSignal,
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return executeFetch<T>(
    path,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    },
    signal,
  );
}

/** Cliente HTTP PATCH JSON con timeout, validación de JSON y Bearer token opcional. */
export async function httpPatch<T, B = unknown>(
  path: string,
  body: B,
  signal?: AbortSignal,
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return executeFetch<T>(
    path,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    },
    signal,
  );
}

/** Cliente HTTP POST Multipart (FormData) para subida de imágenes (con Bearer token opcional). */
export async function httpPostMultipart<T>(
  path: string,
  formData: FormData,
  signal?: AbortSignal,
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return executeFetch<T>(
    path,
    {
      method: 'POST',
      headers,
      body: formData,
    },
    signal,
  );
}
