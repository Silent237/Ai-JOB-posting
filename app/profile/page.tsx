'use client';

import React, { useEffect, useState } from 'react';
import { FileText, Save, Sparkles, CheckCircle2, Code2, Wrench, Briefcase, GraduationCap, Award, Plus, Layers, Trash2, RefreshCw } from 'lucide-react';
import { UserProfile, MasterTemplate } from '@/lib/db';

const DEFAULT_SAMPLE_LATEX = `\\documentclass[10pt, letterpaper]{article}
\\usepackage[full]{geometry}
\\usepackage{hyperref}
\\usepackage{titlesec}

\\begin{document}
\\name{Vinayak Srivastava}
\\email{vinayaksrivastava063@gmail.com}
\\phone{+91 9876543210}
\\linkedin{linkedin.com/in/vinayak}
\\github{github.com/vinayak}

\\section{Skills}
\\begin{itemize}
  \\item \\textbf{Languages}: TypeScript, JavaScript, Python, PHP, C++, SQL
  \\item \\textbf{Frameworks}: React, Next.js, Node.js, Express, Laravel, Tailwind CSS
  \\item \\textbf{Databases}: PostgreSQL, MongoDB, MySQL, Redis
  \\item \\textbf{Tools}: Git, Docker, Linux, REST API, Prompt Engineering
\\end{itemize}

\\section{Experience}
\\textbf{Full Stack Engineer} \\hfill \\textbf{2023 -- Present}\\\\
\\textit{Tech Solutions, India}
\\begin{itemize}
  \\item Architected automated AI job application engine and real-time AST document tailors.
  \\item Scaled high-throughput REST APIs and email queue management systems.
\\end{itemize}

\\section{Projects}
\\textbf{AI Job Application & Tailor Platform} -- \\url{github.com/vinayak/hunt-ai}
\\begin{itemize}
  \\item Built autonomous background LaTeX CV compiler, JD audit engine, and cold email dispatcher.
\\end{itemize}

\\end{document}`;

