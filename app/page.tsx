'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { PlusCircle, FileText, Send, TrendingUp, CheckCircle, Clock, Download, ArrowRight, Sparkles, Building2 } from 'lucide-react';
import { ApplicationRecord, UserProfile } from '@/lib/db';

export default function DashboardPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [activity, setActivity] = useState({ applicationsToday: 0, emailsSentToday: 0, dailyEmailLimit: 50 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/profile').then(res => res.json()),
      fetch('/api/applications').then(res => res.json()),
      fetch('/api/emails').then(res => res.json()),
      fetch('/api/settings').then(res => res.json()),
    ]).then(([profileData, appData, emailData, settingsData]) => {
      if (profileData.profile) setProfile(profileData.profile);
      if (appData.applications) setApplications(appData.applications);
      
      const customLimit = settingsData.settings?.dailyEmailLimit || emailData.activity?.dailyEmailLimit || 50;
      if (emailData.activity) {
        setActivity({
          ...emailData.activity,
          dailyEmailLimit: customLimit,
        });
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const applicationsThisWeek = applications.length;
  const responseRate = applications.length > 0
    ? Math.round((applications.filter(a => ['Interview', 'Selected'].includes(a.status)).length / applications.length) * 100)
    : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-sky-950 p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-sky-400 text-sm font-semibold mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Workflow Assistant</span>
          </div>
          <h1 className="text-2xl font-bold text-white">
            Welcome back, {profile?.name || 'Developer'}!
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {profile ? 'Your Master CV is parsed and ready. Create tailored applications in under 2 minutes.' : 'Upload your LaTeX CV source code to initialize your Master Profile.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!profile ? (
            <Link
              href="/profile"
              className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-medium rounded-xl text-sm transition-all flex items-center gap-2 shadow-lg shadow-sky-600/30"
            >
              <FileText className="w-4 h-4" />
              Upload Master CV
            </Link>
          ) : (
            <Link
              href="/applications/new"
              className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-medium rounded-xl text-sm transition-all flex items-center gap-2 shadow-lg shadow-sky-600/30"
            >
              <PlusCircle className="w-4 h-4" />
              Create Application
            </Link>
          )}
        </div>
      </div>

      {/* Daily Activity Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Applications Today</span>
            <FileText className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-3xl font-bold text-white">{activity.applicationsToday}</div>
          <div className="text-xs text-slate-400">Generated & ready to apply</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Emails Sent Today</span>
            <Send className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-white">{activity.emailsSentToday} <span className="text-sm font-normal text-slate-400">/ {activity.dailyEmailLimit}</span></div>
          <div className="text-xs text-emerald-400">{Math.max(0, activity.dailyEmailLimit - activity.emailsSentToday)} remaining email quota</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Applications This Week</span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-bold text-white">{applicationsThisWeek}</div>
          <div className="text-xs text-slate-400">Total tracked applications</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Response Rate</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-bold text-white">{responseRate}%</div>
          <div className="text-xs text-slate-400">Interviews & offers ratio</div>
        </div>
      </div>

      {/* Master Profile & Extracted Skills Summary */}
      {profile && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-sky-400" />
              Master CV & Extracted Skills
            </h2>
            <Link href="/profile" className="text-xs font-medium text-sky-400 hover:text-sky-300 flex items-center gap-1">
              Manage Profile <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase">Languages</span>
              <div className="flex flex-wrap gap-1.5">
                {profile.skills.languages.map((s) => (
                  <span key={s} className="px-2 py-0.5 bg-slate-800 text-sky-300 text-xs font-medium rounded">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase">Frameworks</span>
              <div className="flex flex-wrap gap-1.5">
                {profile.skills.frameworks.map((s) => (
                  <span key={s} className="px-2 py-0.5 bg-slate-800 text-emerald-300 text-xs font-medium rounded">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase">Databases</span>
              <div className="flex flex-wrap gap-1.5">
                {profile.skills.databases.map((s) => (
                  <span key={s} className="px-2 py-0.5 bg-slate-800 text-indigo-300 text-xs font-medium rounded">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase">Tools</span>
              <div className="flex flex-wrap gap-1.5">
                {profile.skills.tools.map((s) => (
                  <span key={s} className="px-2 py-0.5 bg-slate-800 text-amber-300 text-xs font-medium rounded">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Applications Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm space-y-4">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-sky-400" />
              Application History
            </h2>
            <p className="text-xs text-slate-400">Tailored CVs, Cover Letters & match scores</p>
          </div>
          <Link href="/applications" className="text-xs font-medium text-sky-400 hover:text-sky-300 flex items-center gap-1">
            View All Applications ({applications.length}) <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {applications.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-slate-400 text-sm">No job applications generated yet.</p>
            <Link
              href="/applications/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-medium rounded-xl text-xs"
            >
              <PlusCircle className="w-4 h-4" /> Create First Application
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/60 text-xs font-semibold uppercase text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3.5">Company & Role</th>
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5">Match Score</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {applications.slice(0, 5).map((app) => (
                  <tr key={app.id} className="hover:bg-slate-800/30 transition-all">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{app.company}</div>
                      <div className="text-xs text-slate-400">{app.position}</div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">{app.date}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sky-400 text-sm">{app.matchScore.overall}%</span>
                        <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-sky-500 h-full" style={{ width: `${app.matchScore.overall}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        {app.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <a
                        href={app.resumePdfUrl || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 bg-sky-950/60 px-2.5 py-1 rounded border border-sky-800/60"
                      >
                        <Download className="w-3 h-3" /> Resume.pdf
                      </a>
                      <a
                        href={`/api/applications/${app.id}/download`}
                        className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-800/60"
                      >
                        <Download className="w-3 h-3" /> ZIP
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
