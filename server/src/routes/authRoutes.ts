import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/authService';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimit';
import { validateBody } from '../middleware/validate';

export const authRouter = Router();

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(60),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters')
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address')
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters')
});

const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password confirmation is required')
});

// Register
authRouter.post('/register', authRateLimiter, validateBody(registerSchema), async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    const result = await AuthService.register(name, email, password);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Registration failed' });
  }
});

// Login
authRouter.post('/login', authRateLimiter, validateBody(loginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = await AuthService.login(email, password);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Login failed' });
  }
});

// Me
authRouter.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const me = await AuthService.getMe(req.user!.id);
    res.json({ user: me });
  } catch (err: any) {
    res.status(404).json({ error: err.message || 'User not found' });
  }
});

// Profile update
authRouter.patch('/profile', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, avatar_url } = req.body;
    const updated = await AuthService.updateProfile(req.user!.id, { name, avatar_url });
    res.json({ user: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Profile update failed' });
  }
});

// Change password
authRouter.post('/change-password', requireAuth, validateBody(changePasswordSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await AuthService.changePassword(req.user!.id, currentPassword, newPassword);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Password update failed' });
  }
});

// Forgot password
authRouter.post('/forgot-password', authRateLimiter, validateBody(forgotPasswordSchema), async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const result = await AuthService.forgotPassword(email);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Forgot password failed' });
  }
});

// Reset password
authRouter.post('/reset-password', validateBody(resetPasswordSchema), async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    const result = await AuthService.resetPassword(token, newPassword);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Reset password failed' });
  }
});

// Delete account
authRouter.delete('/account', requireAuth, validateBody(deleteAccountSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { password } = req.body;
    const result = await AuthService.deleteAccount(req.user!.id, password);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Account deletion failed' });
  }
});

// Export user data
authRouter.get('/export-data', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await AuthService.exportUserData(req.user!.id);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to export data' });
  }
});
