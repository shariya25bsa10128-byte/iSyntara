
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  ExternalLink,
  LoaderCircle,
  X,
} from "lucide-react";

import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../services/notificationService";

import "./NotificationBell.css";

function NotificationBell() {
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState("");

  // ==========================================
  // FETCH NOTIFICATIONS
  // ==========================================

  const loadNotifications = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      }

      setError("");

      const data = await getNotifications();

      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      console.error("Notification fetch error:", err);
      setError(err.message || "Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  // ==========================================
  // INITIAL LOAD + AUTO REFRESH
  // ==========================================

  useEffect(() => {
    loadNotifications(true);

    const interval = window.setInterval(() => {
      loadNotifications();
    }, 30000);

    return () => window.clearInterval(interval);
  }, [loadNotifications]);

  // ==========================================
  // CLOSE DROPDOWN ON OUTSIDE CLICK
  // ==========================================

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  // ==========================================
  // OPEN / CLOSE DROPDOWN
  // ==========================================

  const toggleDropdown = () => {
    setIsOpen((previous) => !previous);

    if (!isOpen) {
      loadNotifications();
    }
  };

  // ==========================================
  // MARK ONE NOTIFICATION AS READ
  // ==========================================

  const handleMarkAsRead = async (notificationId) => {
    try {
      setUpdatingId(notificationId);

      await markNotificationAsRead(notificationId);

      setNotifications((previous) =>
        previous.map((notification) =>
          notification.id === notificationId
            ? { ...notification, isRead: true }
            : notification
        )
      );

      setUnreadCount((previous) => Math.max(0, previous - 1));
    } catch (err) {
      console.error("Mark notification read error:", err);
      setError(err.message || "Unable to update notification.");
    } finally {
      setUpdatingId(null);
    }
  };

  // ==========================================
  // MARK ALL AS READ
  // ==========================================

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;

    try {
      setMarkingAll(true);

      await markAllNotificationsAsRead();

      setNotifications((previous) =>
        previous.map((notification) => ({
          ...notification,
          isRead: true,
        }))
      );

      setUnreadCount(0);
    } catch (err) {
      console.error("Mark all notifications error:", err);
      setError(err.message || "Unable to update notifications.");
    } finally {
      setMarkingAll(false);
    }
  };

  // ==========================================
  // NOTIFICATION CLICK
  // ==========================================

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      await handleMarkAsRead(notification.id);
    }

    setIsOpen(false);

    if (
      notification.link &&
      notification.link.startsWith("/")
    ) {
      navigate(notification.link);
    }
  };

  // ==========================================
  // TIME FORMAT
  // ==========================================

  const formatTime = (date) => {
    if (!date) return "";

    const notificationDate = new Date(date);

    if (Number.isNaN(notificationDate.getTime())) {
      return "";
    }

    const now = new Date();
    const difference = Math.max(
      0,
      now.getTime() - notificationDate.getTime()
    );

    const minutes = Math.floor(difference / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return notificationDate.toLocaleDateString();
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="notification-wrapper" ref={dropdownRef}>

      {/* NOTIFICATION BELL */}

      <button
        type="button"
        className={`notification-bell ${isOpen ? "active" : ""}`}
        onClick={toggleDropdown}
        aria-label={`Notifications, ${unreadCount} unread`}
        aria-expanded={isOpen}
        title="Notifications"
      >
        <Bell size={20} />

        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* NOTIFICATION DROPDOWN */}

      {isOpen && (
        <div className="notification-dropdown">

          <div className="notification-header">
            <div>
              <h3>Notifications</h3>
              <p>
                {unreadCount > 0
                  ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
                  : "You're all caught up"}
              </p>
            </div>

            <div className="notification-header-actions">

              {unreadCount > 0 && (
                <button
                  type="button"
                  className="notification-mark-all"
                  onClick={handleMarkAllAsRead}
                  disabled={markingAll}
                  title="Mark all as read"
                >
                  {markingAll ? (
                    <LoaderCircle size={16} className="notification-spin" />
                  ) : (
                    <CheckCheck size={16} />
                  )}
                  <span>Read all</span>
                </button>
              )}

              <button
                type="button"
                className="notification-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close notifications"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* ERROR */}

          {error && (
            <div className="notification-error">
              <span>{error}</span>

              <button
                type="button"
                onClick={() => loadNotifications(true)}
              >
                Retry
              </button>
            </div>
          )}

          {/* LOADING */}

          {loading ? (
            <div className="notification-state">
              <LoaderCircle
                size={25}
                className="notification-spin"
              />
              <p>Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            /* EMPTY STATE */

            <div className="notification-state">
              <div className="notification-empty-icon">
                <Bell size={25} />
              </div>

              <h4>No notifications yet</h4>

              <p>
                Updates about your applications will appear here.
              </p>
            </div>
          ) : (
            /* NOTIFICATION LIST */

            <div className="notification-list">

              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${
                    notification.isRead ? "read" : "unread"
                  }`}
                >
                  <button
                    type="button"
                    className="notification-content"
                    onClick={() =>
                      handleNotificationClick(notification)
                    }
                  >
                    <div className="notification-item-icon">
                      <Bell size={17} />
                    </div>

                    <div className="notification-item-details">
                      <div className="notification-item-title">
                        <strong>{notification.title}</strong>

                        {!notification.isRead && (
                          <span className="notification-unread-dot" />
                        )}
                      </div>

                      <p>{notification.message}</p>

                      <span className="notification-time">
                        <Clock size={12} />
                        {formatTime(notification.createdAt)}
                      </span>
                    </div>
                  </button>

                  {!notification.isRead && (
                    <button
                      type="button"
                      className="notification-read-button"
                      onClick={() =>
                        handleMarkAsRead(notification.id)
                      }
                      disabled={updatingId === notification.id}
                      title="Mark as read"
                      aria-label="Mark notification as read"
                    >
                      {updatingId === notification.id ? (
                        <LoaderCircle
                          size={15}
                          className="notification-spin"
                        />
                      ) : (
                        <Check size={16} />
                      )}
                    </button>
                  )}
                </div>
              ))}

            </div>
          )}

          {/* FOOTER */}

          {notifications.length > 0 && (
            <div className="notification-footer">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate("/student/applications");
                }}
              >
                View my applications
                <ExternalLink size={14} />
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

export default NotificationBell;
