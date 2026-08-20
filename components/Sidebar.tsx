'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, PlusCircle, Briefcase, Mail, CheckCircle2, Sparkles, Bot, Users, Shield, Plus, Menu, X } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const [stats, setStats] = useState({ applicationsToday: 0, emailsSentToday: 0, dailyEmailLimit: 50 });
  const [activeUserId, setActiveUserId] = useState<string>('default_user');
  const [availableUsers, setAvailableUsers] = useState<string[]>(['default_user']);
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [newUserIdInput, setNewUserIdInput] = useState('');
  const [isOpenMobile, setIsOpenMobile] = useState(false);

  const fetchSession = () => {
    // 1. Restore from localStorage if available
    try {
      const stored = localStorage.getItem('hunt_active_user_id');
      if (stored && stored.trim()) {
        setActiveUserId(stored.trim());
      }
      const storedUsers = localStorage.getItem('hunt_available_users');
      if (storedUsers) {
        const parsed = JSON.parse(storedUsers);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAvailableUsers(parsed);
        }
      }
    } catch {}

    fetch('/api/user-session')
      .then((res) => res.json())
      .then((data) => {
        if (data.activeUserId) {
          setActiveUserId(data.activeUserId);
          try {
            localStorage.setItem('hunt_active_user_id', data.activeUserId);
          } catch {}
        }
        if (data.availableUsers && Array.isArray(data.availableUsers)) {
          setAvailableUsers((prev) => {
            const merged = Array.from(new Set([...prev, ...data.availableUsers]));
            try {
              localStorage.setItem('hunt_available_users', JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchSession();
    fetch('/api/emails')
      .then((res) => res.json())
      .then((data) => {
        if (data.activity) setStats(data.activity);
      })
      .catch(() => {});
  }, [pathname]);

  // Close mobile drawer when route changes
  useEffect(() => {
    setIsOpenMobile(false);
  }, [pathname]);

  const handleSwitchUser = async (userId: string) => {
    const clean = userId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    
    // Update local state & localStorage immediately
    const updatedUsers = Array.from(new Set([...availableUsers, clean]));
    setAvailableUsers(updatedUsers);
    setActiveUserId(clean);

    try {
      localStorage.setItem('hunt_active_user_id', clean);
      localStorage.setItem('hunt_available_users', JSON.stringify(updatedUsers));
      document.cookie = `hunt_user_id=${clean}; path=/; max-age=2592000; SameSite=Lax`;
    } catch {}

    try {
      await fetch('/api/user-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: clean }),
      });
    } catch {}

    window.location.reload();
  };

  const handleCreateNewUser = async () => {
    if (!newUserIdInput || !newUserIdInput.trim()) {
      alert('Please enter a valid user workspace account name.');
      return;
    }
    const clean = newUserIdInput.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    setShowNewUserModal(false);
    setNewUserIdInput('');
    await handleSwitchUser(clean);
  };

  const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Master CV & Profile', href: '/profile', icon: FileText },
    { label: 'Create Application', href: '/applications/new', icon: PlusCircle },
    { label: 'Job Discovery & Worker', href: '/job-discovery', icon: Bot },
    { label: 'Recruiter Excel Directory', href: '/recruiters', icon: Users },
    { label: 'Application Tracker', href: '/applications', icon: Briefcase },
    { label: 'Daily & Cold Email', href: '/emails', icon: Mail },
  ];

  return (
    <>
      {/* Mobile Top Navigation Header */}
      <div className="md:hidden flex items-center justify-between bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-40 w-full">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-sky-600 rounded-lg text-white">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-white leading-tight">AI Job Dashboard</h1>
            <p className="text-[10px] text-sky-400 font-mono font-semibold">User: {activeUserId}</p>
          </div>
        </div>

        <button
          onClick={() => setIsOpenMobile(!isOpenMobile)}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 focus:outline-none"
          aria-label="Toggle Navigation Menu"
        >
          {isOpenMobile ? <X className="w-5 h-5 text-rose-400" /> : <Menu className="w-5 h-5 text-sky-400" />}
        </button>
      </div>

      {/* Backdrop Overlay for Mobile */}
      {isOpenMobile && (
        <div
          onClick={() => setIsOpenMobile(false)}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:static top-0 left-0 bottom-0 z-50 w-64 bg-slate-900 text-slate-100 flex flex-col justify-between border-r border-slate-800 transition-transform duration-300 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } min-h-screen`}
      >
        <div>
          {/* Brand Header (Desktop) */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-sky-600 rounded-lg text-white">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-bold text-sm text-white leading-tight">AI Job Dashboard</h1>
                <p className="text-[11px] text-sky-400 font-medium">Multi-Tenant Suite</p>
              </div>
            </div>
            {isOpenMobile && (
              <button
                onClick={() => setIsOpenMobile(false)}
                className="md:hidden text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* User Account Isolated Workspace Selector */}
          <div className="p-3 border-b border-slate-800/80 bg-slate-950/60 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
              <span className="flex items-center gap-1 text-slate-300">
                <Shield className="w-3 h-3 text-emerald-400" /> Private Account Workspace
              </span>
              <button
                onClick={() => setShowNewUserModal(!showNewUserModal)}
                className="text-sky-400 hover:text-sky-300 flex items-center gap-0.5 font-bold"
                title="Create New User Account Workspace"
              >
                <Plus className="w-3 h-3" /> New
              </button>
            </div>

            <select
              value={activeUserId}
              onChange={(e) => handleSwitchUser(e.target.value)}
              className="w-full bg-slate-900 text-xs font-bold text-sky-300 px-2.5 py-1.5 rounded-lg border border-slate-800 focus:outline-none focus:border-sky-500 font-mono"
            >
              {availableUsers.map((u) => (
                <option key={u} value={u}>
                  User: {u}
                </option>
              ))}
            </select>

            {showNewUserModal && (
              <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg space-y-2 pt-2">
                <input
                  type="text"
                  value={newUserIdInput}
                  onChange={(e) => setNewUserIdInput(e.target.value)}
                  placeholder="Enter User Account Name..."
                  className="w-full bg-slate-950 text-xs text-white px-2 py-1.5 rounded border border-slate-800 font-mono"
                />
                <div className="flex justify-end gap-1">
                  <button
                    onClick={() => setShowNewUserModal(false)}
                    className="px-2 py-1 bg-slate-800 text-slate-400 text-[10px] rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateNewUser}
                    className="px-2 py-1 bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-bold rounded"
                  >
                    Create Workspace
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Daily Limits Card */}
        <div className="p-4 m-3 bg-slate-800/80 rounded-xl border border-slate-700/60 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span>Daily Email Cap</span>
            <span className="text-sky-400">{stats.emailsSentToday} / {stats.dailyEmailLimit}</span>
          </div>
          <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
            <div
              className="bg-sky-500 h-full transition-all duration-300"
              style={{ width: `${Math.min(100, (stats.emailsSentToday / stats.dailyEmailLimit) * 100)}%` }}
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{Math.max(0, stats.dailyEmailLimit - stats.emailsSentToday)} slots remaining today</span>
          </div>
        </div>
      </aside>
    </>
  );
}
