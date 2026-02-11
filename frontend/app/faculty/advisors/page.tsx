'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { API_URL } from '@/config';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { 
    ChevronLeft, FilePlus, FileText, Calendar, 
    UploadCloud, Save, Trash2, Users, ClipboardEdit 
} from 'lucide-react';

export default function AdvisorPortal() {
    const [myClassData, setMyClassData] = useState<any>(null);
    const [advisorStudents, setAdvisorStudents] = useState<any[]>([]);
    const [myUploadedDocs, setMyUploadedDocs] = useState<any[]>([]);
    const [updateStatus, setUpdateStatus] = useState('');
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const userId = localStorage.getItem('user_id');
        const role = localStorage.getItem('role');

        if (role !== 'Faculty' && role !== 'HOD') {
            router.push('/login');
            return;
        }

        const fetchAdvisorData = async () => {
            try {
                // 1. Fetch class assignment and student list
                const advisorRes = await axios.get(`${API_URL}/advisors/my-class/${userId}`);
                setMyClassData(advisorRes.data.class_info);
                setAdvisorStudents(advisorRes.data.students);
                
                // 2. Fetch documents already pushed for this section
                const docsRes = await axios.get(`${API_URL}/advisors/my-docs/${advisorRes.data.class_info.section}`);
                setMyUploadedDocs(docsRes.data);
            } catch (err) {
                console.error("Advisor access error:", err);
                router.push('/faculty');
            } finally {
                setLoading(false);
            }
        };
        fetchAdvisorData();
    }, [router]);

    // Handler: Update Student Stats (CGPA/Attendance)
    const handleUpdateStudentStats = async (rollNo: string, cgpa: number, att: number) => {
        const formData = new FormData();
        formData.append('roll_no', rollNo);
        formData.append('cgpa', cgpa.toString());
        formData.append('attendance', att.toString());
        try {
            await axios.put(`${API_URL}/advisors/update-student-stats`, formData);
            setUpdateStatus(`UPDATED ${rollNo} SUCCESSFULLY!`);
            setTimeout(() => setUpdateStatus(''), 3000);
        } catch (err) { 
            alert("FAILED TO UPDATE STUDENT RECORD."); 
        }
    };

    // Handler: Upload official docs (Timetable/Planner/Exam TT)
    const handlePushDoc = async (type: string) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.jpg,.jpeg,.png';
        input.onchange = async (e: any) => {
            const file = e.target.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', type);
            formData.append('year', myClassData.year);
            formData.append('section', myClassData.section);

            try {
                setUpdateStatus(`PUBLISHING ${type.toUpperCase()}...`);
                await axios.post(`${API_URL}/advisors/upload-docs`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                
                // Refresh the document list
                const res = await axios.get(`${API_URL}/advisors/my-docs/${myClassData.section}`);
                setMyUploadedDocs(res.data);
                setUpdateStatus('');
                alert(`✅ ${type.toUpperCase()} PUBLISHED TO SECTION ${myClassData.section}!`);
            } catch (err) { 
                setUpdateStatus(''); 
                alert("UPLOAD FAILED. PLEASE TRY AGAIN."); 
            }
        };
        input.click();
    };

    // Handler: Delete live document
    const handleDeleteDoc = async (id: number) => {
        if(!confirm("REMOVE THIS DOCUMENT FROM THE STUDENT NOTICE BOARD?")) return;
        try {
            await axios.delete(`${API_URL}/advisors/delete-doc/${id}`);
            setMyUploadedDocs(myUploadedDocs.filter(d => d.id !== id));
        } catch (err) { 
            alert("DELETE OPERATION FAILED."); 
        }
    };

    if (loading || !myClassData) return (
        <div className="min-h-screen flex items-center justify-center font-black text-blue-900 uppercase tracking-widest animate-pulse">
            Establishing Advisor Session...
        </div>
    );

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Navbar />
            <div className="container mx-auto px-4 py-8 flex-grow">
                {/* Back Navigation */}
                <button 
                    onClick={() => router.push('/faculty')} 
                    className="flex items-center gap-2 text-gray-400 hover:text-blue-900 font-black uppercase text-[10px] tracking-widest mb-6 transition-all group"
                >
                    <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
                    Back to Faculty Dashboard
                </button>

                {/* Header Section */}
                <div className="bg-white p-8 rounded-2xl shadow-md border-l-[12px] border-orange-500 mb-8 flex justify-between items-center relative overflow-hidden">
                    <Users size={120} className="absolute -right-4 -bottom-4 text-orange-500 opacity-5 pointer-events-none" />
                    <div className="relative z-10">
                        <h1 className="text-4xl font-black text-blue-900 uppercase tracking-tighter leading-none">Class Advisor Portal</h1>
                        <p className="text-orange-600 font-black uppercase text-xs tracking-[0.3em] mt-3">
                            Section {myClassData.section} | Year {myClassData.year} Academic Management
                        </p>
                    </div>
                </div>

                {/* Live Update Notification */}
                {updateStatus && (
                    <div className="mb-6 p-4 bg-blue-900 text-white rounded-xl text-center font-black text-xs tracking-widest animate-bounce uppercase shadow-lg">
                        {updateStatus}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* LEFT: STUDENT RECORDS TABLE */}
                    <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-orange-100 p-2 rounded-lg text-orange-600"><ClipboardEdit size={20}/></div>
                            <h2 className="text-xl font-black text-blue-900 uppercase tracking-tight">Student Performance Records</h2>
                        </div>
                        
                        <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-inner bg-gray-50/30">
                            <table className="w-full text-left">
                                <thead className="bg-gray-900 text-white text-[9px] font-black uppercase tracking-[0.2em]">
                                    <tr>
                                        <th className="p-4">Roll No</th>
                                        <th className="p-4">Name</th>
                                        <th className="p-4 text-center">CGPA</th>
                                        <th className="p-4 text-center">Att %</th>
                                        <th className="p-4 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y text-sm font-bold">
                                    {advisorStudents.map((stu) => (
                                        <tr key={stu.roll_no} className="hover:bg-orange-50/50 transition-colors bg-white">
                                            <td className="p-4 font-mono text-blue-600">{stu.roll_no}</td>
                                            <td className="p-4 text-gray-800 uppercase text-xs">{stu.name}</td>
                                            <td className="p-4 text-center">
                                                <input 
                                                    type="number" 
                                                    step="0.01" 
                                                    defaultValue={stu.cgpa} 
                                                    id={`cgpa-${stu.roll_no}`} 
                                                    className="w-20 p-2 border-2 border-gray-100 rounded-lg text-center font-black text-blue-900 outline-none focus:border-blue-900 transition-all" 
                                                />
                                            </td>
                                            <td className="p-4 text-center">
                                                <input 
                                                    type="number" 
                                                    defaultValue={stu.attendance_percentage} 
                                                    id={`att-${stu.roll_no}`} 
                                                    className={`w-20 p-2 border-2 border-gray-100 rounded-lg text-center font-black outline-none focus:border-blue-900 transition-all ${stu.attendance_percentage < 75 ? 'text-red-600' : 'text-green-600'}`} 
                                                />
                                            </td>
                                            <td className="p-4 text-center">
                                                <button 
                                                    onClick={() => {
                                                        const c = (document.getElementById(`cgpa-${stu.roll_no}`) as HTMLInputElement).value;
                                                        const a = (document.getElementById(`att-${stu.roll_no}`) as HTMLInputElement).value;
                                                        handleUpdateStudentStats(stu.roll_no, Number(c), Number(a));
                                                    }} 
                                                    className="p-3 bg-blue-900 text-white hover:bg-orange-500 rounded-xl transition-all shadow-md active:scale-95"
                                                >
                                                    <Save size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* RIGHT SIDEBAR: UPLOADS & LIVE DOCS */}
                    <div className="space-y-6">
                        {/* Upload Controls */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h2 className="text-lg font-black text-blue-900 mb-6 uppercase tracking-tighter border-b-2 border-orange-500 pb-2 inline-block">Publish Documents</h2>
                            <div className="space-y-4 mt-2">
                                <button 
                                    onClick={() => handlePushDoc('Timetable')} 
                                    className="w-full py-4 bg-blue-50 text-blue-900 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-blue-900 hover:text-white transition-all border border-blue-100"
                                >
                                    <Calendar size={20}/> Push Timetable
                                </button>
                                <button 
                                    onClick={() => handlePushDoc('Academic Planner')} 
                                    className="w-full py-4 bg-orange-50 text-orange-900 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-orange-500 hover:text-white transition-all border border-orange-100"
                                >
                                    <FilePlus size={20}/> Push Planner
                                </button>
                                <button 
                                    onClick={() => handlePushDoc('Exam Timetable')} 
                                    className="w-full py-4 bg-red-50 text-red-900 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-red-600 hover:text-white transition-all border border-red-100"
                                >
                                    <FileText size={20}/> Push Exam Schedule
                                </button>
                            </div>
                        </div>

                        {/* Live Document List */}
                        <div className="bg-gray-900 p-6 rounded-[32px] shadow-2xl">
                            <h3 className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                                <UploadCloud size={14}/> Live on Portal
                            </h3>
                            <div className="space-y-3">
                                {myUploadedDocs.map((doc) => (
                                    <div key={doc.id} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/10 group transition-all hover:bg-white/10">
                                        <div>
                                            <p className="text-[11px] font-black text-white uppercase tracking-tight leading-none">{doc.title}</p>
                                            <p className="text-[8px] text-orange-500 uppercase font-black mt-2 tracking-widest">{doc.type}</p>
                                        </div>
                                        <button 
                                            onClick={() => handleDeleteDoc(doc.id)} 
                                            className="p-2 text-white/20 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                                {myUploadedDocs.length === 0 && (
                                    <div className="text-center py-10 border-2 border-dashed border-white/10 rounded-2xl">
                                        <p className="text-[9px] text-white/20 font-black uppercase tracking-widest italic">No active documents for Section {myClassData?.section}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
}