import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { Request, Response, NextFunction } from 'express';

dotenv.config();


interface AuthRequest extends Request {
  user?: string | jwt.JwtPayload;
}




const auth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as jwt.JwtPayload;

    req.user = decoded;
    console.log(decoded)

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};