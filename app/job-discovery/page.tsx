'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Search, Bot, Play, Pause, RefreshCw, Plus, Link as LinkIcon, FileText, CheckCircle2, AlertTriangle, Layers, ArrowRight, Zap, ExternalLink, Globe, Plane, Building2, Send, ChevronDown, Radio, Mail } from 'lucide-react';
import { DiscoveredJob } from '@/lib/job-fetcher';
import { WorkerState } from '@/lib/auto-worker';

export default function JobDiscoveryPage() {
  const [activeUserId, setActiveUserId] = useState('default_user');
  const [searchQuery, setSearchQuery] = useState('Full Stack Developer');
  const [locationQuery, setLocationQuery] = useState('India / Remote');
  const [jobs, setJobs] = useState<DiscoveredJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [displayCount, setDisplayCount] = useState(25);
  const [autoRefreshFeed, setAutoRefreshFeed] = useState(true);
  const [customEmails, setCustomEmails] = useState<{ [key: string]: string }>({});

  const [queuedJobs, setQueuedJobs] = useState<DiscoveredJob[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [autoSend, setAutoSend] = useState(false);
  const [minScore, setMinScore] = useState(65);
  const [processedCount, setProcessedCount] = useState(0);
  const [logs, setLogs] = useState<Array<{ timestamp: string; message: string; type: 'info' | 'success' | 'warn' | 'error' }>>([
    { timestamp: new Date().toLocaleTimeString(), message: 'Autonomous Job Application Worker ready.', type: 'info' }
  ]);

  const [urlInput, setUrlInput] = useState('');
  const [bulkInput, setBulkInput] = useState('');
  const [importing, setImporting] = useState(false);
  const isProcessingRef = useRef(false);

  // Detect active user ID & restore queuedJobs & isRunning from LocalStorage on mount
  useEffect(() => {
    let currentId = 'default_user';
    try {
      const storedId = localStorage.getItem('hunt_active_user_id');
      if (storedId) {
        currentId = storedId.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
        setActiveUserId(currentId);
      }

      const storedQueue = localStorage.getItem(`hunt_worker_queued_jobs_${currentId}`);
      if (storedQueue) {
        const parsed = JSON.parse(storedQueue);
        if (Array.isArray(parsed)) setQueuedJobs(parsed);
      }
      const storedRun = localStorage.getItem(`hunt_worker_is_running_${currentId}`);
      if (storedRun !== null) setIsRunning(storedRun === 'true');
    } catch {}

    fetchJobs();
    fetchWorkerState(currentId);
  }, []);

  const saveQueueToStorage = (newQueue: DiscoveredJob[], targetUser = activeUserId) => {
    setQueuedJobs(newQueue);
    try {
      localStorage.setItem(`hunt_worker_queued_jobs_${targetUser}`, JSON.stringify(newQueue));
    } catch {}
  };

  const addLog = (message: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') => {
    setLogs(prev => [
      { timestamp: new Date().toLocaleTimeString(), message, type },
      ...prev.slice(0, 49)
    ]);
  };

  const fetchJobs = (queryStr = searchQuery, locStr = locationQuery) => {
    setLoadingJobs(true);
    fetch(`/api/jobs?q=${encodeURIComponent(queryStr)}&loc=${encodeURIComponent(locStr)}`)
      .then(res => res.json())
      .then(data => {
        if (data.jobs) {
          setJobs(data.jobs);
          setDisplayCount(25);
        }
        setLoadingJobs(false);
      })
      .catch(() => setLoadingJobs(false));
  };

  const fetchWorkerState = (userId = activeUserId) => {
    fetch('/api/worker')
      .then(res => res.json())
      .then(data => {
        if (data.state) {
          setMinScore(data.state.minMatchScore);
          setAutoSend(Boolean(data.state.autoSendEmail));
          if (data.state.processedCount > processedCount) {
            setProcessedCount(data.state.processedCount);
          }
          if (Array.isArray(data.state.logs) && data.state.logs.length > 0) {
            setLogs(prev => {
              const combined = [...data.state.logs, ...prev];
              const unique = Array.from(new Set(combined.map(l => `${l.timestamp}_${l.message}`)))
                .map(key => combined.find(l => `${l.timestamp}_${l.message}` === key)!);
              return unique.slice(0, 50);
            });
          }
        }
      })
      .catch(() => {});
  };

  // Periodic Auto-Refresh for Live Jobs Feed (60-second Interval)
  useEffect(() => {
    if (!autoRefreshFeed) return;
    const feedInterval = setInterval(() => {
      fetchJobs(searchQuery, locationQuery);
    }, 60000);
    return () => clearInterval(feedInterval);
  }, [autoRefreshFeed, searchQuery, locationQuery]);

  // Autonomous worker processing loop driven by React state & LocalStorage
  useEffect(() => {
    if (isRunning && queuedJobs.length > 0 && !isProcessingRef.current) {
      const timer = setTimeout(() => {
        processNextInClientQueue();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [isRunning, queuedJobs]);

  const processNextInClientQueue = async () => {
    if (queuedJobs.length === 0 || isProcessingRef.current) return;
    isProcessingRef.current = true;

    const currentJob = queuedJobs[0];
    addLog(`[Worker] Processing: "${currentJob.title}" at ${currentJob.company}`, 'info');

    try {
      const res = await fetch('/api/worker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'process_single', job: currentJob, userId: activeUserId }),
      });
      const data = await res.json();
      if (data.success) {
        addLog(`[Worker Success] Tailored CV & Cover Letter created for ${currentJob.company}`, 'success');
        setProcessedCount(prev => prev + 1);

        // Save application into client LocalStorage cache for instant /applications page display
        if (data.application) {
          try {
            const existingAppsRaw = localStorage.getItem(`hunt_applications_${activeUserId}`);
            const existingApps = existingAppsRaw ? JSON.parse(existingAppsRaw) : [];
            existingApps.unshift(data.application);
            localStorage.setItem(`hunt_applications_${activeUserId}`, JSON.stringify(existingApps));
          } catch {}
        }

        // Save email item into client LocalStorage cache for instant /emails page display
        if (data.emailItem) {
          try {
            const existingEmailsRaw = localStorage.getItem(`hunt_email_queue_${activeUserId}`);
            const existingEmails = existingEmailsRaw ? JSON.parse(existingEmailsRaw) : [];
            existingEmails.unshift(data.emailItem);
            localStorage.setItem(`hunt_email_queue_${activeUserId}`, JSON.stringify(existingEmails));
          } catch {}
        }

      } else {
        addLog(`[Worker Error] ${data.message || 'Failed processing job'}`, 'error');
      }
    } catch (err: any) {
      addLog(`[Worker Error] ${err.message}`, 'error');
    } finally {
      const remaining = queuedJobs.slice(1);
      saveQueueToStorage(remaining);
      isProcessingRef.current = false;
    }
  };

  const handleToggleWorker = () => {
    const nextState = !isRunning;
    setIsRunning(nextState);
    try {
      localStorage.setItem(`hunt_worker_is_running_${activeUserId}`, nextState ? 'true' : 'false');
    } catch {}
    fetch('/api/worker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle', isRunning: nextState, userId: activeUserId }),
    }).catch(() => {});
    addLog(`Autonomous worker ${nextState ? 'STARTED' : 'PAUSED'}`, 'info');
  };

  const handleEnqueueSingle = async (job: DiscoveredJob) => {
    const overrideEmail = customEmails[job.id]?.trim();
    const finalJob = overrideEmail ? { ...job, url: overrideEmail } : job;
    
    const existingKeys = new Set(queuedJobs.map(j => `${j.company.toLowerCase().trim()}_${j.title.toLowerCase().trim()}`));
    const key = `${finalJob.company.toLowerCase().trim()}_${finalJob.title.toLowerCase().trim()}`;

    if (!existingKeys.has(key)) {
      const updated = [...queuedJobs, finalJob];
      saveQueueToStorage(updated);
      addLog(`Queued "${finalJob.title}" at ${finalJob.company} for auto-application`, 'info');
      try {
        await fetch('/api/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'enqueue', jobs: [finalJob], userId: activeUserId }),
        });
      } catch {}
    } else {
      addLog(`Job "${finalJob.title}" at ${finalJob.company} is already in your queue.`, 'warn');
    }
  };

  const handleEnqueueAll = async () => {
    if (jobs.length === 0) return;
    const existingKeys = new Set(queuedJobs.map(j => `${j.company.toLowerCase().trim()}_${j.title.toLowerCase().trim()}`));
    
    let addedCount = 0;
    const newJobs: DiscoveredJob[] = [];

    jobs.forEach(j => {
      const key = `${j.company.toLowerCase().trim()}_${j.title.toLowerCase().trim()}`;
      if (!existingKeys.has(key)) {
        newJobs.push(j);
        existingKeys.add(key);
        addedCount++;
      }
    });

    const updated = [...queuedJobs, ...newJobs];
    saveQueueToStorage(updated);
    addLog(`⚡ Queued ${addedCount} new discovered job(s) into your worker queue!`, 'success');

    try {
      await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'enqueue', jobs: newJobs, userId: activeUserId }),
      });
    } catch {}

    alert(`⚡ Successfully queued ${addedCount} new jobs into your private worker queue! (Total in queue: ${updated.length})`);
  };

  const handleImportUrl = async () => {
    if (!urlInput.trim()) return;
    setImporting(true);
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import_url', jobUrl: urlInput, userId: activeUserId }),
      });
      const data = await res.json();
      if (data.job) {
        handleEnqueueSingle(data.job);
        setUrlInput('');
      }
    } catch {
      alert('Error importing URL.');
    } finally {
      setImporting(false);
    }
  };

  const handleImportBulk = async () => {
    if (!bulkInput.trim()) return;
    setImporting(true);
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import_bulk', bulkText: bulkInput, userId: activeUserId }),
      });
      const data = await res.json();
      if (data.count) {
        setBulkInput('');
        addLog(`Imported ${data.count} bulk job descriptions into queue`, 'info');
      }
    } catch {
      alert('Error importing bulk JDs.');
    } finally {
      setImporting(false);
    }
  };

  const handlePresetSearch = (channel: string) => {
    if (channel === 'mnc') {
      setSearchQuery('Deloitte Accenture Barclays Harman TCS');
      setLocationQuery('India / Remote');
      fetchJobs('Deloitte Accenture Barclays Harman TCS', 'India / Remote');
    } else if (channel === 'remote') {
      setSearchQuery('Full Stack Remote India');
      setLocationQuery('Global Remote');
      fetchJobs('Full Stack Remote India', 'Global Remote');
    } else if (channel === 'visa') {
      setSearchQuery('Visa Sponsorship Relocation');
      setLocationQuery('Worldwide');
      fetchJobs('Visa Sponsorship Relocation', 'Worldwide');
    }
  };

  const visibleJobs = jobs.slice(0, displayCount);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-sm font-semibold mb-1">
            <Bot className="w-4 h-4" />
            <span>Autonomous Background Worker & Multi-Source Job Engine</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Job Discovery (50-100+ Live Postings)</h1>
          <p className="text-xs text-slate-400 mt-1">
            Aggregates 50+ live job openings daily across India MNCs, Remote tech platforms, and Visa sponsored opportunities. The background worker processes deduplicated jobs and applies automatically up to 50 emails/day.
          </p>
        </div>

        {/* Worker Control Switch */}
        <div className="flex items-center gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
          <div>
            <div className="text-xs text-slate-400 font-semibold uppercase">Auto-Worker Status</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`w-2.5 h-2.5 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="text-sm font-bold text-white">{isRunning ? 'Running' : 'Paused'}</span>
            </div>
          </div>
          <button
            onClick={handleToggleWorker}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md ${
              isRunning
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isRunning ? 'Pause Worker' : 'Start Auto-Worker'}
          </button>
        </div>
      </div>

      {/* Target Channel Preset Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => handlePresetSearch('mnc')}
          className="p-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-2xl text-left transition-all space-y-1 group"
        >
          <div className="flex items-center justify-between text-sky-400">
            <span className="font-bold text-sm text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-sky-400" /> 🇮🇳 Top India MNCs
            </span>
            <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <p className="text-xs text-slate-400">Deloitte, Barclays, Accenture, Harman, TCS, Infosys</p>
        </button>

        <button
          onClick={() => handlePresetSearch('remote')}
          className="p-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-2xl text-left transition-all space-y-1 group"
        >
          <div className="flex items-center justify-between text-emerald-400">
            <span className="font-bold text-sm text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-400" /> 🌍 Global Remote (Hires in India)
            </span>
            <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <p className="text-xs text-slate-400">Full Stack, AI Evaluator, PHP & React roles</p>
        </button>

        <button
          onClick={() => handlePresetSearch('visa')}
          className="p-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-2xl text-left transition-all space-y-1 group"
        >
          <div className="flex items-center justify-between text-indigo-400">
            <span className="font-bold text-sm text-white flex items-center gap-2">
              <Plane className="w-4 h-4 text-indigo-400" /> ✈️ Relocation & Visa Sponsored
            </span>
            <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <p className="text-xs text-slate-400">Canonical, Booking.com, EU/UK Tech Relocation</p>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Job Discovery & URL Importer */}
        <div className="lg:col-span-7 space-y-6">
          {/* Job Search & Filter */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Search className="w-5 h-5 text-sky-400" />
                Live Job Feed ({jobs.length} Discovered)
              </h2>

              <div className="flex items-center gap-2 flex-wrap">
                {jobs.length > 0 && (
                  <button
                    onClick={handleEnqueueAll}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-md shadow-emerald-600/30"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    ⚡ Queue All ({jobs.length})
                  </button>
                )}

                <button
                  onClick={() => fetchJobs(searchQuery, locationQuery)}
                  disabled={loadingJobs}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingJobs ? 'animate-spin' : ''}`} />
                  Refresh Feed
                </button>

                <button
                  onClick={() => setAutoRefreshFeed(!autoRefreshFeed)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                    autoRefreshFeed
                      ? 'bg-emerald-950 border-emerald-800 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <Radio className={`w-3 h-3 ${autoRefreshFeed ? 'animate-pulse text-emerald-400' : ''}`} />
                  Auto (60s): {autoRefreshFeed ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Role / Title / Skills..."
                className="bg-slate-950 text-sm text-white px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-sky-500"
              />
              <input
                type="text"
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                placeholder="Location..."
                className="bg-slate-950 text-sm text-white px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-sky-500"
              />
              <button
                onClick={() => fetchJobs(searchQuery, locationQuery)}
                disabled={loadingJobs}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                Search New Roles
              </button>
            </div>

            {/* Job Cards */}
            <div className="space-y-3 pt-2">
              {visibleJobs.map((job) => (
                <div key={job.id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 hover:border-slate-700 transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-white text-sm flex items-center gap-2">
                        {job.title}
                        {job.visaSponsored && (
                          <span className="px-2 py-0.5 bg-indigo-950 text-indigo-300 text-[10px] font-bold rounded border border-indigo-800 flex items-center gap-1">
                            <Plane className="w-2.5 h-2.5" /> Visa / Relocation
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-sky-400 font-semibold">{job.company} • <span className="text-slate-300">{job.location}</span></p>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 whitespace-nowrap">
                      {job.source}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 line-clamp-2">{job.description}</p>

                  {/* Recruiter Email Input Field */}
                  <div className="pt-2 flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <input
                      type="email"
                      placeholder={`Custom recruiter email (e.g. hr@${job.company.toLowerCase().replace(/[^a-z0-9]/g, '')}.com)...`}
                      value={customEmails[job.id] || ''}
                      onChange={(e) => setCustomEmails({ ...customEmails, [job.id]: e.target.value })}
                      className="flex-1 bg-slate-900 text-xs text-white px-2.5 py-1.5 rounded-lg border border-slate-800 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-900">
                    {job.url && (
                      <a href={job.url} target="_blank" rel="noreferrer" className="text-xs text-slate-400 hover:text-sky-300 flex items-center gap-1">
                        View Posting <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <button
                      onClick={() => handleEnqueueSingle(job)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1 ml-auto"
                    >
                      <Zap className="w-3 h-3" /> Queue for Auto-CV Generation
                    </button>
                  </div>
                </div>
              ))}

              {jobs.length > displayCount && (
                <button
                  onClick={() => setDisplayCount(prev => prev + 25)}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-slate-700 mt-2"
                >
                  <ChevronDown className="w-4 h-4" /> Load More Jobs ({jobs.length - displayCount} remaining)
                </button>
              )}
            </div>
          </div>

          {/* Job URL & Bulk Importer */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-indigo-400" />
              Paste Job URLs (LinkedIn / Indeed / Naukri / Glassdoor)
            </h2>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="Paste Job URL from Deloitte, Barclays, LinkedIn, Naukri, Glassdoor..."
                  className="flex-1 bg-slate-950 text-xs text-white px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={handleImportUrl}
                  disabled={importing || !urlInput}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs whitespace-nowrap"
                >
                  Import URL
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Bulk Paste Job Descriptions (separate multiple JDs with '---')</label>
                <textarea
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  rows={4}
                  placeholder="Paste JD 1...\n---\nPaste JD 2..."
                  className="w-full bg-slate-950 text-xs text-white p-3 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={handleImportBulk}
                  disabled={importing || !bulkInput}
                  className="mt-2 w-full py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-indigo-300 font-bold rounded-xl text-xs"
                >
                  Bulk Import JDs into Worker Queue
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Worker Settings & Terminal Logs */}
        <div className="lg:col-span-5 space-y-6">
          {/* Worker Settings */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-400" />
              Autonomous Worker Settings (50 Emails/Day)
            </h2>

            {/* Auto Apply Toggle */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-emerald-400" /> Auto-Dispatch Application Emails
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Automatically send tailored resume & cover letter email when worker processes a job
                </p>
              </div>

              <button
                onClick={() => setAutoSend(!autoSend)}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                  autoSend ? 'bg-emerald-600 justify-end' : 'bg-slate-800 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span>Minimum Match Score Threshold</span>
                <span className="text-indigo-400 font-bold">{minScore}%</span>
              </div>
              <input
                type="range"
                min={40}
                max={90}
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
              <p className="text-[11px] text-slate-400">
                Jobs with match score below {minScore}% will be automatically skipped to ensure high application relevance.
              </p>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase">Jobs Queued</span>
                <span className="text-sm font-bold text-indigo-400">{queuedJobs.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase">Tailored Resumes & PDFs Created</span>
                <span className="text-sm font-bold text-emerald-400">{processedCount}</span>
              </div>

              <button
                onClick={processNextInClientQueue}
                disabled={queuedJobs.length === 0}
                className="w-full mt-2 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" /> Process Next Job Immediately
              </button>
            </div>
          </div>

          {/* Terminal Activity Logs */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Bot className="w-4 h-4 text-sky-400" />
                Live Worker Log Output
              </h2>
              <span className="text-[11px] text-slate-500">Auto-refreshing</span>
            </div>

            <div className="bg-slate-950 font-mono text-[11px] p-3 rounded-xl border border-slate-800 h-64 overflow-y-auto space-y-2">
              {logs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-slate-500 text-[10px] whitespace-nowrap">{log.timestamp}</span>
                  <span className={`${
                    log.type === 'success' ? 'text-emerald-400' :
                    log.type === 'warn' ? 'text-amber-400' :
                    log.type === 'error' ? 'text-rose-400' : 'text-slate-300'
                  }`}>
                    {log.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
