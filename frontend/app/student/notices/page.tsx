'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { API_URL } from '@/config';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Clock, Calendar, FileText, ExternalLink, ArrowLeft } from 'lucide-react';

export default function StudentNotices() {
    const [notices, setNotices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const userId = localStorage.getItem('user_id');
                const studentRes = await axios.get(`${API_URL}/student/${userId}`);
                const sectionTag = `(${studentRes.data.section})`;
                const res = await axios.get(`${API_URL}/materials/Global`);
                const myNotices = res.data.filter((m: any) => m.title.includes(sectionTag));
                setNotices(myNotices);
            } catch (error) { 
                console.error("Error:", error); 
            } finally { 
                setLoading(false); 
            }
        };
        fetchData();
    }, []);

    const getIcon = (type: string) => {
        if (type.includes('Timetable')) return <Clock className="text-blue-500" size={24} />;
        if (type.includes('Planner')) return <Calendar className="text-orange-500" size={24} />;
        return <FileText className="text-red-500" size={24} />;
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center font-medium text-blue-900">Syncing Notice Board...</div>;

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Navbar />
            <div className="container mx-auto px-4 py-8 flex-grow">
                <button 
                    onClick={() => router.back()} 
                    className="flex items-center gap-2 text-gray-500 hover:text-blue-900 text-sm font-medium mb-8 transition-colors"
                >
                    <ArrowLeft size={18} /> Back to Dashboard
                </button>

                <div className="mb-10">
                    <h1 className="text-3xl font-bold text-blue-900 tracking-tight">Official Notice Board</h1>
                    <p className="text-sm text-gray-500 mt-1">Verified Class Schedules & Academic Planners</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {notices.length > 0 ? notices.map((doc) => (
                        <div 
                            key={doc.id} 
                            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all flex flex-col group"
                        >
                            <div className="p-3 bg-gray-50 w-fit rounded-xl mb-4 group-hover:bg-blue-50 transition-colors">
                                {getIcon(doc.type)}
                            </div>
                            
                            <h3 className="font-bold text-blue-900 text-lg leading-snug mb-1">
                                {doc.title.split('(')[0]} {/* Simplifies title for cleaner look */}
                            </h3>
                            
                            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-6">
                                {doc.type}
                            </p>
                            
                            <a 
                                href={`${API_URL}/${doc.file_link}`} 
                                target="_blank" 
                                className="mt-auto w-full bg-blue-900 text-white py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-blue-800 transition-all shadow-sm"
                            >
                                View Document <ExternalLink size={14} />
                            </a>
                        </div>
                    )) : (
                        <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-gray-200">
                            <FileText size={48} className="mx-auto text-gray-200 mb-4" />
                            <p className="text-gray-400 font-medium">No official notices published for your section yet.</p>
                        </div>
                    )}
                </div>
            </div>
            <Footer />
        </div>
    );
}