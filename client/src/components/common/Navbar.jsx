// src/components/common/Navbar.jsx
import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  Bell,
  MonitorPlay,
  Trophy,
  LogOut,
  User,
  LayoutDashboard,
  Settings,
  ChevronDown,
  Calendar,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Info,
  X,
  Sparkles,
  Loader2,
  AlertTriangle,
  Terminal,
  Users,
  UserPlus2,
  Shield,
} from "lucide-react";
import CompilerModal from "../Compiler/CompilerModal";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  formatRelativeTime,
} from "../../services/notification.service";
import { getUnreadCount as getChatUnreadCount } from "../../services/chat.service";
import "./Navbar.css";
import logo from "../assets/EduhackTech.jpeg";

const Navbar = () => {
  const { mode, toggleMode, primary, bgLight } = useTheme();
  const { user, token, logoutUser } = useAuth();
  const navigate = useNavigate();

  const handleModeToggle = () => {
    toggleMode();
    if (mode === "learning") navigate("/competition");
    else navigate("/learning");
  };

  // Dropdown State
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef(null);

  // Notification State
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);
  const notificationRef = useRef(null);

  // Compiler Modal State
  const [isCompilerOpen, setIsCompilerOpen] = useState(false);

  // Search Logic
  const [searchQuery, setSearchQuery] = useState("");
  /* Mobile Search State */
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const handleSearch = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      setIsMobileSearchOpen(false); // Close on search
      if (mode === "learning") {
        navigate(`/learning?search=${encodeURIComponent(searchQuery)}`);
      } else {
        navigate(`/competition?search=${encodeURIComponent(searchQuery)}`);
      }
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setIsNotificationOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch notifications when panel opens or on initial load
  const fetchNotifications = async () => {
    if (!token) return;

    setNotifLoading(true);
    try {
      const response = await getNotifications(token);
      if (response.success) {
        setNotifications(response.data);
        setUnreadCount(response.unreadCount);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setNotifLoading(false);
    }
  };

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isNotificationOpen && token) {
      fetchNotifications();
    }
  }, [isNotificationOpen, token]);

  // Also fetch on component mount if user is logged in
  useEffect(() => {
    if (user && token) {
      fetchNotifications();
    }
  }, [user, token]);

  // Fetch chat unread count on mount
  const fetchChatUnread = async () => {
    if (!token) return;
    try {
      const res = await getChatUnreadCount(token);
      setChatUnreadCount(res?.count || 0);
    } catch {
      setChatUnreadCount(0);
    }
  };

  useEffect(() => {
    if (user && token) {
      fetchChatUnread();
    }
  }, [user, token]);

  // Refetch chat unread when profile dropdown opens
  useEffect(() => {
    if (isProfileOpen && token) {
      fetchChatUnread();
    }
  }, [isProfileOpen, token]);

  const handleLogout = () => {
    logoutUser();
    setIsProfileOpen(false);
    navigate("/");
  };

  // Mark notification as read (API)
  const markAsRead = async (id) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await markNotificationAsRead(id, token);
    } catch (error) {
      console.error("Failed to mark as read:", error);
      // Revert on error
      fetchNotifications();
    }
  };

  // Mark all notifications as read (API)
  const markAllAsRead = async () => {
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);

    try {
      await markAllNotificationsAsRead(token);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
      // Revert on error
      fetchNotifications();
    }
  };

  // Remove notification (API)
  const removeNotification = async (id, e) => {
    e.stopPropagation();

    // Optimistic update
    const wasUnread = notifications.find((n) => n._id === id && !n.isRead);
    setNotifications((prev) => prev.filter((n) => n._id !== id));
    if (wasUnread) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    try {
      await deleteNotification(id, token);
    } catch (error) {
      console.error("Failed to delete notification:", error);
      // Revert on error
      fetchNotifications();
    }
  };

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case "warning":
        return <AlertCircle className="w-5 h-5 text-amber-500" />;
      case "error":
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case "info":
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  // Helper: Get Initials from Name
  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const getStreakColor = (streak) => {
    if (streak >= 30) return '#ff6b00';
    if (streak >= 14) return '#ff8800';
    if (streak >= 7) return '#ffa500';
    if (streak >= 3) return '#ffcc00';
    return '#ffd700';
  };

  const currentStreak = user?.loginStreak?.currentStreak || 0;

  return (
    <nav className="w-full sticky top-0 z-50 backdrop-blur-lg bg-white/80 border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
        <div className="flex items-center h-16 justify-between">
          {/* LEFT — Logo */}
          <div className="flex items-center min-w-fit">
            <Link
              to="/"
              className="flex items-center gap-3 hover:opacity-90 transition"
            >
              <img
                src={logo}
                alt="EduHackTech Logo"
                className="w-10 h-10 object-contain rounded-lg"
              />
              <span className="text-xl font-extrabold tracking-tight text-gray-800 hidden sm:block">
                EduHack<span className={primary}>Tech</span>
              </span>
            </Link>
          </div>

          {/* MIDDLE — Search */}
          <div className="hidden md:flex flex-1 justify-center px-8">
            <div className="relative w-full max-w-lg">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearch}
                className="block w-full pl-10 pr-4 py-2 rounded-full bg-gray-100 border border-transparent focus:border-blue-500/50 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all text-sm"
                placeholder={
                  mode === "learning"
                    ? "Search courses, skills, mentors..."
                    : "Search hackathons, teams, events..."
                }
              />
            </div>
          </div>

          {/* RIGHT — Actions */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-fit">
            {/* Mode Toggle */}
            <button
              onClick={handleModeToggle}
              className={`flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border transition-all duration-300 ${bgLight} border-gray-200 hover:shadow-md active:scale-95`}
            >
              {mode === "learning" ? (
                <>
                  <MonitorPlay className={`h-4 w-4 ${primary}`} />
                  <span
                    className={`text-sm font-semibold hidden sm:block ${primary}`}
                  >
                    Learning
                  </span>
                </>
              ) : (
                <>
                  <Trophy className={`h-4 w-4 ${primary}`} />
                  <span
                    className={`text-sm font-semibold hidden sm:block ${primary}`}
                  >
                    Compete
                  </span>
                </>
              )}
            </button>

            {user?.role === 'admin' && (
              <button
                onClick={() => navigate('/admin')}
                className={`flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-blue-200 bg-blue-50 hover:bg-blue-100 hover:shadow-md transition-all duration-300 active:scale-95 text-blue-600`}
              >
                <Shield className="h-4 w-4" />
                <span className="text-sm font-bold hidden md:block">Admin</span>
              </button>
            )}


            {/* Mobile Search Toggle */}
            <button
              onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
              className="md:hidden p-2 rounded-full hover:bg-gray-100 transition text-gray-600 focus:outline-none"
            >
              <Search className="h-5 w-5" />
            </button>

            {/* Notification Dropdown */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="relative p-2 rounded-full hover:bg-gray-100 transition text-gray-600 focus:outline-none"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white bg-gradient-to-r from-red-500 to-rose-500 rounded-full border-2 border-white shadow-sm">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Panel */}
              {isNotificationOpen && (
                <div className="notification-panel absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl shadow-2xl border border-white/20 overflow-hidden animate-in fade-in slide-in-from-top-2 origin-top-right">
                  {/* Glass Background */}
                  <div className="absolute inset-0 bg-white/70 backdrop-blur-xl"></div>

                  {/* Content */}
                  <div className="relative z-10">
                    {/* Header */}
                    <div className="px-5 py-4 border-b border-gray-100/50 bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-blue-600" />
                          <h3 className="text-base font-bold text-gray-900">Notifications</h3>
                          {unreadCount > 0 && (
                            <span className="px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full">
                              {unreadCount} new
                            </span>
                          )}
                        </div>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline transition"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Notification List */}
                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                      {notifLoading ? (
                        // Loading State
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                        </div>
                      ) : notifications.length > 0 ? (
                        notifications.map((notification) => (
                          <div
                            key={notification._id}
                            onClick={() => markAsRead(notification._id)}
                            className={`group relative px-5 py-4 border-b border-gray-50/50 hover:bg-white/60 cursor-pointer transition-all duration-200 ${!notification.isRead
                              ? "bg-blue-50/30"
                              : ""
                              }`}
                          >
                            <div className="flex gap-3">
                              {/* Icon */}
                              <div className={`flex-shrink-0 p-2 rounded-xl ${notification.type === "success"
                                ? "bg-emerald-50"
                                : notification.type === "warning"
                                  ? "bg-amber-50"
                                  : notification.type === "error"
                                    ? "bg-red-50"
                                    : "bg-blue-50"
                                }`}>
                                {getNotificationIcon(notification.type)}
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <p className={`text-sm font-semibold text-gray-900 ${!notification.isRead ? "text-gray-900" : "text-gray-700"
                                    }`}>
                                    {notification.title}
                                  </p>
                                  {!notification.isRead && (
                                    <span className="flex-shrink-0 w-2 h-2 mt-1.5 bg-blue-500 rounded-full"></span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                  {notification.message}
                                </p>
                                <p className="text-[10px] text-gray-400 mt-1.5 font-medium uppercase tracking-wide">
                                  {formatRelativeTime(notification.createdAt)}
                                </p>
                              </div>

                              {/* Remove Button */}
                              <button
                                onClick={(e) => removeNotification(notification._id, e)}
                                className="absolute top-3 right-3 p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-gray-100 transition-all duration-200 text-gray-400 hover:text-gray-600"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        // Empty State
                        <div className="flex flex-col items-center justify-center py-12 px-5">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center mb-4">
                            <Bell className="w-8 h-8 text-blue-300" />
                          </div>
                          <p className="text-sm font-semibold text-gray-700 mb-1">All caught up!</p>
                          <p className="text-xs text-gray-400 text-center">
                            No new notifications at the moment.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                      <div className="px-5 py-3 border-t border-gray-100/50 bg-gradient-to-r from-gray-50/50 to-white/50">
                        <Link
                          to="/notifications"
                          className="flex items-center justify-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 transition"
                          onClick={() => setIsNotificationOpen(false)}
                        >
                          View all notifications
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* --- AUTH SECTION --- */}
            {user ? (
              <div className="flex items-center gap-3 sm:gap-4">
                {/* Streak Badge */}
                {currentStreak > 0 && (
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-100 shadow-sm animate-in fade-in zoom-in duration-300 hidden sm:flex"
                    title={`Current Streak: ${currentStreak} days`}
                  >
                    <div className="relative">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill={getStreakColor(currentStreak)}
                        className="flame-icon"
                      >
                        <path d="M12 2C12 2 7 6 7 12C7 15.31 9.69 18 13 18C16.31 18 19 15.31 19 12C19 8 16 5 16 5C16 5 17 7 17 9C17 9 15 7 13 9C13 9 13.5 7 12 5C12 5 11 7 11 9C11 9 9 7 9 9C9 9 10 7 10 5L12 2Z" />
                        <path d="M13 18C13 18 11 20 11 21C11 21.55 11.45 22 12 22C12.55 22 13 21.55 13 21C13 20 13 18 13 18Z" />
                      </svg>
                    </div>
                    <span className="text-xs font-bold text-orange-700 tabular-nums">
                      {currentStreak}
                    </span>
                  </div>
                )}

                {/* Compiler / Terminal Button */}
                <button
                  onClick={() => setIsCompilerOpen(true)}
                  className="flex items-center justify-center p-2 rounded-full bg-gray-900 text-green-400 hover:bg-gray-800 hover:text-green-300 transition-all shadow-sm border border-gray-800 group"
                  title="Open Python Playground"
                >
                  <Terminal size={18} className="transition-transform group-hover:scale-110" />
                </button>

                <CompilerModal
                  isOpen={isCompilerOpen}
                  onClose={() => setIsCompilerOpen(false)}
                />

                {/* LOGGED IN: Avatar Dropdown */}
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center gap-2 focus:outline-none group"
                  >
                    <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-white group-hover:shadow-lg transition-all">
                      {getInitials(user.name)}
                    </div>
                    {/* Chevron for visual cue */}
                    <ChevronDown
                      size={14}
                      className={`text-gray-400 transition-transform duration-200 hidden sm:block ${isProfileOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {/* Dropdown Menu */}
                  {isProfileOpen && (
                    <div className="absolute right-0 mt-3 w-64 bg-white rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border border-gray-100 py-2 animate-in fade-in slide-in-from-top-2 origin-top-right">
                      {/* Header */}
                      <div className="px-4 py-3 border-b border-gray-50 mb-1">
                        <p className="text-sm font-bold text-gray-900 truncate">
                          {user.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {user.email}
                        </p>
                      </div>

                      {/* Menu Items */}
                      <div className="px-2 space-y-1">
                        <Link
                          to="/dashboard"
                          className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50 hover:text-blue-600 transition-colors"
                        >
                          <LayoutDashboard size={16} /> Dashboard
                        </Link>
                        <Link
                          to="/my-events"
                          className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50 hover:text-blue-600 transition-colors"
                        >
                          <Calendar size={16} /> My Events
                        </Link>
                        <Link
                          to="/my-courses"
                          className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50 hover:text-blue-600 transition-colors"
                        >
                          <BookOpen size={16} /> My Courses
                        </Link>
                        <Link
                          to="/my-registrations"
                          className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50 hover:text-blue-600 transition-colors"
                        >
                          <Trophy size={16} /> My Registrations
                        </Link>
                        <Link
                          to="/hackmates"
                          className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50 hover:text-blue-600 transition-colors"
                        >
                          <UserPlus2 size={16} /> Hackmates
                        </Link>
                        <Link
                          to="/team-finder"
                          onClick={() => { fetchChatUnread(); }}
                          className="relative flex items-center gap-3 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50 hover:text-blue-600 transition-colors"
                        >
                          <Users size={16} /> Find Teammates
                          {chatUnreadCount > 0 && (
                            <span className="absolute right-3 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full border-2 border-white">
                              {chatUnreadCount > 9 ? "9+" : chatUnreadCount}
                            </span>
                          )}
                        </Link>
                        <Link
                          to="/profile"
                          className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50 hover:text-blue-600 transition-colors"
                        >
                          <User size={16} /> My Profile
                        </Link>
                        <Link
                          to="/settings"
                          className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50 hover:text-blue-600 transition-colors"
                        >
                          <Settings size={16} /> Settings
                        </Link>
                      </div>

                      <div className="h-px bg-gray-100 my-2 mx-2"></div>

                      <div className="px-2">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 rounded-lg hover:bg-red-50 transition-colors text-left font-medium"
                        >
                          <LogOut size={16} /> Log Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // NOT LOGGED IN: Login Button
              <Link
                to="/login"
                className="flex items-center justify-center px-6 py-2 rounded-full text-sm font-semibold text-white bg-blue-600 shadow-md transition-all hover:scale-105 hover:bg-blue-700 hover:shadow-lg active:scale-95"
              >
                Login
              </Link>
            )}
          </div >
        </div >

        {/* Mobile Search Bar Overlay */}
        {
          isMobileSearchOpen && (
            <div className="md:hidden py-3 px-2 pb-4 animate-in slide-in-from-top-2 border-t border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearch}
                  className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-full focus:ring-2 focus:ring-blue-500/50 focus:bg-white transition-all text-sm"
                  placeholder={
                    mode === "learning"
                      ? "Search courses..."
                      : "Search hackathons..."
                  }
                  autoFocus
                />
              </div>
            </div>
          )
        }
      </div >
    </nav >
  );
};

export default Navbar;
