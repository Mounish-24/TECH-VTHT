'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { API_URL } from '@/config';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { 
    CheckCircle2, Circle, BookOpen, ClipboardList, 
    Youtube, RefreshCw, ArrowLeft, LayoutDashboard, 
    Award, Zap, FileText, BarChart3
} from 'lucide-react';

function ProgressContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    
    // Support both Faculty viewing their own and Admin monitoring them
    const facultyId = searchParams.get('facultyId') || localStorage.getItem('user_id');
    const isAdminView = searchParams.get('adminView') === 'true';

    const [courses, setCourses] = useState<any[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<any>(null);
    const [progressData, setProgressData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const res = await axios.get(`${API_URL}/faculty/my-courses?staff_no=${facultyId}`);
                setCourses(res.data);
                if (res.data.length > 0) {
                    setSelectedCourse(res.data[0]);
                }
            } catch (err) {
                console.error("Load error", err);
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
    }, [facultyId]);

    useEffect(() => {
        if (selectedCourse) {
            fetchProgress(selectedCourse.code, selectedCourse.section);
        }
    }, [selectedCourse]);

    const fetchProgress = async (code: string, sec: string) => {
        try {
            const res = await axios.get(`${API_URL}/faculty/course-progress/${code}/${sec}`);
            setProgressData(res.data);
        } catch (err) {
            console.error("Progress fetch error", err);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <RefreshCw className="animate-spin text-blue-600" size={40} />
        </div>
    );

    const calculatePercentage = () => {
        if (!progressData) return 0;
        const unitScore = progressData.units.filter((u: any) => u.completed).length;
        const resourceScore = (progressData.qb_completed ? 1 : 0) + 
                             (progressData.assignments_count >= 2 ? 1 : 0) + 
                             (progressData.videos_completed ? 1 : 0);
        return Math.round(((unitScore + resourceScore) / 8) * 100);
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
            <Navbar />
            
            <div className="container mx-auto px-4 py-8 flex-grow">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                    <div>
                        <button 
                            onClick={() => router.back()} 
                            className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold text-xs uppercase tracking-widest mb-2 transition-colors"
                        >
                            <ArrowLeft size={16} /> Back
                        </button>
                        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                            <BarChart3 className="text-blue-600" size={32} /> 
                            {isAdminView ? "Faculty Monitoring" : "Teaching Progress"}
                        </h1>
                        <p className="text-slate-500 font-medium italic text-sm">Automated tracking based on database uploads</p>
                    </div>

                    <div className="flex bg-white p-1 rounded-xl shadow-sm border">
                        {courses.map((c) => (
                            <button
                                key={c.code + c.section}
                                onClick={() => setSelectedCourse(c)}
                                className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                                    selectedCourse?.code === c.code && selectedCourse?.section === c.section
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                {c.code} ({c.section})
                            </button>
                        ))}
                    </div>
                </div>

                {progressData ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        {/* LEFT: Overall Score Card */}
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-white rounded-3xl p-8 shadow-xl shadow-blue-100 border border-blue-50 text-center relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
                                <Award className="mx-auto text-orange-400 mb-4 group-hover:scale-110 transition-transform" size={48} />
                                <h3 className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em] mb-2">Subject Readiness</h3>
                                <div className="text-7xl font-black text-slate-900 mb-2">{calculatePercentage()}%</div>
                                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border p-0.5">
                                    <div 
                                        className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full transition-all duration-1000"
                                        style={{ width: `${calculatePercentage()}%` }}
                                    ></div>
                                </div>
                                <p className="mt-6 text-xs text-slate-400 font-medium">
                                    {calculatePercentage() === 100 ? "🎉 Course fully prepared for semester!" : "Complete all uploads to reach 100%"}
                                </p>
                            </div>

                            <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
                                <Zap className="absolute -right-4 -top-4 text-white/10" size={120} />
                                <h3 className="font-bold text-orange-400 uppercase text-[10px] tracking-widest mb-4">Quick Stats</h3>
                                <div className="space-y-4 relative z-10">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400 text-sm font-medium">Units Completed</span>
                                        <span className="font-black">{progressData.units.filter((u:any)=>u.completed).length} / 5</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400 text-sm font-medium">Assignments</span>
                                        <span className="font-black">{progressData.assignments_count} / 2</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: Detailed Stepper */}
                        <div className="lg:col-span-2 space-y-8">
                            
                            {/* Syllabus Timeline */}
                            <div className="bg-white rounded-3xl p-10 shadow-lg border border-slate-100">
                                <div className="flex items-center gap-3 mb-10 border-b pb-6">
                                    <div className="bg-blue-50 p-2 rounded-lg"><LayoutDashboard className="text-blue-600" /></div>
                                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Syllabus Milestones</h3>
                                </div>

                                <div className="space-y-10 relative">
                                    {/* Vertical Line */}
                                    <div className="absolute left-6 top-2 bottom-2 w-0.5 bg-slate-100"></div>

                                    {progressData.units.map((u: any) => (
                                        <div key={u.unit} className="flex items-start gap-8 relative z-10 group">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-lg ${
                                                u.completed 
                                                ? 'bg-green-500 text-white rotate-0' 
                                                : 'bg-white border-2 border-slate-100 text-slate-300 -rotate-12 group-hover:rotate-0'
                                            }`}>
                                                {u.completed ? <CheckCircle2 size={24} /> : <span className="font-black">0{u.unit}</span>}
                                            </div>
                                            <div className="flex-grow pt-1">
                                                <div className="flex justify-between items-center">
                                                    <h4 className={`font-black uppercase tracking-tight ${u.completed ? 'text-slate-800' : 'text-slate-300'}`}>
                                                        Unit Module {u.unit}
                                                    </h4>
                                                    {u.completed && (
                                                        <span className="bg-green-50 text-green-600 text-[10px] font-black px-3 py-1 rounded-full uppercase">Verified</span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-400 font-medium mt-1">
                                                    {u.completed ? "Syllabus topic saved & lecture notes uploaded." : "Requires topic entry and PDF notes upload."}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Resources Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className={`p-6 rounded-3xl border-2 transition-all ${progressData.qb_completed ? 'bg-white border-blue-100 shadow-md' : 'bg-gray-50 border-transparent opacity-60'}`}>
                                    <BookOpen className={`mb-4 ${progressData.qb_completed ? 'text-blue-600' : 'text-slate-400'}`} size={28} />
                                    <h4 className="font-black text-xs uppercase text-slate-800">Question Bank</h4>
                                    <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">{progressData.qb_completed ? "Completed" : "Pending"}</p>
                                </div>

                                <div className={`p-6 rounded-3xl border-2 transition-all ${progressData.assignments_count >= 2 ? 'bg-white border-orange-100 shadow-md' : 'bg-gray-50 border-transparent opacity-60'}`}>
                                    <ClipboardList className={`mb-4 ${progressData.assignments_count >= 2 ? 'text-orange-500' : 'text-slate-400'}`} size={28} />
                                    <h4 className="font-black text-xs uppercase text-slate-800">Assignments</h4>
                                    <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">{progressData.assignments_count} of 2 Uploaded</p>
                                </div>

                                <div className={`p-6 rounded-3xl border-2 transition-all ${progressData.videos_completed ? 'bg-white border-red-100 shadow-md' : 'bg-gray-50 border-transparent opacity-60'}`}>
                                    <Youtube className={`mb-4 ${progressData.videos_completed ? 'text-red-600' : 'text-slate-400'}`} size={28} />
                                    <h4 className="font-black text-xs uppercase text-slate-800">Unit Videos</h4>
                                    <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">{progressData.videos_completed ? "Verified" : "Pending"}</p>
                                </div>
                            </div>

                        </div>
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                        <Zap className="mx-auto text-slate-200 mb-4" size={48} />
                        <p className="text-slate-400 font-bold">Waiting for database synchronization...</p>
                    </div>
                )}
            </div>
            <Footer />
        </div>
    );
}

export default function FacultyProgressPage() {
    return (
        <Suspense fallback={<div>Loading Tracker...</div>}>
            <ProgressContent />
        </Suspense>
    );
}