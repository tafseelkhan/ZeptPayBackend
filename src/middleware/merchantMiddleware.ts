import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import Merchant from '../models/Test/AirCaptured/merchant/merchantOnboard';
import dotenv from 'dotenv';

dotenv.config();

interface AuthRequest extends Request {
  merchant?: any;
}

export const merchantMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');

    const merchant = await Merchant.findById(decoded.merchantId);
    if (!merchant) {
      return res.status(401).json({ message: 'Unauthorized: Merchant not found' });
    }

    req.merchant = merchant;
    next();
  } catch (err) {
    console.error(err);
    return res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
};

// Optional: Role check middleware
export const authorizeRole = (roles: Array<'merchant'>) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.merchant || !roles.includes(req.merchant.role)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
};
