'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '@/config';
import Navbar from '@/components/Navbar';
import { Trash2, Send, PlusCircle, Building2, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminPlacementPortal() {
  const router = useRouter();

  const [notices, setNotices] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);

  // ─── Fetch Functions ───────────────────────────────────────
  const fetchNotices = async () => {
    try {
      const res = await axios.get(`${API_URL}/announcements?type=Placement`);
      setNotices(res.data || []);
    } catch (err) {
      console.error('Failed to load placement notices', err);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await axios.get(`${API_URL}/placements/students`);
      setStudents(res.data || []);
    } catch (err: any) {
      if (err.response?.status !== 404) {
        console.error('Failed to load placed students', err);
      }
      setStudents([]); 
    }
  };

  const fetchCompanies = async () => {
    try {
      const res = await axios.get(`${API_URL}/placements/companies`);
      setCompanies(res.data || []);
    } catch (err: any) {
      if (err.response?.status !== 404) {
        console.error('Failed to load companies', err);
      }
      setCompanies([]); 
    }
  };

  // ─── Delete Handlers ───────────────────────────────────────
  const handleDeleteNotice = async (id: number) => {
    if (!confirm('Delete this notice?')) return;
    try {
      await axios.delete(`${API_URL}/placements/announcements/${id}`);
      await fetchNotices();
      alert('Notice deleted');
    } catch (err) {
      alert('Failed to delete notice');
    }
  };

  const handleDeleteStudent = async (id: number) => {
    if (!confirm('Delete this success story?')) return;
    try {
      await axios.delete(`${API_URL}/placements/student/${id}`);
      await fetchStudents();
      alert('Success story deleted');
    } catch (err: any) {
      alert('Failed to delete student record (endpoint may not exist yet)');
    }
  };

  const handleDeleteCompany = async (id: number) => {
    if (!confirm('Remove this company from marquee?')) return;
    try {
      await axios.delete(`${API_URL}/placements/companies/${id}`);
      await fetchCompanies();
      alert('Company removed');
    } catch (err: any) {
      alert('Failed to remove company (endpoint may not exist yet)');
    }
  };

  // ─── Load data ─────────────────────────────────────────────
  useEffect(() => {
    fetchNotices();
    fetchStudents();
    fetchCompanies();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="container mx-auto p-6 md:p-8">
        <button
          onClick={() => router.push('/admin')}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 font-bold uppercase text-xs tracking-widest transition-colors"
        >
          <ArrowLeft size={16} /> Back to Admin
        </button>

        <h1 className="text-4xl md:text-5xl font-black text-blue-900 mb-10 border-l-8 border-orange-500 pl-6 uppercase tracking-tighter">
          Placement Center
        </h1>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
          {/* LEFT COLUMN: All Data Entry Forms */}
          <div className="space-y-10">
            {/* Broadcast Notice Form */}
            <form
              className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await axios.post(`${API_URL}/placements/announcements`, new FormData(e.currentTarget));
                  alert('Notice broadcasted!');
                  await fetchNotices(); // Awaited so UI updates immediately
                  (e.target as HTMLFormElement).reset();
                } catch (err) {
                  alert('Failed to post notice');
                }
              }}
            >
              <h3 className="font-black text-blue-900 mb-6 flex items-center gap-2 uppercase tracking-tight">
                <Send className="text-orange-500" size={24} /> Broadcast Drive Notice
              </h3>
              <input name="title" placeholder="Drive Title" className="w-full p-4 bg-gray-50 rounded-2xl mb-4" required />
              <textarea name="description" placeholder="Description" className="w-full p-4 bg-gray-50 rounded-2xl mb-4" rows={4} required />
              <div className="grid grid-cols-2 gap-4 mb-6">
                <input name="link" placeholder="Registration Link (optional)" className="p-4 bg-gray-50 rounded-2xl" />
                <select name="year" className="p-4 bg-orange-50 rounded-2xl font-black text-orange-700">
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">Final Year</option>
                </select>
              </div>
              <input type="hidden" name="posted_by" value="Placement Cell" />
              <button className="w-full bg-blue-900 text-white font-black py-4 rounded-2xl hover:bg-orange-500 transition-all shadow-xl">
                POST ANNOUNCEMENT
              </button>
            </form>

            {/* Add Placed Student Form */}
            <form
              className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await axios.post(`${API_URL}/placements/student`, new FormData(e.currentTarget));
                  alert('Success story added!');
                  await fetchStudents(); // Uncommented and awaited for instant refresh
                  (e.target as HTMLFormElement).reset();
                } catch (err) {
                  alert('Failed to add student record');
                }
              }}
            >
              <h3 className="font-black text-blue-900 mb-6 flex items-center gap-2 uppercase tracking-tight">
                <PlusCircle className="text-green-500" size={24} /> Add Placed Student
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <input name="name" placeholder="Name" className="p-4 bg-gray-50 rounded-2xl" required />
                <input name="company" placeholder="Company" className="p-4 bg-gray-50 rounded-2xl" required />
                <input name="lpa" placeholder="LPA" className="p-4 bg-gray-50 rounded-2xl" required />
                <input name="linkedin" placeholder="LinkedIn URL" className="p-4 bg-gray-50 rounded-2xl" required />
              </div>
              <input type="file" name="file" accept="image/*" className="mb-6 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" required />
              <button className="w-full bg-green-600 text-white font-black py-4 rounded-2xl hover:bg-green-700 transition-all">
                SAVE SUCCESS STORY
              </button>
            </form>

            {/* Add Company Form (Moved Here) */}
            <form
              className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await axios.post(`${API_URL}/placements/companies`, new FormData(e.currentTarget));
                  alert('Logo added to marquee!');
                  await fetchCompanies(); // Uncommented and awaited for instant refresh
                  (e.target as HTMLFormElement).reset();
                } catch (err) {
                  alert('Failed to add company logo');
                }
              }}
            >
              <h3 className="font-black text-blue-900 mb-6 flex items-center gap-2 uppercase tracking-tight">
                <Building2 className="text-blue-500" size={24} /> Add Hiring Partner Logo
              </h3>
              <input name="name" placeholder="Company Name" className="w-full p-4 bg-gray-50 rounded-2xl mb-6" required />
              <input
                type="file"
                name="file"
                accept="image/*"
                className="mb-6 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                required
              />
              <button className="w-full border-2 border-blue-900 text-blue-900 font-black py-4 rounded-2xl hover:bg-blue-900 hover:text-white transition-all shadow-md">
                UPDATE HOMEPAGE MARQUEE
              </button>
            </form>
          </div>

          {/* RIGHT COLUMN: Active Data Lists */}
          <div className="space-y-10">
            {/* Active Notices */}
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 min-h-[380px]">
              <h3 className="font-black text-gray-400 mb-6 uppercase text-xs tracking-widest">Active Drive Notices</h3>
              <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2">
                {notices.length === 0 ? (
                  <p className="text-center py-12 text-gray-400 italic text-sm">No active notices yet</p>
                ) : (
                  notices.map((n) => (
                    <div key={n.id} className="flex justify-between items-center p-5 bg-blue-50/50 rounded-2xl border border-blue-100 hover:bg-blue-50 transition-colors">
                      <div>
                        <p className="font-black text-blue-900 uppercase text-sm">{n.title}</p>
                        <p className="text-xs font-bold text-gray-500 mt-1">Year {n.target_year || 'All'}</p>
                      </div>
                      <button onClick={() => handleDeleteNotice(n.id)} className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Active Success Stories */}
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 min-h-[380px]">
              <h3 className="font-black text-gray-400 mb-6 uppercase text-xs tracking-widest">Active Success Stories</h3>
              <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2">
                {students.length === 0 ? (
                  <p className="text-center py-12 text-gray-400 italic text-sm">
                    No success stories added yet<br />
                    (GET /placements/students not implemented)
                  </p>
                ) : (
                  students.map((s) => (
                    <div key={s.id} className="flex justify-between items-start p-5 bg-green-50/40 rounded-2xl border border-green-100 hover:bg-green-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-green-800">{s.name}</p>
                        <p className="text-sm text-gray-700 mt-1">{s.company} • {s.lpa} LPA</p>
                        {s.linkedin && (
                          <a href={s.linkedin} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-1 block">
                            LinkedIn →
                          </a>
                        )}
                      </div>
                      <button onClick={() => handleDeleteStudent(s.id)} className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors flex-shrink-0">
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Active Hiring Partners */}
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 min-h-[380px]">
              <h3 className="font-black text-gray-400 mb-6 uppercase text-xs tracking-widest">Active Hiring Partners (Marquee)</h3>
              <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2">
                {companies.length === 0 ? (
                  <p className="text-center py-12 text-gray-400 italic text-sm">
                    No companies added yet<br />
                    (GET /placements/companies not implemented)
                  </p>
                ) : (
                  companies.map((c) => (
                    <div key={c.id} className="flex justify-between items-center p-5 bg-blue-50/40 rounded-2xl border border-blue-100 hover:bg-blue-50 transition-colors">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        {c.logo_url && (
                          <img
                            src={c.logo_url}
                            alt={c.name}
                            className="h-10 w-auto object-contain bg-white p-1 border rounded"
                            onError={(e) => (e.currentTarget.style.display = 'none')}
                          />
                        )}
                        <p className="font-bold text-blue-900 truncate">{c.name}</p>
                      </div>
                      <button onClick={() => handleDeleteCompany(c.id)} className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors flex-shrink-0">
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}