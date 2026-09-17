import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { execute, queryOne, queryAll } from '../db/database';
import { generateToken, AuthUser } from '../middleware/auth';

export class AuthService {
  /**
   * Register a new user
   */
  static async register(name: string, email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();

    // Check existing email
    const existing = await queryOne('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    if (existing) {
      throw new Error('An account with this email address already exists');
    }

    const userId = 'usr_' + crypto.randomBytes(8).toString('hex');
    const passwordHash = await bcrypt.hash(password, 10);
    const avatarUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name.trim())}`;

    await execute(
      `INSERT INTO users (id, name, email, password_hash, role, avatar_url, xp, level, current_streak, longest_streak, status, last_login_at)
       VALUES (?, ?, ?, ?, 'user', ?, 0, 1, 0, 0, 'active', datetime('now'))`,
      [userId, name.trim(), normalizedEmail, passwordHash, avatarUrl]
    );

    const user = await queryOne<AuthUser>(
      'SELECT id, name, email, role, avatar_url, xp, level, current_streak, longest_streak, status FROM users WHERE id = ?',
      [userId]
    );

    if (!user) throw new Error('User creation failed');

    const token = generateToken(user);
    return { user, token };
  }

  /**
   * Log in an existing user
   */
  static async login(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const row = await queryOne<{
      id: string;
      name: string;
      email: string;
      password_hash: string;
      role: 'user' | 'admin';
      avatar_url: string;
      xp: number;
      level: number;
      current_streak: number;
      longest_streak: number;
      status: string;
    }>('SELECT * FROM users WHERE email = ?', [normalizedEmail]);

    if (!row) {
      throw new Error('Invalid email or password');
    }

    if (row.status !== 'active') {
      throw new Error('This account has been deactivated or suspended');
    }

    const isMatch = await bcrypt.compare(password, row.password_hash);
    if (!isMatch) {
      throw new Error('Invalid email or password');
    }

    // Update last_login_at
    await execute("UPDATE users SET last_login_at = datetime('now'), updated_at = datetime('now') WHERE id = ?", [row.id]);

    const user: AuthUser = {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      avatar_url: row.avatar_url,
      xp: row.xp,
      level: row.level,
      current_streak: row.current_streak,
      longest_streak: row.longest_streak,
      status: row.status
    };

    const token = generateToken(user);
    return { user, token };
  }

  /**
   * Fetch current user profile
   */
  static async getMe(userId: string) {
    const user = await queryOne<AuthUser>(
      'SELECT id, name, email, role, avatar_url, xp, level, current_streak, longest_streak, status FROM users WHERE id = ?',
      [userId]
    );
    if (!user) throw new Error('User not found');
    return user;
  }

  /**
   * Update profile info (name, avatar)
   */
  static async updateProfile(userId: string, updates: { name?: string; avatar_url?: string }) {
    if (updates.name) {
      await execute("UPDATE users SET name = ?, updated_at = datetime('now') WHERE id = ?", [updates.name.trim(), userId]);
    }
    if (updates.avatar_url) {
      await execute("UPDATE users SET avatar_url = ?, updated_at = datetime('now') WHERE id = ?", [updates.avatar_url.trim(), userId]);
    }
    return await this.getMe(userId);
  }

  /**
   * Change user password
   */
  static async changePassword(userId: string, currentPass: string, newPass: string) {
    const row = await queryOne<{ password_hash: string }>('SELECT password_hash FROM users WHERE id = ?', [userId]);
    if (!row) throw new Error('User not found');

    const isMatch = await bcrypt.compare(currentPass, row.password_hash);
    if (!isMatch) {
      throw new Error('Current password is incorrect');
    }

    const newHash = await bcrypt.hash(newPass, 10);
    await execute("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?", [newHash, userId]);
    return { success: true, message: 'Password updated successfully' };
  }

  /**
   * Request password reset token
   */
  static async forgotPassword(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await queryOne<{ id: string }>('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    if (!user) {
      // Don't leak email existence for security
      return { success: true, message: 'If this email is registered, reset instructions have been generated.' };
    }

    const tokenId = 'rst_' + crypto.randomBytes(8).toString('hex');
    const resetToken = crypto.randomBytes(24).toString('hex');
    // Token valid for 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await execute(
      `INSERT INTO password_reset_tokens (id, user_id, token, expires_at, used)
       VALUES (?, ?, ?, ?, 0)`,
      [tokenId, user.id, resetToken, expiresAt]
    );

    return {
      success: true,
      message: 'Password reset link generated',
      resetToken, // Returned so the UI / developer can immediately test or use it
      expiresAt
    };
  }

  /**
   * Reset password with token
   */
  static async resetPassword(token: string, newPass: string) {
    const row = await queryOne<{ id: string; user_id: string; expires_at: string; used: number }>(
      'SELECT * FROM password_reset_tokens WHERE token = ?',
      [token]
    );

    if (!row || row.used === 1) {
      throw new Error('Reset token is invalid or has already been used');
    }

    if (new Date(row.expires_at).getTime() < Date.now()) {
      throw new Error('Reset token has expired');
    }

    const newHash = await bcrypt.hash(newPass, 10);
    await execute("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?", [newHash, row.user_id]);
    await execute('UPDATE password_reset_tokens SET used = 1 WHERE id = ?', [row.id]);

    return { success: true, message: 'Password has been successfully reset. You can now log in.' };
  }

  /**
   * Delete account
   */
  static async deleteAccount(userId: string, passwordConfirm: string) {
    const user = await queryOne<{ password_hash: string; role: string }>('SELECT password_hash, role FROM users WHERE id = ?', [userId]);
    if (!user) throw new Error('User not found');

    const isMatch = await bcrypt.compare(passwordConfirm, user.password_hash);
    if (!isMatch) {
      throw new Error('Incorrect password. Account deletion aborted.');
    }

    // Protect last admin
    if (user.role === 'admin') {
      const adminCount = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM users WHERE role = "admin"');
      if (adminCount && adminCount.count <= 1) {
        throw new Error('Cannot delete the only administrator account.');
      }
    }

    await execute('DELETE FROM users WHERE id = ?', [userId]);
    return { success: true, message: 'Account permanently deleted.' };
  }

  /**
   * Export all user learning data (Privacy & Data Portability)
   */
  static async exportUserData(userId: string) {
    const user = await this.getMe(userId);
    const progress = await queryAll('SELECT * FROM user_question_progress WHERE user_id = ?', [userId]);
    const quizzes = await queryAll('SELECT * FROM quiz_sessions WHERE user_id = ? ORDER BY started_at DESC', [userId]);
    const attempts = await queryAll('SELECT * FROM answer_attempts WHERE user_id = ? ORDER BY answered_at DESC LIMIT 500', [userId]);
    const bookmarks = await queryAll('SELECT * FROM bookmarks WHERE user_id = ?', [userId]);
    const achievements = await queryAll(`
      SELECT a.code, a.name, a.description, ua.earned_at
      FROM user_achievements ua
      JOIN achievements a ON ua.achievement_id = a.id
      WHERE ua.user_id = ?
    `, [userId]);

    return {
      exportedAt: new Date().toISOString(),
      user,
      progress,
      quizzes,
      attempts,
      bookmarks,
      achievements
    };
  }
}
