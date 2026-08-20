'use client';

import React, { useEffect, useState } from 'react';
import { Users, Upload, FileSpreadsheet, Send, CheckCircle2, AlertCircle, RefreshCw, Sparkles, Building2, Mail, FileText, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

interface RecruiterContact {
  id: string;
  email: string;
  company: string;
  name?: string;
  role?: string;
  status: 'Imported' | 'Queued' | 'Sent' | 'Failed';
  sentAt?: string;
}

export default function RecruitersDirectoryPage() {
  const [contacts, setContacts] = useState<RecruiterContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState(false);
  const [importStatus, setImportStatus] = useState('');

  const fetchContacts = () => {
    fetch('/api/recruiters')
      .then(res => res.json())
      .then(data => {
        if (data.contacts) setContacts(data.contacts);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop()?.toLowerCase();

    if (fileExt === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          processParsedData(results.data);
        },
      });
    } else {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws);
          processParsedData(data);
        } catch {
          alert('Error parsing Excel file.');
        }
      };
      reader.readAsBinaryString(file);
    }
  };

  const processParsedData = (rows: any[]) => {
    const parsedContacts: Array<{ email: string; company: string; name: string; role: string }> = [];

    rows.forEach((row: any) => {
      const emailKey = Object.keys(row).find(k => k.toLowerCase().includes('email') || k.toLowerCase().includes('mail'));
      const companyKey = Object.keys(row).find(k => k.toLowerCase().includes('company') || k.toLowerCase().includes('organization'));
      const nameKey = Object.keys(row).find(k => k.toLowerCase().includes('name') || k.toLowerCase().includes('recruiter'));
      const roleKey = Object.keys(row).find(k => k.toLowerCase().includes('role') || k.toLowerCase().includes('title') || k.toLowerCase().includes('position'));

      const email = emailKey ? String(row[emailKey]).trim() : '';
      if (email && email.includes('@')) {
        parsedContacts.push({
          email,
          company: companyKey ? String(row[companyKey]).trim() : 'Target Tech Company',
          name: nameKey ? String(row[nameKey]).trim() : 'Hiring Manager',
          role: roleKey ? String(row[roleKey]).trim() : 'Full Stack Developer',
        });
      }
    });

    if (parsedContacts.length === 0) {
      alert('No valid recruiter emails found in file. Make sure your file contains an "Email" column.');
      return;
    }

    // Submit to server
    fetch('/api/recruiters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'import', contacts: parsedContacts }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setImportStatus(`Successfully imported ${data.imported} new recruiter contact(s)!`);
          fetchContacts();
        }
      })
      .catch(() => alert('Failed to save imported contacts.'));
  };

  const handleDispatchAll = async () => {
    if (contacts.length === 0) return;
    setDispatching(true);
    try {
      const res = await fetch('/api/recruiters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dispatch_all' }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Dispatched ${data.dispatchedCount} application emails!`);
        if (data.errors && data.errors.length > 0) {
          alert(`Note: ${data.errors.length} failed (Check SMTP setup). Error: ${data.errors[0]}`);
        }
        fetchContacts();
      }
    } catch {
      alert('Error dispatching emails.');
    } finally {
      setDispatching(false);
    }
  };

  const downloadSampleCSV = () => {
    const sampleData = `Email,Company,Name,Role\ncareers@deloitte.com,Deloitte,Hiring Manager,Full Stack Engineer\ntech.hiring@barclays.com,Barclays,Tech Talent Team,Software Developer\ncareers@accenture.com,Accenture,Recruitment Team,Application Developer`;
    const blob = new Blob([sampleData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Recruiters_Sample_Template.csv';
    a.click();
  };

  const pendingCount = contacts.filter(c => c.status !== 'Sent').length;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-sky-400 text-sm font-semibold mb-1">
            <Users className="w-4 h-4" />
            <span>Recruiter Directory & Excel Cold Outreach Module</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Recruiter Emails & Excel Importer</h1>
          <p className="text-xs text-slate-400 mt-1">
            Import Excel (`.xlsx`) or CSV files containing recruiter emails. The AI automatically generates tailored LaTeX Master CVs and Cover Letters and dispatches cold outreach emails directly from your email account.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={downloadSampleCSV}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-sky-300 font-semibold rounded-xl text-xs flex items-center gap-1.5 border border-slate-700"
          >
            <Download className="w-3.5 h-3.5" /> Sample Excel/CSV Template
          </button>
          <button
            onClick={handleDispatchAll}
            disabled={dispatching || pendingCount === 0}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-600/30"
          >
            <Send className={`w-3.5 h-3.5 ${dispatching ? 'animate-spin' : ''}`} />
            {dispatching ? 'Dispatching Packages...' : `Send Master CV Package to All (${pendingCount})`}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Excel/CSV File Dropzone */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 text-indigo-400 text-sm font-semibold">
              <FileSpreadsheet className="w-5 h-5" />
              <span>Import Excel (`.xlsx` / `.csv`)</span>
            </div>

            <div className="border-2 border-dashed border-slate-800 hover:border-sky-500 p-8 rounded-2xl text-center space-y-3 transition-all bg-slate-950/50">
              <Upload className="w-8 h-8 text-sky-400 mx-auto opacity-70" />
              <div>
                <h3 className="text-sm font-bold text-white">Upload Recruiter Spreadsheet</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Supported formats: <span className="text-sky-300 font-mono">.xlsx</span>, <span className="text-sky-300 font-mono">.csv</span>
                </p>
              </div>

              <label className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md">
                <span>Select Excel/CSV File</span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {importStatus && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-xs text-emerald-300 font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {importStatus}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Recruiter Directory Table */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-sky-400" />
                Imported Recruiters Directory ({contacts.length})
              </h2>
              <span className="text-xs font-semibold text-emerald-400">
                {contacts.filter(c => c.status === 'Sent').length} Sent
              </span>
            </div>

            {contacts.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                No recruiter contacts imported yet. Upload an Excel or CSV file to populate your cold outreach list.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950 text-xs font-semibold uppercase text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Recruiter Email & Name</th>
                      <th className="px-4 py-3">Company & Role</th>
                      <th className="px-4 py-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs">
                    {contacts.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-800/30 transition-all">
                        <td className="px-4 py-3">
                          <div className="font-bold text-white">{c.email}</div>
                          <div className="text-slate-400">{c.name || 'Hiring Team'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-sky-400">{c.company}</div>
                          <div className="text-slate-400">{c.role || 'Full Stack Developer'}</div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`px-2 py-0.5 font-bold rounded ${
                            c.status === 'Sent' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                            c.status === 'Failed' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                            'bg-slate-800 text-slate-300'
                          }`}>
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
