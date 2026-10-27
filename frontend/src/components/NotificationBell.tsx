import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  CheckCheck,
  Check,
  ExternalLink,
  Clock,
  AlertCircle,
  FileText,
  FolderGit2,
  TrendingUp,
} from 'lucide-react';
import { notificationsApi } from '../services/api';
import { NotificationDto } from '../types';

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = async () => {
    try {
      const count = await notificationsApi.getUnreadCount();
      setUnreadCount(count);
    } catch {
      // Non-fatal unread count failure
    }
  };

  const fetchNotifications = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await notificationsApi.getNotifications({
        limit: 30,
        isRead: filter === 'unread' ? false : undefined,
      });
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Failed to load notifications.');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial count load
  useEffect(() => {
    fetchUnreadCount();
  }, []);

  // Fetch notifications whenever opened or filter changes
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, filter]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationsApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to mark notification as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to mark all as read');
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'PROPOSAL_APPROVED':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'PROPOSAL_CHANGES_REQUESTED':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'PROPOSAL_SUBMITTED':
      case 'PROPOSAL_RESUBMITTED':
        return 'bg-indigo-50 text-indigo-800 border-indigo-200';
      case 'DOCUMENT_UPLOADED':
      case 'DOCUMENT_REVISED':
        return 'bg-sky-50 text-sky-800 border-sky-200';
      case 'MILESTONE_REVIEWED':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'MILESTONE_UPDATED':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      case 'MILESTONE_OVERDUE':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'DEADLINE_APPROACHING':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'PROJECT_EVALUATION':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getTypeIcon = (type: string) => {
    if (type.startsWith('PROPOSAL')) return <FileText className="w-3.5 h-3.5 text-slate-600" />;
    if (type.startsWith('DOCUMENT')) return <FolderGit2 className="w-3.5 h-3.5 text-sky-600" />;
    if (type.startsWith('MILESTONE') || type.startsWith('DEADLINE'))
      return <TrendingUp className="w-3.5 h-3.5 text-amber-600" />;
    return <AlertCircle className="w-3.5 h-3.5 text-slate-600" />;
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="View notifications"
        className="relative p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition border border-transparent hover:border-slate-200"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-rose-600 text-white font-bold text-[10px] rounded-full min-w-4 text-center shadow-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg border border-slate-200 shadow-xl z-50 overflow-hidden flex flex-col max-h-[500px]">
          {/* Header */}
          <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-xs text-slate-900">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="inline-flex items-center space-x-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 transition"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-slate-500" />
                  <span>Mark all read</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter Sub-bar */}
          <div className="px-3.5 py-2 border-b border-slate-100 bg-white flex items-center justify-between text-[11px]">
            <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-md">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-2.5 py-0.5 rounded-sm font-semibold transition ${
                  filter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilter('unread')}
                className={`px-2.5 py-0.5 rounded-sm font-semibold transition ${
                  filter === 'unread' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Unread
              </button>
            </div>
            <span className="text-[10px] text-slate-400">Chronological activity</span>
          </div>

          {/* List Content */}
          <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
            {isLoading ? (
              <div className="py-8 text-center text-xs text-slate-500">Loading notifications...</div>
            ) : errorMsg ? (
              <div className="p-4 text-xs text-rose-700 bg-rose-50 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400 space-y-1">
                <Bell className="w-6 h-6 mx-auto text-slate-300" />
                <p>No {filter === 'unread' ? 'unread' : ''} notifications at this time.</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3 transition hover:bg-slate-50 flex items-start justify-between gap-3 text-xs ${
                    !notif.isRead ? 'bg-slate-50/70 border-l-2 border-l-slate-900' : 'bg-white'
                  }`}
                >
                  <div className="flex items-start space-x-2.5 flex-1 min-w-0">
                    <div className="p-1.5 rounded-md bg-white border border-slate-200 shrink-0 mt-0.5">
                      {getTypeIcon(notif.type)}
                    </div>

                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center space-x-1.5 flex-wrap">
                        <span className="font-semibold text-slate-900 text-xs">{notif.title}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${getTypeBadge(notif.type)}`}>
                          {notif.type.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600 leading-relaxed break-words">{notif.message}</p>

                      <div className="flex items-center space-x-2 text-[10px] text-slate-400 pt-0.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{notif.createdAt.substring(0, 10)}</span>
                        {notif.isRead && <span className="text-emerald-600 font-medium">• Read</span>}
                        {notif.link && (
                          <span className="inline-flex items-center space-x-0.5 text-[10px] font-semibold text-slate-600">
                            <span>Details</span>
                            <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {!notif.isRead && (
                    <button
                      type="button"
                      onClick={(e) => handleMarkAsRead(notif.id, e)}
                      title="Mark as read"
                      className="p-1 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-200/60 transition shrink-0 mt-0.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
