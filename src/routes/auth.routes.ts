import { Router } from 'express';
import { login, register, refresh, getMe, logout } from '../controllers/auth.controller.ts';
import { authMiddleware } from '../middlewares/auth.middleware.ts';

const router = Router();

// POST /api/auth/register — Create a new user account
router.post('/register', register);

// POST /api/auth/login — Authenticate and receive tokens
router.post('/login', login);

// POST /api/auth/refresh — Refresh an expired access token
router.post('/refresh', refresh);

// GET /api/auth/me — Get the currently authenticated user (protected)
router.get('/me', authMiddleware, getMe);

// POST /api/auth/logout — Clear refresh token cookie
router.post('/logout', authMiddleware, logout);

export default router;