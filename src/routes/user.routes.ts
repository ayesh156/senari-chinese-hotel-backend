import { Router } from 'express';
import { authMiddleware, authorize } from '../middlewares/auth.middleware.ts';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  resetPassword,
  selfUpdate,
  toggleStatus,
  deleteUser,
} from '../controllers/user.controller.ts';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Self-service profile update (must be before :id routes to avoid conflict)
router.put('/me/profile', selfUpdate);

// Admin-only routes
router.get('/', authorize('ADMIN', 'MANAGER'), getAllUsers);
router.get('/:id', authorize('ADMIN'), getUserById);
router.post('/', authorize('ADMIN'), createUser);
router.put('/:id', authorize('ADMIN'), updateUser);
router.put('/:id/password', authorize('ADMIN'), resetPassword);
router.patch('/:id/status', authorize('ADMIN'), toggleStatus);
router.delete('/:id', authorize('ADMIN'), deleteUser);

export default router;