'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, PlusCircle, Briefcase, Mail, CheckCircle2, Sparkles, Bot, Users, UserCheck, Shield, Plus } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const [stats, setStats] = useState({ applicationsToday: 0, emailsSentToday: 0, dailyEmailLimit: 50 });
  const [activeUserId, setActiveUserId] = useState<string>('default_user');
  const [availableUsers, setAvailableUsers] = useState<string[]>(['default_user']);
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [newUserIdInput, setNewUserIdInput] = useState('');

  const fetchSession = () => {
    fetch('/api/user-session')
      .then((res) => res.json())
      .then((data) => {
        if (data.activeUserId) setActiveUserId(data.activeUserId);
        if (data.availableUsers) setAvailableUsers(data.availableUsers);
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

  const handleSwitchUser = async (userId: string) => {
    try {
      await fetch('/api/user-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      window.location.reload();
    } catch {
      alert('Failed to switch workspace account.');
    }
  };

  const handleCreateNewUser = async () => {
    if (!newUserIdInput || !newUserIdInput.trim()) {
      alert('Please enter a valid user workspace account name.');
      return;
    }
    const clean = newUserIdInput.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
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
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col justify-between min-h-screen border-r border-slate-800">
      <div>
        {/* Brand Header */}
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
  );
}
