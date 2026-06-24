import { Request, Response, NextFunction } from 'express';

const DEFAULT_ORIGINS = [
  'http://localhost:3000',
  'https://sistema.soderiadonjavier.com',
];

function getAllowedOrigins(): string[] {
  const fromEnv =
    process.env.CORS_ORIGINS?.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean) ?? [];

  const frontendUrl = process.env.FRONTEND_URL?.trim();

  return [...new Set([...fromEnv, ...(frontendUrl ? [frontendUrl] : []), ...DEFAULT_ORIGINS])];
}

export const corsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const requestOrigin = req.headers.origin;
  const allowedOrigins = getAllowedOrigins();

  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    res.setHeader('Vary', 'Origin');
  } else if (requestOrigin) {
    console.warn(`[CORS] Origen no permitido: ${requestOrigin}`);
  }

  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  next();
};
