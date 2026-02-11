'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '@/config';
import Navbar from '@/components/Navbar';
import { Trophy, Globe } from 'lucide-react';

export default function PlacementsPage() {
    const [students, setStudents] = useState([]);

    useEffect(() => {
        axios.get(`${API_URL}/placed-students`).then(res => setStudents(res.data));
    }, []);

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="container mx-auto px-4 py-16">
                <h1 className="text-5xl font-black text-blue-900 text-center uppercase tracking-tighter mb-16"><Trophy className="inline text-orange-500 mb-2 mr-4" size={56}/> Our Placed Students</h1>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
                    {students.map((s: any) => (
                        <div key={s.id} className="bg-white rounded-[40px] shadow-2xl overflow-hidden border-8 border-white hover:scale-105 transition-transform group">
                            <div className="relative h-72">
                                <img src={s.photo_url} className="w-full h-full object-cover" alt={s.name} />
                                <div className="absolute inset-0 bg-gradient-to-t from-blue-900/90 to-transparent flex flex-col justify-end p-6">
                                    <h3 className="text-white font-black text-2xl leading-none uppercase">{s.name}</h3>
                                    <p className="text-orange-400 font-bold uppercase text-xs mt-2">{s.company_name}</p>
                                </div>
                            </div>
                            <div className="p-6 bg-white text-center">
                                <div className="text-3xl font-black text-blue-900 mb-4">{s.lpa} <span className="text-sm text-gray-400">LPA</span></div>
                                <a href={s.linkedin_url} target="_blank" className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white py-3 rounded-2xl text-[10px] font-black uppercase hover:bg-blue-700 transition-all">
                                    <Globe size={14}/> View LinkedIn Profile
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}