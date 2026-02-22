'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { API_URL } from '@/config';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
    Download, RefreshCw, CheckSquare, Square, 
    User, BookOpen, Hash, GraduationCap, ClipboardCheck, ArrowLeft, CheckCircle2
} from 'lucide-react';

function ProgressContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    
    const [facultyId, setFacultyId] = useState<string | null>(null);
    const [facultyName, setFacultyName] = useState<string>("");
    const [courses, setCourses] = useState<any[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<any>(null);
    const [progressData, setProgressData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [courseHeader, setCourseHeader] = useState({
        staff_name: "Loading...",
        subject_id: "N/A",
        subject_name: "N/A",
        section: "N/A"
    });

    useEffect(() => {
        const id = searchParams.get('facultyId') || localStorage.getItem('user_id');
        const name = localStorage.getItem('user_name') || "Faculty Member";
        setFacultyId(id);
        setFacultyName(name);
    }, [searchParams]);

    useEffect(() => {
        if (!facultyId) return;
        const fetchInitialData = async () => {
            try {
                const res = await axios.get(`${API_URL}/faculty/my-courses?staff_no=${facultyId}`);
                setCourses(res.data);
                if (res.data.length > 0) setSelectedCourse(res.data[0]);
            } catch (err) {
                console.error("Course fetch error:", err);
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
            
            if (res.data.course_details) {
                setCourseHeader(res.data.course_details);
            }
        } catch (err) {
            console.error("Progress fetch error:", err);
        }
    };

    const calculatePercentage = () => {
        if (!progressData || !progressData.units) return 0;
        
        // Use the "completed" boolean directly from the backend for accuracy
        const unitScore = progressData.units.filter((u: any) => u.completed).length;
        const assignmentScore = Math.min(progressData.assignments_count || 0, 2);
        const resourceScore = (progressData.qb_completed ? 1 : 0) + (progressData.videos_completed ? 1 : 0);
        
        // Total possible points: 5 (units) + 2 (assignments) + 2 (resources) = 9
        return Math.round(((unitScore + assignmentScore + resourceScore) / 9) * 100);
    };

    const downloadPDF = () => {
        try {
            if (typeof window === 'undefined' || !progressData) return;
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();

            doc.setFontSize(18);
            doc.setTextColor(0, 51, 102); 
            doc.text("Vel Tech High Tech", pageWidth / 2, 15, { align: "center" });
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text("Dr. Rangarajan Dr. Sakunthala Engineering College", pageWidth / 2, 22, { align: "center" });
            doc.line(10, 25, pageWidth - 10, 25);

            autoTable(doc, {
                startY: 30,
                body: [
                    ['Staff Name:', courseHeader.staff_name, 'Staff ID:', facultyId],
                    ['Subject:', courseHeader.subject_name, 'Sub Code:', courseHeader.subject_id],
                    ['Section:', courseHeader.section, 'Completion:', `${calculatePercentage()}%`]
                ],
                theme: 'plain',
                styles: { fontSize: 9, cellPadding: 2 }
            });

            const lastY = (doc as any).lastAutoTable.finalY || 60;
            doc.setFontSize(12);
            doc.setTextColor(0);
            doc.text("Syllabus Completion Summary", 14, lastY + 10);
            
            const unitBody = progressData.units.map((u: any) => [
                `Unit ${u.unit}`,
                `${u.topic_count}/${u.required_count} Topics`,
                u.completed ? "COMPLETED" : "IN PROGRESS"
            ]);

            autoTable(doc, {
                startY: lastY + 15,
                head: [['Unit Module', 'Coverage (Files)', 'Status']],
                body: unitBody,
                headStyles: { fillColor: [0, 51, 102] },
                styles: { fontSize: 10 }
            });

            const checkY = (doc as any).lastAutoTable.finalY + 10;
            doc.text("Resource Checklist", 14, checkY);
            
            autoTable(doc, {
                startY: checkY + 5,
                head: [['Resource Type', 'U-1', 'U-2', 'U-3', 'U-4', 'U-5']],
                body: [
                    ['Question Bank', ...progressData.units.map((u: any) => u.qb_done ? "YES" : "NO")],
                    ['Lecture Videos', ...progressData.units.map((u: any) => u.video_done ? "YES" : "NO")],
                    ['Assignments', 
                        progressData.assignments_count >= 1 ? "A1 DONE" : "A1 PENDING", 
                        progressData.assignments_count >= 2 ? "A2 DONE" : "A2 PENDING", 
                        "-", "-", "-"
                    ]
                ],
                theme: 'grid',
                styles: { halign: 'center', fontSize: 8 }
            });

            const finalSignY = (doc as any).lastAutoTable.finalY + 30;
            doc.line(15, finalSignY, 70, finalSignY);
            doc.text("Faculty Signature", 30, finalSignY + 5);
            doc.line(130, finalSignY, 185, finalSignY);
            doc.text("HOD Signature", 150, finalSignY + 5);

            doc.save(`VelTech_Progress_${courseHeader.subject_id}.pdf`);
        } catch (error) {
            console.error("PDF Error:", error);
            alert("Error generating PDF.");
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-white">
            <RefreshCw className="animate-spin text-blue-900" size={48} />
        </div>
    );

    return (
        <div className="bg-white min-h-screen flex flex-col font-sans text-slate-900">
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 py-8 w-full flex-grow">
                
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 border-b-2 border-slate-100 pb-6 gap-4">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <button 
                            onClick={() => router.back()} 
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600"
                        >
                            <ArrowLeft size={24} />
                        </button>
                        <div className="text-center md:text-left">
                            <h1 className="text-3xl font-black text-blue-900 tracking-tighter uppercase">Vel Tech High Tech</h1>
                            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Course Progress Overview</p>
                        </div>
                    </div>
                    <button onClick={downloadPDF} className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 font-black text-xs uppercase shadow-lg">
                        <Download size={18} /> Download PDF Report
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-slate-50 rounded-3xl p-8 border-2 border-slate-100 shadow-sm">
                            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Total Course Completion</h3>
                            <div className="text-7xl font-black text-blue-900 mb-4">{calculatePercentage()}%</div>
                            <div className="w-full bg-white h-4 rounded-full border-2 p-0.5 overflow-hidden">
                                <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${calculatePercentage()}%` }}></div>
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl p-6 border-2 border-slate-100">
                            <h3 className="font-black text-sm uppercase mb-4 border-b pb-2 flex items-center gap-2">
                                <ClipboardCheck size={18} className="text-blue-600" /> Mandatory Tasks
                            </h3>
                            <div className="grid grid-cols-1 gap-3">
                                <div className={`flex items-center justify-between p-4 rounded-2xl border-2 ${progressData?.assignments_count >= 1 ? 'border-green-200 bg-green-50' : 'border-slate-50'}`}>
                                    <span className="text-xs font-black">ASSIGNMENT 1</span>
                                    {progressData?.assignments_count >= 1 ? <CheckSquare className="text-green-600" /> : <Square className="text-slate-200" />}
                                </div>
                                <div className={`flex items-center justify-between p-4 rounded-2xl border-2 ${progressData?.assignments_count >= 2 ? 'border-green-200 bg-green-50' : 'border-slate-50'}`}>
                                    <span className="text-xs font-black">ASSIGNMENT 2</span>
                                    {progressData?.assignments_count >= 2 ? <CheckSquare className="text-green-600" /> : <Square className="text-slate-200" />}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-8 space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { label: 'Staff Name', val: courseHeader.staff_name, icon: User },
                                { label: 'Subject ID', val: courseHeader.subject_id, icon: Hash },
                                { label: 'Subject', val: courseHeader.subject_name, icon: BookOpen },
                                { label: 'Section', val: courseHeader.section, icon: GraduationCap }
                            ].map((item, idx) => (
                                <div key={idx} className="bg-slate-900 text-white p-4 rounded-2xl">
                                    <p className="text-[8px] font-black uppercase text-slate-400 mb-1">{item.label}</p>
                                    <div className="flex items-center gap-2">
                                        <item.icon size={12} className="text-blue-400"/>
                                        <span className="text-[10px] font-bold truncate">{item.val}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="bg-white border-2 border-slate-900 rounded-3xl overflow-hidden shadow-xl">
                            <div className="bg-slate-900 text-white p-4 text-center font-black uppercase text-xs tracking-widest">
                                Unit Syllabus Milestones
                            </div>
                            <div className="divide-y-2 divide-slate-100">
                                {progressData?.units.map((u: any) => {
                                    // Use the backend's required_count instead of hardcoded 5
                                    const req = u.required_count || 5;
                                    const progressPercent = Math.min((u.topic_count / req) * 100, 100);

                                    return (
                                        <div key={u.unit} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg transition-colors ${u.completed ? 'bg-green-600 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>
                                                    {u.unit}
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-blue-900 uppercase text-sm">Unit Module {u.unit}</h4>
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase">
                                                        {u.topic_count || 0} / {req} Files Uploaded
                                                    </p>
                                                    {!u.completed && (
                                                        <div className="w-24 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                                            <div className="h-full bg-blue-500" style={{ width: `${progressPercent}%` }}></div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                {u.completed ? (
                                                    <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-xl border border-green-200">
                                                        <CheckCircle2 size={18} />
                                                        <span className="text-[10px] font-black uppercase">Completed</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 bg-slate-50 text-slate-400 px-4 py-2 rounded-xl border border-slate-200">
                                                        <Square size={18} />
                                                        <span className="text-[10px] font-black uppercase italic">In Progress</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="border-2 border-slate-100 rounded-3xl p-6">
                                <h4 className="font-black text-xs uppercase mb-4 text-center border-b pb-2">Question Bank</h4>
                                <div className="flex justify-around">
                                    {[1,2,3,4,5].map(i => (
                                        <div key={i} className="flex flex-col items-center gap-1">
                                            <span className="text-[9px] font-bold text-slate-400">U{i}</span>
                                            {progressData?.units[i-1]?.qb_done ? <CheckSquare className="text-green-600"/> : <Square className="text-slate-200"/>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="border-2 border-slate-100 rounded-3xl p-6">
                                <h4 className="font-black text-xs uppercase mb-4 text-center border-b pb-2">Lecture Videos</h4>
                                <div className="flex justify-around">
                                    {[1,2,3,4,5].map(i => (
                                        <div key={i} className="flex flex-col items-center gap-1">
                                            <span className="text-[9px] font-bold text-slate-400">U{i}</span>
                                            {progressData?.units[i-1]?.video_done ? <CheckSquare className="text-red-600"/> : <Square className="text-slate-200"/>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
}

export default function FacultyProgressPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><RefreshCw className="animate-spin" /></div>}>
            <ProgressContent />
        </Suspense>
    );
}