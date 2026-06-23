import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const result = await AuthService.login({ email, password });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};