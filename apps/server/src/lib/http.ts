import type { FastifyReply, FastifyRequest } from 'fastify';

/** خطای HTTP با پیام فارسی و کد قابل‌اتکا برای کلاینت. */
export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const badRequest = (message: string, code = 'bad_request') => new HttpError(400, code, message);
export const unauthorized = (message = 'برای این عملیات باید وارد شوید.') => new HttpError(401, 'unauthorized', message);
export const notFound = (message = 'موردی یافت نشد.') => new HttpError(404, 'not_found', message);
export const conflict = (message: string) => new HttpError(409, 'conflict', message);

export function bearerToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (!token || scheme?.toLowerCase() !== 'bearer') return null;
  return token.trim() || null;
}

export function sendError(reply: FastifyReply, error: unknown): void {
  if (error instanceof HttpError) {
    reply.status(error.statusCode).send({ error: { code: error.code, message: error.message } });
    return;
  }
  const message = error instanceof Error ? error.message : 'خطای ناشناخته';
  request_console_error(message);
  reply.status(500).send({ error: { code: 'internal_error', message: 'خطای داخلی سرور.' } });
}

function request_console_error(message: string): void {
  console.error('[server]', message);
}
