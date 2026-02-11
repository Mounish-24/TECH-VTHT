'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '@/config';
import Navbar from '@/components/Navbar';
import { Trash2, Send, PlusCircle, Building2, Briefcase, ArrowLeft, Globe } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminPlacementPortal() {
    const router = useRouter();
    const [notices, setNotices] = useState([]);

    const fetchData = async () => {
        const res = await axios.get(`${API_URL}/announcements?type=Placement`);
        setNotices(res.data);
    };

    useEffect(() => { fetchData(); }, []);

    const handleDelete = async (id: number) => {
        if (confirm("Delete this notice?")) {
            await axios.delete(`${API_URL}/placements/announcements/${id}`);
            fetchData();
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="container mx-auto p-8">
                <button onClick={() => router.push('/admin')} className="mb-6 flex items-center gap-2 text-gray-500 font-bold uppercase text-[10px] tracking-widest"><ArrowLeft size={16}/> Back to Admin</button>
                <h1 className="text-4xl font-black text-blue-900 mb-10 border-l-8 border-orange-500 pl-6 uppercase tracking-tighter">Placement Center</h1>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                    <div className="space-y-8">
                        {/* BROADCAST FORM */}
                        <form className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100" onSubmit={async (e) => {
                            e.preventDefault();
                            await axios.post(`${API_URL}/placements/announcements`, new FormData(e.currentTarget));
                            alert("Notice Pushed!");
                            fetchData();
                        }}>
                            <h3 className="font-black text-blue-900 mb-6 flex items-center gap-2 uppercase tracking-tight"><Send className="text-orange-500" size={24}/> Broadcast Drive Notice</h3>
                            <input name="title" placeholder="Drive Title" className="w-full p-4 bg-gray-50 rounded-2xl mb-4" required />
                            <textarea name="description" placeholder="Description" className="w-full p-4 bg-gray-50 rounded-2xl mb-4" rows={3} required />
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <input name="link" placeholder="Reg Link" className="p-4 bg-gray-50 rounded-2xl" />
                                <select name="year" className="p-4 bg-orange-50 rounded-2xl font-black text-orange-700">
                                    <option value="1">1st Year</option><option value="2">2nd Year</option><option value="3">3rd Year</option><option value="4">Final Year</option>
                                </select>
                            </div>
                            <input type="hidden" name="posted_by" value="Placement Cell" />
                            <button className="w-full bg-blue-900 text-white font-black py-4 rounded-2xl hover:bg-orange-500 transition-all shadow-xl">POST ANNOUNCEMENT</button>
                        </form>

                        {/* STUDENT SUCCESS FORM */}
                        <form className="bg-white p-8 rounded-3xl shadow-xl" onSubmit={async (e) => {
                            e.preventDefault();
                            await axios.post(`${API_URL}/placements/student`, new FormData(e.currentTarget));
                            alert("Success Story Added!");
                        }}>
                            <h3 className="font-black text-blue-900 mb-6 flex items-center gap-2 uppercase tracking-tight"><PlusCircle className="text-green-500" size={24}/> Add Placed Student</h3>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <input name="name" placeholder="Name" className="p-4 bg-gray-50 rounded-2xl" required />
                                <input name="company" placeholder="Company" className="p-4 bg-gray-50 rounded-2xl" required />
                                <input name="lpa" placeholder="LPA" className="p-4 bg-gray-50 rounded-2xl" required />
                                <input name="linkedin" placeholder="LinkedIn URL" className="p-4 bg-gray-50 rounded-2xl" required />
                            </div>
                            <input type="file" name="file" className="mb-4 text-xs" required />
                            <button className="w-full bg-green-600 text-white font-black py-4 rounded-2xl">SAVE RECORD</button>
                        </form>
                    </div>

                    <div className="space-y-8">
                        {/* ACTIVE NOTICES LIST */}
                        <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 min-h-[400px]">
                            <h3 className="font-black text-gray-400 mb-6 uppercase text-xs tracking-widest">Active Drive Notices</h3>
                            <div className="space-y-4">
                                {notices.map((n: any) => (
                                    <div key={n.id} className="flex justify-between items-center p-5 bg-blue-50/50 rounded-2xl border border-blue-100">
                                        <div><p className="font-black text-blue-900 uppercase text-sm">{n.title}</p><p className="text-[9px] font-bold text-gray-400 uppercase">Year {n.target_year}</p></div>
                                        <button onClick={() => handleDelete(n.id)} className="p-3 text-red-400 hover:text-red-600"><Trash2 size={20}/></button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* COMPANY MARQUEE FORM */}
                        <form className="bg-white p-8 rounded-3xl shadow-xl" onSubmit={async (e) => {
                            e.preventDefault();
                            await axios.post(`${API_URL}/placements/companies`, new FormData(e.currentTarget));
                            alert("Logo Added to Homepage!");
                        }}>
                            <h3 className="font-black text-blue-900 mb-4 flex items-center gap-2 uppercase tracking-tight"><Building2 className="text-blue-500" size={24}/> Hiring Partner Logo</h3>
                            <input name="name" placeholder="Company Name" className="w-full p-4 bg-gray-50 rounded-2xl mb-4" required />
                            <input type="file" name="file" className="mb-4 text-xs" required />
                            <button className="w-full border-2 border-blue-900 text-blue-900 font-black py-3 rounded-2xl hover:bg-blue-900 hover:text-white transition-all text-xs">UPDATE HOMEPAGE MARQUEE</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}