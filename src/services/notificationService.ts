/**
 * Notification Service
 * Handles all notification-related data operations
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  Notification,
  NotificationInsert,
  NotificationUpdate,
  ServiceResponse,
} from '@/types/api';

/**
 * Fetches notifications for a user
 * @param userId - User ID
 * @param limit - Optional limit for number of notifications
 * @returns List of notifications
 */
export async function getUserNotifications(
  userId: string,
  limit?: number
): Promise<ServiceResponse<Notification[]>> {
  try {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    return {
      data,
      error: null,
    };
  } catch (error) {
    console.error('Error fetching user notifications:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Fetches unread notifications for a user
 * @param userId - User ID
 * @returns List of unread notifications
 */
export async function getUnreadNotifications(
  userId: string
): Promise<ServiceResponse<Notification[]>> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('read', false)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      data,
      error: null,
    };
  } catch (error) {
    console.error('Error fetching unread notifications:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Gets count of unread notifications
 * @param userId - User ID
 * @returns Count of unread notifications
 */
export async function getUnreadNotificationCount(
  userId: string
): Promise<ServiceResponse<number>> {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;

    return {
      data: count || 0,
      error: null,
    };
  } catch (error) {
    console.error('Error fetching unread notification count:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Creates a new notification
 * @param notification - Notification data
 * @returns Created notification
 */
export async function createNotification(
  notification: NotificationInsert
): Promise<ServiceResponse<Notification>> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert(notification)
      .select()
      .single();

    if (error) throw error;

    return {
      data,
      error: null,
    };
  } catch (error) {
    console.error('Error creating notification:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Marks a notification as read
 * @param id - Notification ID
 * @returns Updated notification
 */
export async function markNotificationAsRead(
  id: string
): Promise<ServiceResponse<Notification>> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return {
      data,
      error: null,
    };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Marks all notifications as read for a user
 * @param userId - User ID
 * @returns Success status
 */
export async function markAllNotificationsAsRead(
  userId: string
): Promise<ServiceResponse<null>> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;

    return {
      data: null,
      error: null,
    };
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Deletes a notification
 * @param id - Notification ID
 * @returns Success status
 */
export async function deleteNotification(
  id: string
): Promise<ServiceResponse<null>> {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return {
      data: null,
      error: null,
    };
  } catch (error) {
    console.error('Error deleting notification:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Deletes all read notifications for a user
 * @param userId - User ID
 * @returns Success status
 */
export async function deleteReadNotifications(
  userId: string
): Promise<ServiceResponse<null>> {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId)
      .eq('read', true);

    if (error) throw error;

    return {
      data: null,
      error: null,
    };
  } catch (error) {
    console.error('Error deleting read notifications:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Creates a notification for submission approval
 * @param userId - User ID to notify
 * @param submissionId - Submission ID
 * @returns Created notification
 */
export async function notifySubmissionApproved(
  userId: string,
  submissionId: string
): Promise<ServiceResponse<Notification>> {
  try {
    return await createNotification({
      user_id: userId,
      title: '✅ Submissão Aprovada!',
      message: 'Sua postagem foi aprovada. Continue assim!',
      type: 'approval',
    });
  } catch (error) {
    console.error('Error creating approval notification:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Creates a notification for submission rejection
 * @param userId - User ID to notify
 * @param submissionId - Submission ID
 * @param reason - Rejection reason
 * @returns Created notification
 */
export async function notifySubmissionRejected(
  userId: string,
  submissionId: string,
  reason?: string
): Promise<ServiceResponse<Notification>> {
  try {
    return await createNotification({
      user_id: userId,
      title: '❌ Submissão Rejeitada',
      message: reason
        ? `Motivo: ${reason}`
        : 'Revise e envie novamente.',
      type: 'rejection',
    });
  } catch (error) {
    console.error('Error creating rejection notification:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Creates a notification for badge earned
 * @param userId - User ID to notify
 * @param badgeType - Type of badge earned
 * @returns Created notification
 */
export async function notifyBadgeEarned(
  userId: string,
  badgeType: string
): Promise<ServiceResponse<Notification>> {
  try {
    const badgeEmojis: Record<string, string> = {
      bronze_tier: '🥉',
      silver_tier: '🥈',
      gold_tier: '🥇',
      diamond_tier: '💎',
      legend_tier: '🏆',
    };

    const badgeNames: Record<string, string> = {
      bronze_tier: 'Bronze',
      silver_tier: 'Prata',
      gold_tier: 'Ouro',
      diamond_tier: 'Diamante',
      legend_tier: 'Lenda',
    };

    const emoji = badgeEmojis[badgeType] || '🏅';
    const name = badgeNames[badgeType] || badgeType;

    return await createNotification({
      user_id: userId,
      title: `${emoji} Badge ${name} Conquistado!`,
      message: 'Parabéns pelo seu progresso!',
      type: 'badge',
    });
  } catch (error) {
    console.error('Error creating badge notification:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Creates a notification for deadline reminder
 * @param userId - User ID to notify
 * @param postId - Post ID
 * @param hoursRemaining - Hours until deadline
 * @returns Created notification
 */
export async function notifyDeadlineReminder(
  userId: string,
  postId: string,
  hoursRemaining: number
): Promise<ServiceResponse<Notification>> {
  try {
    return await createNotification({
      user_id: userId,
      title: '⏰ Lembrete de Prazo',
      message: `Faltam ${hoursRemaining} horas para o prazo de uma postagem!`,
      type: 'deadline',
    });
  } catch (error) {
    console.error('Error creating deadline notification:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}
