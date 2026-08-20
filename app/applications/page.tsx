'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Briefcase, LayoutGrid, Table as TableIcon, Download, ExternalLink, PlusCircle, Search, Mail, FileText, CheckCircle2, RefreshCw, Send, Trash2, User, Layers } from 'lucide-react';
import { ApplicationRecord } from '@/lib/db';

const STATUS_STAGES: Array<ApplicationRecord['status']> = [
  'Saved',
  'Generated',
  'Applied',
  'Email Sent',
  'Follow-up',
  'Interview',
  'Rejected',
  'Selected',
  'Withdrawn',
];

export default function ApplicationsTrackerPage() {
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<string>('all');
  const [regenerating, setRegenerating] = useState(false);

  const fetchApplications = () => {
    fetch('/api/applications')
      .then(res => res.json())
      .then(data => {
        if (data.applications) setApplications(data.applications);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: ApplicationRecord['status']) => {
    try {
      await fetch(`/api/applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchApplications();
    } catch {
      alert('Failed to update status.');
    }
  };

  const handleDeleteApplication = async (id: string) => {
    if (!confirm('Are you sure you want to delete this application record?')) return;
    try {
      await fetch(`/api/applications/${id}`, { method: 'DELETE' });
      fetchApplications();
    } catch {
      alert('Failed to delete application.');
    }
  };

  const handleRegenerateAllPDFs = async () => {
    setRegenerating(true);
    try {
      const res = await fetch('/api/applications/regenerate', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(data.message || 'All application PDFs re-compiled with clean pixel-perfect engine!');
        fetchApplications();
      }
    } catch {
      alert('Failed to re-compile PDFs.');
    } finally {
      setRegenerating(false);
    }
  };

  const handleResendEmail = async (app: ApplicationRecord) => {
    try {
      const res = await fetch('/api/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', emailQueueId: `email_${app.id}` }),
      });
      const data = await res.json();
      alert(data.message || 'Resend action completed.');
      fetchApplications();
    } catch {
      alert('Error resending email.');
    }
  };

  // Unique Candidates/Templates list for Filter
  const candidateNames = Array.from(new Set(applications.map(a => a.candidateName || 'Vinayak Srivastava')));

  const filteredApps = applications.filter(a => {
    const matchesSearch =
      a.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.candidateName && a.candidateName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCandidate =
      selectedCandidate === 'all' || (a.candidateName || 'Vinayak Srivastava') === selectedCandidate;

    return matchesSearch && matchesCandidate;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-sky-400" />
            User Job Application Tracker
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track application stages, candidate profiles, tailored LaTeX resume versions, cover letters, and email histories.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleRegenerateAllPDFs}
            disabled={regenerating || applications.length === 0}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
            {regenerating ? 'Re-Compiling All PDFs...' : 'Fix & Re-Generate All PDFs'}
          </button>

          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'kanban' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-4 h-4" /> Kanban
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'table' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <TableIcon className="w-4 h-4" /> Table
            </button>
          </div>

          <Link
            href="/applications/new"
            className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-medium rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-lg shadow-sky-600/30"
          >
            <PlusCircle className="w-4 h-4" /> New Application
          </Link>
        </div>
      </div>

      {/* Search & Candidate Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-8 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter applications by company, position, or candidate name..."
            className="w-full bg-slate-900 text-sm text-white pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="sm:col-span-4 flex items-center gap-2">
          <User className="w-4 h-4 text-sky-400 shrink-0" />
          <select
            value={selectedCandidate}
            onChange={(e) => setSelectedCandidate(e.target.value)}
            className="w-full bg-slate-900 text-xs text-white px-3 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-sky-500 font-semibold"
          >
            <option value="all">All Candidates & Profiles ({applications.length})</option>
            {candidateNames.map((name) => (
              <option key={name} value={name}>
                Candidate: {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Kanban View */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
          {STATUS_STAGES.slice(0, 5).map((stage) => {
            const stageApps = filteredApps.filter(a => a.status === stage);
            return (
              <div key={stage} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3 min-w-[240px]">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">{stage}</span>
                  <span className="px-2 py-0.5 bg-slate-800 text-sky-400 text-xs font-bold rounded-full">
                    {stageApps.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {stageApps.map((app) => (
                    <div key={app.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2 hover:border-slate-700 transition-all shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-white text-sm">{app.company}</h4>
                          <p className="text-xs text-slate-400 font-medium">{app.position}</p>
                          <p className="text-[11px] text-sky-400 font-semibold flex items-center gap-1 mt-0.5">
                            <User className="w-3 h-3" /> {app.candidateName || 'Vinayak Srivastava'}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs font-bold text-sky-400 bg-sky-950 px-1.5 py-0.5 rounded border border-sky-900">
                            {app.matchScore.overall}%
                          </span>
                          <button
                            onClick={() => handleDeleteApplication(app.id)}
                            className="p-1 text-rose-400 hover:text-rose-300"
                            title="Delete Application Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-500">{app.date}</div>

                      {/* Stage Selector */}
                      <select
                        value={app.status}
                        onChange={(e) => handleUpdateStatus(app.id, e.target.value as ApplicationRecord['status'])}
                        className="w-full bg-slate-900 text-xs text-slate-300 px-2 py-1 rounded border border-slate-800 focus:outline-none"
                      >
                        {STATUS_STAGES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>

                      <div className="pt-1 flex items-center justify-between text-xs">
                        <a
                          href={app.resumePdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sky-400 hover:underline flex items-center gap-1 font-semibold"
                        >
                          <FileText className="w-3 h-3" /> Resume PDF
                        </a>
                        <a
                          href={`/api/applications/${app.id}/download`}
                          className="text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                        >
                          <Download className="w-3 h-3" /> ZIP
                        </a>
                      </div>
                    </div>
                  ))}
                  {stageApps.length === 0 && (
                    <div className="text-center py-6 text-xs text-slate-600 border border-dashed border-slate-800 rounded-xl">
                      No applications
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-xs font-semibold uppercase text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3.5">Candidate / User</th>
                  <th className="px-6 py-3.5">Company & Position</th>
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5">Match Score</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Recruiter</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredApps.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-800/30 transition-all">
                    <td className="px-6 py-4">
                      <div className="font-bold text-sky-400 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" /> {app.candidateName || 'Vinayak Srivastava'}
                      </div>
                      <div className="text-[11px] text-slate-400">{app.templateTitle || 'Master Resume'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-white">{app.company}</div>
                      <div className="text-xs text-slate-400">{app.position}</div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">{app.date}</td>
                    <td className="px-6 py-4 font-bold text-sky-400">{app.matchScore.overall}%</td>
                    <td className="px-6 py-4">
                      <select
                        value={app.status}
                        onChange={(e) => handleUpdateStatus(app.id, e.target.value as ApplicationRecord['status'])}
                        className="bg-slate-950 text-xs text-slate-300 px-2.5 py-1 rounded-lg border border-slate-800"
                      >
                        {STATUS_STAGES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400 font-mono">{app.recruiterEmail || 'Not specified'}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handleResendEmail(app)}
                        className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-950 px-2.5 py-1 rounded border border-indigo-800"
                      >
                        <Send className="w-3 h-3" /> Resend
                      </button>
                      <a
                        href={app.resumePdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 bg-sky-950 px-2.5 py-1 rounded border border-sky-800"
                      >
                        Resume PDF
                      </a>
                      <button
                        onClick={() => handleDeleteApplication(app.id)}
                        className="inline-flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 bg-rose-950 px-2 py-1 rounded border border-rose-900"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
