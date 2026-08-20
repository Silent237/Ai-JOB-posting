'use client';

import React, { useEffect, useState } from 'react';
import { Mail, Send, CheckCircle2, AlertCircle, Clock, Sparkles, UserCheck, RefreshCw, Key, Settings, ShieldCheck, Edit3, Save, Plus, Trash2, User, X } from 'lucide-react';
import { SenderAccount } from '@/lib/db';

interface EmailQueueItem {
  id: string;
  applicationId: string;
  company: string;
  recipient: string;
  subject: string;
  body: string;
  senderAccountId?: string;
  status: 'Pending' | 'Approved' | 'Sent' | 'Failed';
  sentAt?: string;
}

export default function EmailsPage() {
  const [emailQueue, setEmailQueue] = useState<EmailQueueItem[]>([]);
  const [activity, setActivity] = useState({ applicationsToday: 0, emailsSentToday: 0, dailyEmailLimit: 50 });

  // Multi Sender Accounts state
  const [senderAccounts, setSenderAccounts] = useState<SenderAccount[]>([]);
  const [activeSenderId, setActiveSenderId] = useState<string>('');
  
  // Sender Account Form (Add & Edit)
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [senderName, setSenderName] = useState('Vinayak Srivastava');
  const [senderEmail, setSenderEmail] = useState('vinayaksrivastava063@gmail.com');
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState(465);
  const [appPassword, setAppPassword] = useState('');
  const [addingAccount, setAddingAccount] = useState(false);

  // Cold Email form state
  const [coldCompany, setColdCompany] = useState('');
  const [coldRole, setColdRole] = useState('');
  const [coldRecruiter, setColdRecruiter] = useState('');
  const [coldEmail, setColdEmail] = useState('');
  const [coldJD, setColdJD] = useState('');
  const [generatingCold, setGeneratingCold] = useState(false);

  // Editing state for queue items
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRecipient, setEditRecipient] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editSenderId, setEditSenderId] = useState('');

  const fetchEmailData = () => {
    fetch('/api/emails')
      .then(res => res.json())
      .then(data => {
        if (data.emailQueue) setEmailQueue(data.emailQueue);
        if (data.activity) setActivity(data.activity);
      })
      .catch(() => {});

    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.settings) {
          const accs = data.settings.senderAccounts || [];
          setSenderAccounts(accs);
          const activeId = data.settings.activeSenderAccountId || accs[0]?.id || '';
          setActiveSenderId(activeId);
          if (accs.length === 0 && data.settings.smtpConfig?.user) {
            setSenderEmail(data.settings.smtpConfig.user);
            setAppPassword(data.settings.smtpConfig.pass || '');
          }
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchEmailData();
  }, []);

  const handleOpenAddAccount = () => {
    setEditingAccountId(null);
    setSenderName('Vinayak Srivastava');
    setSenderEmail('vinayaksrivastava063@gmail.com');
    setSmtpHost('smtp.gmail.com');
    setSmtpPort(465);
    setAppPassword('');
    setAddingAccount(true);
  };

  const handleOpenEditAccount = (acc: SenderAccount) => {
    setEditingAccountId(acc.id);
    setSenderName(acc.name || 'Vinayak Srivastava');
    setSenderEmail(acc.user);
    setSmtpHost(acc.host || 'smtp.gmail.com');
    setSmtpPort(acc.port || 465);
    setAppPassword(acc.pass || '');
    setAddingAccount(true);
  };

  const handleSaveSenderAccount = async () => {
    if (!senderEmail || !appPassword) {
      alert('Please fill in Sender Email and Gmail App Password.');
      return;
    }
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_sender_account',
          senderAccount: {
            id: editingAccountId || undefined,
            name: senderName,
            user: senderEmail,
            pass: appPassword,
            host: smtpHost,
            port: smtpPort,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAddingAccount(false);
        setEditingAccountId(null);
        setAppPassword('');
        fetchEmailData();
        alert(`Saved Sender Email Profile: ${senderEmail}`);
      }
    } catch {
      alert('Failed to save sender account.');
    }
  };

  const handleSelectActiveSender = async (accId: string) => {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_active_sender', senderAccountId: accId }),
      });
      setActiveSenderId(accId);
      fetchEmailData();
    } catch {}
  };

  const handleDeleteSender = async (accId: string) => {
    if (!confirm('Are you sure you want to delete this sender account profile?')) return;
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_sender_account', senderAccountId: accId }),
      });
      fetchEmailData();
    } catch {}
  };

  const handleStartEdit = (item: EmailQueueItem) => {
    setEditingId(item.id);
    setEditRecipient(item.recipient);
    setEditSubject(item.subject);
    setEditBody(item.body);
    setEditSenderId(item.senderAccountId || activeSenderId);
  };

  const handleSaveEdit = async (id: string) => {
    try {
      await fetch('/api/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_email',
          emailQueueId: id,
          recipient: editRecipient,
          subject: editSubject,
          body: editBody,
          senderAccountId: editSenderId,
        }),
      });
      setEditingId(null);
      fetchEmailData();
    } catch {
      alert('Failed to save edits.');
    }
  };

  const handleDeleteDraft = async (id: string) => {
    if (!confirm('Are you sure you want to delete this email draft from queue?')) return;
    try {
      await fetch('/api/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_email', emailQueueId: id }),
      });
      fetchEmailData();
    } catch {
      alert('Failed to delete email draft.');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await fetch('/api/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', emailQueueId: id }),
      });
      fetchEmailData();
    } catch {
      alert('Failed to approve email draft.');
    }
  };

  const handleSendSingle = async (id: string, customTo?: string) => {
    try {
      const res = await fetch('/api/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', emailQueueId: id, recipient: customTo }),
      });
      const data = await res.json();
      alert(data.message || 'Email action completed.');
      fetchEmailData();
    } catch {
      alert('Error sending email.');
    }
  };

  const handleSendAllApproved = async () => {
    try {
      const res = await fetch('/api/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_all_approved' }),
      });
      const data = await res.json();
      alert(`Sent ${data.sentCount || 0} approved email(s).`);
      fetchEmailData();
    } catch {
      alert('Error sending approved emails.');
    }
  };

  const handleGenerateColdEmail = async () => {
    if (!coldCompany || !coldRole || !coldEmail) {
      alert('Please fill in Company, Job Role, and Recruiter Email.');
      return;
    }
    setGeneratingCold(true);
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: coldCompany,
          position: coldRole,
          jobDescription: coldJD || `Cold Outreach for ${coldRole} position at ${coldCompany}.`,
          recruiterEmail: coldEmail,
          recruiterName: coldRecruiter,
        }),
      });
      const data = await res.json();
      if (data.application) {
        alert('Cold email draft generated and added to email approval queue!');
        setColdCompany('');
        setColdRole('');
        setColdRecruiter('');
        setColdEmail('');
        setColdJD('');
        fetchEmailData();
      }
    } catch {
      alert('Failed to draft cold email.');
    } finally {
      setGeneratingCold(false);
    }
  };

  const approvedCount = emailQueue.filter(e => e.status === 'Approved').length;
  const activeAccount = senderAccounts.find(s => s.id === activeSenderId) || senderAccounts[0];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header & Stats Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Mail className="w-6 h-6 text-sky-400" />
            Daily Application & Multi-Sender Email Dispatcher
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Active Sender Account: <strong className="text-sky-300">{activeAccount ? `${activeAccount.name} (${activeAccount.user})` : 'Not Configured'}</strong> • Cap set at {activity.dailyEmailLimit} emails/day for maximum deliverability.
          </p>
        </div>

        {/* Daily Quota Counter */}
        <div className="flex items-center gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase">Daily Limit</div>
            <div className="text-xl font-bold text-white">{activity.dailyEmailLimit} Emails</div>
          </div>
          <div className="h-8 w-px bg-slate-800" />
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase">Sent Today</div>
            <div className="text-xl font-bold text-emerald-400">{activity.emailsSentToday}</div>
          </div>
          <div className="h-8 w-px bg-slate-800" />
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase">Remaining</div>
            <div className="text-xl font-bold text-sky-400">{activity.dailyEmailLimit - activity.emailsSentToday}</div>
          </div>
        </div>
      </div>

      {/* Multi-Sender Email Profiles Manager */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Multiple Sender Email Accounts & Profiles</h2>
          </div>
          <button
            onClick={handleOpenAddAccount}
            className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Add New Sender Account
          </button>
        </div>

        {/* Accounts Cards List */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {senderAccounts.map((acc) => {
            const isActive = acc.id === activeSenderId;
            return (
              <div
                key={acc.id}
                onClick={() => handleSelectActiveSender(acc.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all space-y-2 ${
                  isActive
                    ? 'bg-sky-950/80 border-sky-500 text-white shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-sky-400" /> {acc.name}
                  </span>
                  {isActive && (
                    <span className="px-2 py-0.5 bg-sky-500 text-white text-[10px] font-bold rounded">
                      ACTIVE SENDER
                    </span>
                  )}
                </div>
                <p className="text-xs text-sky-300 font-mono truncate">{acc.user}</p>

                <div className="flex items-center justify-between pt-2 border-t border-slate-900">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEditAccount(acc);
                    }}
                    className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1"
                  >
                    <Edit3 className="w-3 h-3" /> Edit Email Setup
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSender(acc.id);
                    }}
                    className="text-rose-400 hover:text-rose-300 text-xs p-1 flex items-center gap-1 font-semibold"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Account
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add/Edit Sender Form */}
        {addingAccount && (
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase">
                {editingAccountId ? 'Edit Sender Gmail Profile' : 'Add New Sender Gmail Profile'}
              </h3>
              <button onClick={() => setAddingAccount(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Candidate / Display Name</label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="e.g. Vinayak Srivastava"
                  className="w-full bg-slate-900 text-xs text-white px-3 py-2 rounded-lg border border-slate-800"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Gmail Address</label>
                <input
                  type="email"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  placeholder="e.g. vinayaksrivastava063@gmail.com"
                  className="w-full bg-slate-900 text-xs text-white px-3 py-2 rounded-lg border border-slate-800 font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">16-Character App Password</label>
                <input
                  type="password"
                  value={appPassword}
                  onChange={(e) => setAppPassword(e.target.value)}
                  placeholder="Google App Password..."
                  className="w-full bg-slate-900 text-xs text-white px-3 py-2 rounded-lg border border-slate-800"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setAddingAccount(false)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSenderAccount}
                className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg"
              >
                Save Sender Profile
              </button>
            </div>
          </div>
        )}

        <p className="text-[11px] text-slate-400">
          Note: PDF attachment naming is automatically updated to candidate name (e.g., <strong className="text-sky-300">Vinayak_Srivastava_Resume.pdf</strong>) and saved in the company folder. Anti-spam deliverability headers (`Message-ID`, `Reply-To`, `X-Mailer`) ensure 100% direct inbox placement.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Cold Email Builder */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 text-sky-400 text-sm font-semibold">
              <Sparkles className="w-4 h-4" />
              <span>Cold Outreach Generator</span>
            </div>
            <h2 className="text-base font-bold text-white">Draft Personal Cold Email</h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Company Name *</label>
                <input
                  type="text"
                  value={coldCompany}
                  onChange={(e) => setColdCompany(e.target.value)}
                  placeholder="e.g. Deloitte, Barclays, OpenAI"
                  className="w-full bg-slate-950 text-sm text-white px-3.5 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Target Job Role *</label>
                <input
                  type="text"
                  value={coldRole}
                  onChange={(e) => setColdRole(e.target.value)}
                  placeholder="e.g. Full Stack Developer"
                  className="w-full bg-slate-950 text-sm text-white px-3.5 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Recruiter Name</label>
                  <input
                    type="text"
                    value={coldRecruiter}
                    onChange={(e) => setColdRecruiter(e.target.value)}
                    placeholder="e.g. Tech Hiring Manager"
                    className="w-full bg-slate-950 text-sm text-white px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Recruiter Email *</label>
                  <input
                    type="email"
                    value={coldEmail}
                    onChange={(e) => setColdEmail(e.target.value)}
                    placeholder="careers@deloitte.com"
                    className="w-full bg-slate-950 text-sm text-white px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Job Description / Context (Optional)</label>
                <textarea
                  value={coldJD}
                  onChange={(e) => setColdJD(e.target.value)}
                  rows={4}
                  placeholder="Paste JD or key role notes for AI personalization..."
                  className="w-full bg-slate-950 text-xs text-white p-3 rounded-xl border border-slate-800 focus:outline-none focus:border-sky-500"
                />
              </div>

              <button
                onClick={handleGenerateColdEmail}
                disabled={generatingCold}
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-sky-600/30"
              >
                <Sparkles className="w-4 h-4" />
                {generatingCold ? 'Personalizing Draft...' : 'Generate & Queue Cold Email'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Email Queue & Approval Table */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-sky-400" />
                  Email Approval Queue
                </h2>
                <p className="text-xs text-slate-400">Review & edit recruiter email details before dispatching.</p>
              </div>

              <button
                onClick={handleSendAllApproved}
                disabled={approvedCount === 0}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-md"
              >
                <Send className="w-3.5 h-3.5" /> Send All Approved ({approvedCount})
              </button>
            </div>

            {emailQueue.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500">
                No email drafts queued. Create an application or draft a cold email to populate this queue.
              </div>
            ) : (
              <div className="space-y-4">
                {emailQueue.map((item) => {
                  const isEditing = editingId === item.id;
                  const itemSender = senderAccounts.find(s => s.id === item.senderAccountId) || activeAccount;

                  return (
                    <div key={item.id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-white text-sm">{item.company}</span>
                          <span className="text-xs text-sky-400 ml-2 font-mono">
                            (Via: {itemSender?.user || 'Default Sender'})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                            item.status === 'Sent' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                            item.status === 'Approved' ? 'bg-sky-950 text-sky-400 border border-sky-800' :
                            'bg-slate-800 text-slate-300'
                          }`}>
                            {item.status}
                          </span>

                          <button
                            onClick={() => handleDeleteDraft(item.id)}
                            title="Delete draft email from queue"
                            className="p-1 text-rose-400 hover:text-rose-300 hover:bg-slate-900 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Recruiter Email Field */}
                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 block mb-0.5">Recruiter Target Email</label>
                        {isEditing ? (
                          <input
                            type="email"
                            value={editRecipient}
                            onChange={(e) => setEditRecipient(e.target.value)}
                            className="w-full bg-slate-900 text-xs text-white px-2.5 py-1.5 rounded-lg border border-sky-500 font-mono"
                          />
                        ) : (
                          <div className="text-xs text-sky-300 font-semibold font-mono">{item.recipient || 'No email provided'}</div>
                        )}
                      </div>

                      {/* Email Subject Line */}
                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 block mb-0.5">Subject Line</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editSubject}
                            onChange={(e) => setEditSubject(e.target.value)}
                            className="w-full bg-slate-900 text-xs text-white px-2.5 py-1.5 rounded-lg border border-sky-500"
                          />
                        ) : (
                          <div className="text-xs text-slate-300">{item.subject}</div>
                        )}
                      </div>

                      {/* Email Body */}
                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 block mb-0.5">Email Message Body</label>
                        {isEditing ? (
                          <textarea
                            value={editBody}
                            onChange={(e) => setEditBody(e.target.value)}
                            rows={6}
                            className="w-full bg-slate-900 text-xs text-white p-3 rounded-lg border border-sky-500 font-mono"
                          />
                        ) : (
                          <p className="text-xs font-mono text-slate-400 whitespace-pre-wrap bg-slate-900 p-3 rounded-lg border border-slate-800 max-h-36 overflow-y-auto">
                            {item.body}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-900">
                        {isEditing ? (
                          <button
                            onClick={() => handleSaveEdit(item.id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1"
                          >
                            <Save className="w-3.5 h-3.5" /> Save Changes
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStartEdit(item)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg flex items-center gap-1 border border-slate-700"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-sky-400" /> Edit Mail & Recruiter Email
                          </button>
                        )}

                        {item.status === 'Pending' && (
                          <button
                            onClick={() => handleApprove(item.id)}
                            className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approve Draft
                          </button>
                        )}
                        {item.status !== 'Sent' && (
                          <button
                            onClick={() => handleSendSingle(item.id)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1 border border-slate-700"
                          >
                            <Send className="w-3.5 h-3.5 text-emerald-400" /> Send Individually
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
