import { Request, Response, NextFunction } from 'express';

export const corsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const allowedOrigin = process.env.NODE_ENV === 'production'
    ? process.env.NEXT_PUBLIC_API_URL || 'https://sistema.cortinovaok.com' // fallback para producción
    : 'http://localhost:3000'; // desarrollo

    console.log(`Solicitud CORS recibida desde: ${req.headers.origin}`);
    console.log(`Método de la solicitud: ${req.method}`);
    console.log(`URL de destino: ${req.url}`);
  


  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

  // Si es una solicitud preflight (OPTIONS), respondemos de inmediato con un 204
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  next();
};
