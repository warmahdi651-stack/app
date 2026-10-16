import { Platform } from 'react-native';

/**
 * پایهٔ آدرس API:
 *  - در وب: نسبی (`/api`) تا درخواست‌ها از همان مبدأیی که صفحه سرو می‌شود انجام شود.
 *  - در موبایل: از متغیر محیطی `EXPO_PUBLIC_API_URL` یا آدرس پیش‌فرض شبیه‌ساز اندروید.
 */
const resolveBaseUrl = (): string => {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, '');
  if (Platform.OS === 'web') return '';
  return 'http://10.0.2.2:4000';
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
};

export class ApiClient {
  private token: string | null = null;
  readonly baseUrl: string = resolveBaseUrl();

  setToken(token: string | null): void {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, query } = options;
    const url = new URL(`${this.baseUrl}${path}`, 'http://localhost');
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) url.searchParams.set(key, String(value));
      }
    }

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (this.token) headers.Authorization = `Bearer ${this.token}`;

    let response: Response;
    try {
      response = await fetch(url.toString().replace('http://localhost', this.baseUrl || ''), {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new ApiError(0, 'network_error', 'ارتباط با سرور برقرار نشد.');
    }

    const text = await response.text();
    const payload = text ? safeParse(text) : null;

    if (!response.ok) {
      const error = (payload as { error?: { code?: string; message?: string } } | null)?.error;
      throw new ApiError(
        response.status,
        error?.code ?? 'http_error',
        error?.message ?? 'خطای نامشخص از سمت سرور.',
      );
    }

    return payload as T;
  }

  get<T>(path: string, query?: RequestOptions['query']) {
    return this.request<T>(path, { method: 'GET', query });
  }
  post<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: 'POST', body });
  }
  put<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: 'PUT', body });
  }
  patch<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: 'PATCH', body });
  }
  delete<T>(path: string, query?: RequestOptions['query']) {
    return this.request<T>(path, { method: 'DELETE', query });
  }
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export const api = new ApiClient();
