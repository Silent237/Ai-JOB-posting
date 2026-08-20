'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle, Sparkles, CheckCircle2, AlertTriangle, Download, Eye, FileText, ArrowRight, ShieldAlert } from 'lucide-react';
import { JDAnalysis, CVAudit } from '@/lib/ai-engine';
import { ApplicationRecord } from '@/lib/db';

export default function CreateApplicationPage() {
  const router = useRouter();

  const [company, setCompany] = useState('');
  const [position, setPosition] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [recruiterEmail, setRecruiterEmail] = useState('');
  const [recruiterName, setRecruiterName] = useState('');

  const [analyzing, setAnalyzing] = useState(false);
  const [jdAnalysis, setJdAnalysis] = useState<JDAnalysis | null>(null);
  const [cvAudit, setCvAudit] = useState<CVAudit | null>(null);

  const [generating, setGenerating] = useState(false);
  const [createdApp, setCreatedApp] = useState<ApplicationRecord | null>(null);

  const handleAnalyzeJD = async () => {
    if (!jobDescription.trim()) {
      alert('Please paste a Job Description first.');
      return;
    }
    setAnalyzing(true);
    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription }),
      });
      const data = await res.json();
      if (data.jdAnalysis && data.audit) {
        setJdAnalysis(data.jdAnalysis);
        setCvAudit(data.audit);
      }
    } catch {
      alert('Failed to analyze Job Description.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGenerateApplication = async () => {
    if (!company || !position || !jobDescription) {
      alert('Please provide Company Name, Job Title, and Job Description.');
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company,
          position,
          jobDescription,
          jobUrl,
          recruiterEmail,
          recruiterName,
        }),
      });
      const data = await res.json();
      if (data.application) {
        setCreatedApp(data.application);
      } else {
        alert(data.error || 'Failed to generate application.');
      }
    } catch {
      alert('Error creating application.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div className="flex items-center gap-2 text-sky-400 text-sm font-semibold mb-1">
          <Sparkles className="w-4 h-4" />
          <span>2-Minute Core Workflow</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Create Tailored Application</h1>
        <p className="text-xs text-slate-400 mt-1">
          Paste the Job Description to automatically audit your Master CV, estimate compatibility, generate tailored LaTeX PDFs, save to your company folder, and draft your application email.
        </p>
      </div>

      {!createdApp ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Form & JD Input */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-sky-400" />
                Target Job Details
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Company Name *</label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Google, Microsoft, Stripe"
                    className="w-full bg-slate-950 text-sm text-white px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Job Title *</label>
                  <input
                    type="text"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder="e.g. Senior Software Engineer"
                    className="w-full bg-slate-950 text-sm text-white px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Job Description *</label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  rows={9}
                  placeholder="Paste the full job description text here..."
                  className="w-full bg-slate-950 text-xs font-mono text-slate-200 p-3.5 rounded-xl border border-slate-800 focus:outline-none focus:border-sky-500 leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Job Posting URL (Optional)</label>
                  <input
                    type="url"
                    value={jobUrl}
                    onChange={(e) => setJobUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-slate-950 text-sm text-white px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Recruiter Email (Optional)</label>
                  <input
                    type="email"
                    value={recruiterEmail}
                    onChange={(e) => setRecruiterEmail(e.target.value)}
                    placeholder="recruiter@company.com"
                    className="w-full bg-slate-950 text-sm text-white px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={handleAnalyzeJD}
                  disabled={analyzing || !jobDescription}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-sky-400 font-semibold rounded-xl text-xs transition-all flex items-center gap-2 border border-slate-700"
                >
                  <Sparkles className="w-4 h-4" />
                  {analyzing ? 'Analyzing JD & Auditing...' : 'Analyze JD & Preview Audit'}
                </button>
                <button
                  onClick={handleGenerateApplication}
                  disabled={generating || !company || !position || !jobDescription}
                  className="flex-1 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-sky-600/30"
                >
                  <PlusCircle className="w-4 h-4" />
                  {generating ? 'Generating Resume & Cover Letter PDFs...' : 'Generate Application'}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: AI Analysis & CV Audit Results */}
          <div className="lg:col-span-6 space-y-6">
            {jdAnalysis && cvAudit ? (
              <div className="space-y-6">
                {/* Match Scores */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white text-base">Job Compatibility Estimate</h3>
                    <span className="text-xs text-amber-400 font-medium">AI Match Score</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <div className="text-2xl font-bold text-sky-400">{jdAnalysis.matchScore.overall}%</div>
                      <div className="text-xs text-slate-400 font-medium">Overall</div>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <div className="text-2xl font-bold text-emerald-400">{jdAnalysis.matchScore.skills}%</div>
                      <div className="text-xs text-slate-400 font-medium">Skills</div>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <div className="text-2xl font-bold text-indigo-400">{jdAnalysis.matchScore.experience}%</div>
                      <div className="text-xs text-slate-400 font-medium">Experience</div>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <div className="text-2xl font-bold text-amber-400">{jdAnalysis.matchScore.keyword}%</div>
                      <div className="text-xs text-slate-400 font-medium">Keywords</div>
                    </div>
                  </div>
                </div>

                {/* CV Audit Details */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                  <h3 className="font-bold text-white text-base">Master CV Audit Results</h3>

                  <div className="space-y-3 text-xs">
                    {/* Keep */}
                    <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl space-y-1">
                      <span className="font-bold text-emerald-400 uppercase tracking-wider block">Keep (Relevant Existing Info)</span>
                      <ul className="list-disc list-inside text-emerald-200/90 space-y-0.5">
                        {cvAudit.keep.map((k, i) => <li key={i}>{k}</li>)}
                      </ul>
                    </div>

                    {/* Improve */}
                    {cvAudit.improve.length > 0 && (
                      <div className="p-3 bg-sky-950/40 border border-sky-800/60 rounded-xl space-y-1">
                        <span className="font-bold text-sky-400 uppercase tracking-wider block">Improve (Optimized Bullet Wording)</span>
                        {cvAudit.improve.map((imp, i) => (
                          <div key={i} className="text-sky-200/90 space-y-0.5">
                            <p className="line-through text-slate-500">{imp.original}</p>
                            <p className="font-medium text-sky-300">➜ {imp.suggested}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Missing Skills Truth Safeguard */}
                    {cvAudit.missingSkills.length > 0 && (
                      <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl space-y-2">
                        <div className="flex items-center gap-1.5 font-bold text-amber-400 uppercase tracking-wider">
                          <ShieldAlert className="w-4 h-4 text-amber-400" />
                          <span>Missing Skills (Truth Enforcement Safeguard)</span>
                        </div>
                        <div className="space-y-1.5">
                          {cvAudit.missingSkills.map((m, i) => (
                            <div key={i} className="p-2 bg-slate-950/80 rounded border border-amber-900/50">
                              <span className="font-bold text-amber-300">Missing Skill: </span>
                              <span className="text-white">{m.skill}</span>
                              <p className="text-slate-400 mt-0.5">{m.recommendation}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 p-12 rounded-2xl text-center space-y-3">
                <Sparkles className="w-8 h-8 text-sky-400 mx-auto opacity-60" />
                <h3 className="text-base font-bold text-white">AI Analysis & CV Audit Preview</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Paste the Job Description and click "Analyze JD & Preview Audit" or "Generate Application" to run the complete automated pipeline.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Generated Success Screen */
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl space-y-6">
          <div className="flex items-center gap-3 text-emerald-400">
            <CheckCircle2 className="w-8 h-8" />
            <div>
              <h2 className="text-xl font-bold text-white">Application Package Created Successfully!</h2>
              <p className="text-xs text-slate-400">Generated under Applications/{createdApp.company}/</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <span className="text-xs text-slate-400 uppercase font-semibold">Tailored Resume</span>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white">Resume.pdf</span>
                <a
                  href={createdApp.resumePdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" /> Preview PDF
                </a>
              </div>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <span className="text-xs text-slate-400 uppercase font-semibold">Cover Letter</span>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white">Cover_Letter.pdf</span>
                <a
                  href={createdApp.coverLetterPdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" /> Preview PDF
                </a>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-800 pt-4">
            <a
              href={`/api/applications/${createdApp.id}/download`}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition-all flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Download Complete Company Folder as ZIP
            </a>

            <button
              onClick={() => router.push('/applications')}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-sm flex items-center gap-2"
            >
              View Application Tracker <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
