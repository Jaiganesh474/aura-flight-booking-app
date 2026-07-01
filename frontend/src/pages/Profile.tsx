import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import { User, Plus, ShieldCheck, Pencil, Trash2, Check, X, Camera } from 'lucide-react';

interface Profile {
  id: number;
  firstName: string;
  lastName: string;
  gender: string;
  passportNumber: string;
  nationality: string;
}

const emptyForm = () => ({
  firstName: '',
  lastName: '',
  gender: 'Male',
  passportNumber: '',
  nationality: 'Indian',
});

const Profile: React.FC = () => {
  const { user, updateUserAvatar } = useApp();

  const formatMemberSince = (dateString?: string) => {
    if (!dateString) return 'June 2026';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } catch {
      return 'June 2026';
    }
  };
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  // Add form
  const [form, setForm] = useState(emptyForm());

  // Editing state — stores id being edited + draft values
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<Omit<Profile, 'id'>>(emptyForm());

  // Delete confirm
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = () => {
    setLoading(true);
    api.get('/api/passengers/profiles')
      .then(res => setProfiles(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim() || !form.passportNumber.trim()) return;

    try {
      await api.post('/api/passengers/profiles', form);
      setForm(emptyForm());
      fetchProfiles();
    } catch {
      alert('Failed to save passenger profile.');
    }
  };

  const startEdit = (p: Profile) => {
    setEditingId(p.id);
    setEditDraft({
      firstName: p.firstName,
      lastName: p.lastName,
      gender: p.gender,
      passportNumber: p.passportNumber,
      nationality: p.nationality,
    });
  };

  const handleEditSave = async (id: number) => {
    try {
      await api.put(`/api/passengers/profiles/${id}`, editDraft);
      setEditingId(null);
      fetchProfiles();
    } catch {
      alert('Failed to update profile.');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/api/passengers/profiles/${id}`);
      setDeletingId(null);
      fetchProfiles();
    } catch {
      alert('Failed to delete profile.');
    }
  };

  if (!user) return null;

  const inputCls = "w-full bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-amber-400 dark:focus:border-amber-500 transition-colors text-xs";

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">

      {/* Account Info Card */}
      <div className="glass-card rounded-2xl p-6 h-fit border border-slate-200 dark:border-white/5 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-3">
          <User className="h-5 w-5 text-amber-500" />
          <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white">Account Information</h3>
        </div>

        {/* Profile Avatar Selection */}
        <div className="flex flex-col items-center justify-center pb-4 border-b border-slate-200 dark:border-white/10 space-y-3">
          <div className="relative group w-20 h-20 rounded-full overflow-hidden border-2 border-amber-500/30 hover:border-amber-500 transition-all shadow-md">
            {user.avatar ? (
              <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-amber-500/10 dark:bg-amber-500/5 flex items-center justify-center text-amber-600 dark:text-amber-500 font-bold text-2xl font-display">
                {user.username.slice(0, 2).toUpperCase()}
              </div>
            )}
            
            <label className="absolute inset-0 bg-black/55 backdrop-blur-[1px] flex flex-col items-center justify-center gap-1 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer">
              <Camera className="h-4 w-4" />
              <span>Change</span>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      if (typeof reader.result === 'string') {
                        updateUserAvatar(reader.result);
                      }
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </label>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-gray-500">Allowed: JPG, PNG (Max 1MB)</p>
        </div>

        <div className="space-y-3 text-xs leading-relaxed">
          <div>
            <p className="text-slate-500 dark:text-gray-400">Username</p>
            <p className="font-bold text-slate-900 dark:text-white mt-0.5">{user.username}</p>
          </div>
          <div>
            <p className="text-slate-500 dark:text-gray-400">Email Address</p>
            <p className="font-bold text-slate-900 dark:text-white mt-0.5 break-all">{user.email}</p>
          </div>
          <div>
            <p className="text-slate-500 dark:text-gray-400">Member Since</p>
            <p className="font-bold text-slate-900 dark:text-white mt-0.5">{formatMemberSince(user.createdAt)}</p>
          </div>
          <div>
            <p className="text-slate-500 dark:text-gray-400">Account Status</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 uppercase text-[10px] tracking-wider">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Section */}
      <div className="lg:col-span-2 space-y-6">

        {/* Saved Passengers */}
        <div className="glass-card rounded-2xl p-6 border border-slate-200 dark:border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-base text-slate-900 dark:text-white">Saved Travellers</h3>
              <p className="text-[10px] text-slate-500 dark:text-gray-500 mt-0.5">Auto-fill these at checkout</p>
            </div>
            <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-2 py-0.5 rounded-full">
              {profiles.length} saved
            </span>
          </div>

          {loading ? (
            <p className="text-xs text-slate-400 dark:text-gray-500 animate-pulse">Loading profiles...</p>
          ) : profiles.length === 0 ? (
            <div className="text-center py-6 space-y-2">
              <User className="h-8 w-8 text-slate-300 dark:text-gray-600 mx-auto" />
              <p className="text-xs text-slate-400 dark:text-gray-500">No traveller profiles saved yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {profiles.map(p => (
                <div key={p.id} className="rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-950/40 overflow-hidden">

                  {editingId === p.id ? (
                    /* ─── Edit Mode ─── */
                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-[10px] text-slate-400 dark:text-gray-500 mb-1">First Name</p>
                          <input className={inputCls} value={editDraft.firstName} onChange={e => setEditDraft(d => ({ ...d, firstName: e.target.value }))} />
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 dark:text-gray-500 mb-1">Last Name</p>
                          <input className={inputCls} value={editDraft.lastName} onChange={e => setEditDraft(d => ({ ...d, lastName: e.target.value }))} />
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 dark:text-gray-500 mb-1">Gender</p>
                          <select className={inputCls} value={editDraft.gender} onChange={e => setEditDraft(d => ({ ...d, gender: e.target.value }))}>
                            <option>Male</option><option>Female</option><option>Other</option>
                          </select>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 dark:text-gray-500 mb-1">Passport</p>
                          <input className={`${inputCls} font-mono`} value={editDraft.passportNumber} onChange={e => setEditDraft(d => ({ ...d, passportNumber: e.target.value }))} />
                        </div>
                        <div className="col-span-2">
                          <p className="text-[10px] text-slate-400 dark:text-gray-500 mb-1">Nationality</p>
                          <input className={inputCls} value={editDraft.nationality} onChange={e => setEditDraft(d => ({ ...d, nationality: e.target.value }))} />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end pt-1">
                        <button onClick={() => setEditingId(null)} className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-white border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 transition-colors cursor-pointer">
                          <X className="h-3 w-3" /> Cancel
                        </button>
                        <button onClick={() => handleEditSave(p.id)} className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-lg px-3 py-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors cursor-pointer">
                          <Check className="h-3 w-3" /> Save Changes
                        </button>
                      </div>
                    </div>

                  ) : deletingId === p.id ? (
                    /* ─── Delete Confirm ─── */
                    <div className="p-4 flex items-center justify-between gap-3">
                      <p className="text-xs text-slate-800 dark:text-rose-400 font-medium">
                        Delete <strong>{p.firstName} {p.lastName}</strong>? This cannot be undone.
                      </p>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => setDeletingId(null)} className="text-[10px] border border-slate-300 dark:border-white/10 text-slate-700 dark:text-gray-400 rounded-lg px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer transition-colors">
                          Cancel
                        </button>
                        <button onClick={() => handleDelete(p.id)} className="text-[10px] bg-red-500 hover:bg-red-600 text-white rounded-lg px-3 py-1.5 cursor-pointer transition-colors">
                          Delete
                        </button>
                      </div>
                    </div>

                  ) : (
                    /* ─── View Mode ─── */
                    <div className="p-4 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                          <User className="h-3.5 w-3.5 text-amber-600 dark:text-amber-500" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wide">{p.firstName} {p.lastName}</p>
                          <p className="text-[10px] text-slate-500 dark:text-gray-400">
                            {p.gender} · {p.nationality}
                          </p>
                          <p className="text-[10px] font-mono text-slate-600 dark:text-gray-300">
                            🛂 {p.passportNumber}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => startEdit(p)}
                          className="h-7 w-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-white/10 text-slate-500 dark:text-gray-400 hover:border-amber-300 dark:hover:border-amber-500/40 hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => setDeletingId(p.id)}
                          className="h-7 w-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-white/10 text-slate-500 dark:text-gray-400 hover:border-rose-300 dark:hover:border-rose-500/40 hover:text-rose-500 dark:hover:text-rose-400 transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Profile Form */}
        <form onSubmit={handleAdd} className="glass-card rounded-2xl p-6 border border-slate-200 dark:border-white/5 space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-3">
            <Plus className="h-4 w-4 text-amber-500" />
            <h3 className="font-display text-sm text-slate-900 dark:text-white">Add Traveller Profile</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-slate-500 dark:text-gray-400 font-medium">First Name</label>
              <input type="text" required placeholder="e.g. Priyan" className={inputCls} value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-slate-500 dark:text-gray-400 font-medium">Last Name</label>
              <input type="text" required placeholder="e.g. Nair" className={inputCls} value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-slate-500 dark:text-gray-400 font-medium">Gender</label>
              <select className={inputCls} value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                <option>Male</option><option>Female</option><option>Other</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-slate-500 dark:text-gray-400 font-medium">Passport Number</label>
              <input type="text" required placeholder="e.g. S1234567" className={`${inputCls} font-mono`} value={form.passportNumber} onChange={e => setForm(f => ({ ...f, passportNumber: e.target.value }))} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-slate-500 dark:text-gray-400 font-medium">Nationality</label>
              <input type="text" placeholder="e.g. Indian" className={inputCls} value={form.nationality} onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))} />
            </div>
          </div>

          <button type="submit" className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-sm shadow-amber-500/20 font-display">
            <ShieldCheck className="h-4 w-4" /> Save Traveller Profile
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile;
