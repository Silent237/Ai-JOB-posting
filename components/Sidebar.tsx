'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, PlusCircle, Briefcase, Mail, CheckCircle2, Sparkles, Bot, Users, Sun, Moon } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const [stats, setStats] = useState({ applicationsToday: 0, emailsSentToday: 0, dailyEmailLimit: 50 });
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    fetch('/api/emails')
      .then((res) => res.json())
      .then((data) => {
        if (data.activity) setStats(data.activity);
      })
      .catch(() => {});
  }, [pathname]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' || 'light';
    setTheme(savedTheme);
    if (savedTheme === 'light') {
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
    } else {
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    if (nextTheme === 'light') {
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
    } else {
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
    }
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
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col justify-between min-h-screen border-r border-slate-800 transition-colors">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-600 rounded-lg text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base text-white leading-tight">AI Job Dashboard</h1>
              <p className="text-xs text-sky-400 font-medium">User-Centric Suite</p>
            </div>
          </div>

          <button
            onClick={toggleTheme}
            title="Toggle Light/Dark Theme"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all border border-slate-700"
          >
            {theme === 'light' ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
          </button>
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
          <span>Daily Email Limit</span>
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
          <span>{stats.dailyEmailLimit - stats.emailsSentToday} email slots remaining today</span>
        </div>
      </div>
    </aside>
  );
}
