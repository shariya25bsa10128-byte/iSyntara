
import { apiRequest } from "./api";

// ==========================================
// FETCH NOTIFICATIONS
// ==========================================

export const getNotifications = async () => {
  const data = await apiRequest("/notifications");

  return {
    notifications: data.notifications || [],
    unreadCount: data.unreadCount || 0,
  };
};

// ==========================================
// MARK ONE NOTIFICATION AS READ
// ==========================================

export const markNotificationAsRead = async (notificationId) => {
  if (!notificationId) {
    throw new Error("Notification ID is required.");
  }

  return apiRequest(
    `/notifications/${notificationId}/read`,
    {
      method: "PATCH",
    }
  );
};

// ==========================================
// MARK ALL NOTIFICATIONS AS READ
// ==========================================

export const markAllNotificationsAsRead = async () => {
  return apiRequest("/notifications/read-all", {
    method: "PATCH",
  });
};

// ==========================================
// EXPORT SERVICE
// ==========================================

const notificationService = {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};

export default notificationService;
