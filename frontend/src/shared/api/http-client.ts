import { appConfig } from '../../app.config';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
    const rawMsg = body?.message;
    const message = Array.isArray(rawMsg)
      ? rawMsg.join(', ')
      : (rawMsg ?? `Error ${response.status}`);
    throw new ApiError(message, response.status);
  }
  return (await response.json()) as T;
}

/** Cliente HTTP GET basado en fetch. La URL base proviene de VITE_API_URL. */
export async function httpGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${appConfig.api.baseUrl}${path}`, {
      headers: { Accept: 'application/json' },
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError('No se pudo conectar con el servidor', 0);
  }

  return parseResponse<T>(response);
}

/** Cliente HTTP POST JSON. */
export async function httpPost<T, B = unknown>(
  path: string,
  body: B,
  signal?: AbortSignal,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${appConfig.api.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError('No se pudo conectar con el servidor', 0);
  }

  return parseResponse<T>(response);
}

/** Cliente HTTP POST Multipart (FormData) para subida de imágenes. */
export async function httpPostMultipart<T>(
  path: string,
  formData: FormData,
  signal?: AbortSignal,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${appConfig.api.baseUrl}${path}`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: formData,
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError('No se pudo conectar con el servidor', 0);
  }

  return parseResponse<T>(response);
}