export default function ProfilePage() {
  const [latexInput, setLatexInput] = useState(DEFAULT_SAMPLE_LATEX);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [templates, setTemplates] = useState<MasterTemplate[]>([]);
  const [activeTplId, setActiveTplId] = useState<string>('default_master');
  const [tplTitleInput, setTplTitleInput] = useState<string>('Master Resume');

  const [activeTab, setActiveTab] = useState<'latex' | 'skills' | 'experience' | 'projects' | 'education'>('latex');
  const [parsing, setParsing] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchProfileData = () => {
    fetch('/api/profile')
      .then(res => res.json())
      .then(data => {
        if (data.profile) {
          setProfile(data.profile);
          if (data.profile.templates && data.profile.templates.length > 0) {
            setTemplates(data.profile.templates);
            const activeId = data.profile.activeTemplateId || data.profile.templates[0].id;
            setActiveTplId(activeId);
            const activeObj = data.profile.templates.find((t: MasterTemplate) => t.id === activeId) || data.profile.templates[0];
            setLatexInput(activeObj.latex);
            setTplTitleInput(activeObj.title);
          } else if (data.profile.masterLaTeX) {
            setLatexInput(data.profile.masterLaTeX);
          }
        } else {
          handleParseLatexWithCode(DEFAULT_SAMPLE_LATEX, 'Master Resume', 'default_master');
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  const handleParseLatexWithCode = async (code: string, titleStr: string, tplId: string) => {
    setParsing(true);
    setSaved(false);
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_template',
          masterLaTeX: code,
          templateTitle: titleStr,
          templateId: tplId,
        }),
      });
      const data = await res.json();
      if (data.profile) {
        setProfile(data.profile);
        if (data.profile.templates) setTemplates(data.profile.templates);
        setSaved(true);
        alert('Master LaTeX Resume successfully parsed and saved!');
      }
    } catch {
      alert('Error parsing LaTeX code.');
    } finally {
      setParsing(false);
    }
  };

  const handleSaveCurrentTemplate = async () => {
    await handleParseLatexWithCode(latexInput, tplTitleInput, activeTplId);
  };

  const handleSwitchTemplate = async (tpl: MasterTemplate) => {
    setActiveTplId(tpl.id);
    setLatexInput(tpl.latex);
    setTplTitleInput(tpl.title);

    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_active',
          templateId: tpl.id,
        }),
      });
      const data = await res.json();
      if (data.profile) setProfile(data.profile);
    } catch {}
  };

  const handleCreateNewTemplate = () => {
    const newId = `tpl_${Date.now()}`;
    const newTitle = `Custom Resume ${templates.length + 1}`;
    setActiveTplId(newId);
    setTplTitleInput(newTitle);
    setLatexInput(DEFAULT_SAMPLE_LATEX);
    const newTpl: MasterTemplate = { id: newId, title: newTitle, latex: DEFAULT_SAMPLE_LATEX };
    setTemplates([...templates, newTpl]);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-sky-400" />
            User Master Resumes & LaTeX Templates
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Save and manage multiple master LaTeX CV templates (e.g. Full Stack, AI Prompt Engineer, Client Resumes). The active template will automatically be used for AI tailoring.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Active CV Saved
            </span>
          )}
          <button
            onClick={handleSaveCurrentTemplate}
            disabled={parsing}
            className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-medium rounded-xl text-sm transition-all flex items-center gap-2 shadow-lg shadow-sky-600/30"
          >
            <Sparkles className="w-4 h-4" />
            {parsing ? 'Saving & Parsing...' : 'Save & Active Template'}
          </button>
        </div>
      </div>

      {/* Multi-Template Switcher Selector */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase">
            <Layers className="w-4 h-4 text-indigo-400" /> Your Master Resume Profiles ({templates.length})
          </div>
          <button
            onClick={handleCreateNewTemplate}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Create New Resume Template
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {templates.map((tpl) => {
            const isActive = tpl.id === activeTplId;
            return (
              <div
                key={tpl.id}
                onClick={() => handleSwitchTemplate(tpl)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all space-y-1 ${
                  isActive
                    ? 'bg-sky-950/80 border-sky-500 text-white shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white">{tpl.title}</span>
                  {isActive && (
                    <span className="px-2 py-0.5 bg-sky-500 text-white text-[10px] font-bold rounded">
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 truncate">ID: {tpl.id}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('latex')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'latex' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:bg-slate-900'
          }`}
        >
          <Code2 className="w-4 h-4" /> LaTeX Editor
        </button>
        <button
          onClick={() => setActiveTab('skills')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'skills' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:bg-slate-900'
          }`}
        >
          <Wrench className="w-4 h-4" /> Extracted Skills ({profile ? profile.skills.languages.length + profile.skills.frameworks.length + profile.skills.tools.length : 0})
        </button>
        <button
          onClick={() => setActiveTab('experience')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'experience' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:bg-slate-900'
          }`}
        >
          <Briefcase className="w-4 h-4" /> Work Experience
        </button>
        <button
          onClick={() => setActiveTab('projects')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'projects' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:bg-slate-900'
          }`}
        >
          <Award className="w-4 h-4" /> Projects & Items
        </button>
        <button
          onClick={() => setActiveTab('education')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'education' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:bg-slate-900'
          }`}
        >
          <GraduationCap className="w-4 h-4" /> Candidate Info
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'latex' && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-xs font-bold text-slate-300 whitespace-nowrap">Template Name:</span>
              <input
                type="text"
                value={tplTitleInput}
                onChange={(e) => setTplTitleInput(e.target.value)}
                className="bg-slate-950 text-xs text-white px-3 py-1.5 rounded-lg border border-slate-800 focus:outline-none focus:border-sky-500 max-w-xs"
              />
            </div>
            <span className="text-xs text-sky-400">Edit or paste LaTeX source code below</span>
          </div>

          <textarea
            value={latexInput}
            onChange={(e) => setLatexInput(e.target.value)}
            rows={20}
            className="w-full bg-slate-950 font-mono text-xs text-sky-200 p-4 rounded-xl border border-slate-800 focus:outline-none focus:border-sky-500 leading-relaxed"
            placeholder="Paste your complete resume.tex source code here..."
          />

          {/* Action Bar under LaTeX Editor */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800">
            <button
              onClick={() => setLatexInput(DEFAULT_SAMPLE_LATEX)}
              className="text-xs text-slate-400 hover:text-slate-200 underline flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Reset to Sample LaTeX
            </button>

            <button
              onClick={handleSaveCurrentTemplate}
              disabled={parsing}
              className="w-full sm:w-auto px-6 py-3 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-sky-600/30"
            >
              <Sparkles className="w-4 h-4" />
              {parsing ? 'Parsing & Extracting Profile...' : '⚡ Apply, Save & Parse Master LaTeX Resume'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'skills' && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6">
          <h2 className="text-base font-bold text-white">Extracted Candidate Profile Skills</h2>

          {profile ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-sky-400">Programming Languages</label>
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex flex-wrap gap-2 min-h-[50px]">
                  {profile.skills.languages.length > 0 ? (
                    profile.skills.languages.map((lang) => (
                      <span key={lang} className="px-2.5 py-1 bg-slate-800 text-sky-300 text-xs font-medium rounded-lg">
                        {lang}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500">None detected</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-emerald-400">Frameworks & Web Tech</label>
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex flex-wrap gap-2 min-h-[50px]">
                  {profile.skills.frameworks.length > 0 ? (
                    profile.skills.frameworks.map((fw) => (
                      <span key={fw} className="px-2.5 py-1 bg-slate-800 text-emerald-300 text-xs font-medium rounded-lg">
                        {fw}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500">None detected</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-indigo-400">Databases</label>
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex flex-wrap gap-2 min-h-[50px]">
                  {profile.skills.databases.length > 0 ? (
                    profile.skills.databases.map((db) => (
                      <span key={db} className="px-2.5 py-1 bg-slate-800 text-indigo-300 text-xs font-medium rounded-lg">
                        {db}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500">None detected</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-amber-400">Tools & Platforms</label>
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex flex-wrap gap-2 min-h-[50px]">
                  {profile.skills.tools.length > 0 ? (
                    profile.skills.tools.map((t) => (
                      <span key={t} className="px-2.5 py-1 bg-slate-800 text-amber-300 text-xs font-medium rounded-lg">
                        {t}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500">None detected</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400">Click "⚡ Apply, Save & Parse Master LaTeX Resume" to parse skills.</p>
          )}
        </div>
      )}

      {activeTab === 'experience' && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
          <h2 className="text-base font-bold text-white">Parsed Work Experience</h2>
          {profile && profile.experience.length > 0 ? (
            profile.experience.map((exp) => (
              <div key={exp.id} className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white text-sm">{exp.company} — {exp.role}</span>
                  <span className="text-xs text-slate-400">{exp.startDate} - {exp.endDate}</span>
                </div>
                <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                  {exp.bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400">No work experience parsed yet.</p>
          )}
        </div>
      )}

      {activeTab === 'projects' && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
          <h2 className="text-base font-bold text-white">Parsed Projects & Extracted Bullet Points</h2>
          {profile && profile.projects.length > 0 ? (
            profile.projects.map((proj) => (
              <div key={proj.id} className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="font-semibold text-white text-sm">{proj.title}</div>
                <p className="text-xs text-slate-400">{proj.description}</p>
                <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                  {proj.bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400">No project items parsed yet.</p>
          )}
        </div>
      )}

      {activeTab === 'education' && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
          <h2 className="text-base font-bold text-white">Parsed Candidate Details</h2>
          {profile ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-300">
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                <span className="font-semibold text-sky-400 block mb-1">Extracted Name</span>
                <span className="text-sm font-bold text-white">{profile.name}</span>
              </div>
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                <span className="font-semibold text-sky-400 block mb-1">Email</span>
                {profile.email || 'Not detected in LaTeX source'}
              </div>
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                <span className="font-semibold text-sky-400 block mb-1">Phone</span>
                {profile.phone || 'Not detected in LaTeX source'}
              </div>
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                <span className="font-semibold text-sky-400 block mb-1">Links / Portfolios</span>
                {profile.github || profile.linkedin || 'None'}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
