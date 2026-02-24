'use client';
import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { API_URL } from '@/config';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import {
    FileText, BookOpen, Bell, CheckCircle, Download,
    ArrowLeft, ClipboardList, PlayCircle, ExternalLink,
    RefreshCw, ChevronRight
} from 'lucide-react';

export default function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const resolvedParams = use(params);
    const courseId = decodeURIComponent(resolvedParams.id);

    const [activeTab, setActiveTab] = useState('notes');
    const [materials, setMaterials] = useState<any[]>([]);
    const [syllabusTopics, setSyllabusTopics] = useState<any[]>([]); // New state for Unit Headers
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [studentProfile, setStudentProfile] = useState<any>(null);
    const [marks, setMarks] = useState<any>(null);
    const [loading, setLoading] = useState(true);

  const fetchCourseContent = async () => {
        const userId = localStorage.getItem('user_id');
        if (!userId || !courseId) return;

        try {
            // 1. Fetch Student Profile
            const stuRes = await axios.get(`${API_URL}/student/${userId}`);
            const studentData = stuRes.data;
            setStudentProfile(studentData);

            const cleanId = courseId.toString().trim().toUpperCase();

            // 2. 🌟 CRITICAL FIX: Fetch Marks FIRST to translate Subject Name to Course Code
            const marksRes = await axios.get(`${API_URL}/marks/cia?student_id=${userId}`);
            const specificMark = (marksRes.data || []).find((m: any) =>
                m.course_code?.trim().toUpperCase() === cleanId ||
                m.subject?.trim().toUpperCase() === cleanId
            );
            setMarks(specificMark);

            // This grabs the REAL code (e.g., "21AD32A") instead of "ARTIFICIAL INTELLIGENCE"
            const actualCourseCode = specificMark ? specificMark.course_code.trim().toUpperCase() : cleanId;

            // 3. Fetch Announcements using the REAL course code
            const annRes = await axios.get(`${API_URL}/announcements?audience=Student&student_id=${userId}`);
            const specificNotices = (annRes.data || []).filter((a: any) =>
                a.type === 'Subject' && (
                    a.course_code?.trim().toUpperCase() === actualCourseCode || 
                    a.course_code?.trim().toUpperCase() === cleanId
                )
            );
            setAnnouncements(specificNotices);

            // 4. Fetch Materials using the REAL course code
            let matRes;
            try {
                matRes = await axios.get(`${API_URL}/materials/${encodeURIComponent(actualCourseCode)}`);
                if (!matRes.data || matRes.data.length === 0) {
                    matRes = await axios.get(`${API_URL}/materials/course/${encodeURIComponent(actualCourseCode)}`);
                }
            } catch (err) {
                matRes = await axios.get(`${API_URL}/materials/course/${encodeURIComponent(actualCourseCode)}`);
            }
            const theoryMaterials = (matRes.data || []).filter((m: any) =>
                m.type !== 'Lab Manual' && m.type !== 'Lab'
            );
            setMaterials(theoryMaterials);

            // 5. Fetch Syllabus Topics using the REAL course code
            const topicsRes = await axios.get(
                `${API_URL}/syllabus/${encodeURIComponent(actualCourseCode)}/${encodeURIComponent(studentData.section)}`
            );
            setSyllabusTopics(topicsRes.data || []);

        } catch (error) {
            console.error("Sync error:", error);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchCourseContent();
    }, [courseId]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-white">
            <RefreshCw className="animate-spin text-blue-900" size={40} />
        </div>
    );

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Navbar />

            {/* HEADER SECTION */}
            <div className="bg-blue-900 text-white py-10 shadow-lg border-b-4 border-orange-500">
                <div className="container mx-auto px-4">
                    <div className="flex justify-between items-center mb-3">
                        <button onClick={() => router.push('/student')} className="flex items-center gap-2 text-sm hover:text-orange-400 font-bold uppercase">
                            <ArrowLeft size={16} /> Back
                        </button>
                        <button onClick={fetchCourseContent} className="text-sm bg-white/20 px-3 py-1 rounded font-bold uppercase tracking-widest">
                            <RefreshCw size={14} className="inline mr-1" /> Sync
                        </button>
                    </div>
                    <div className="flex justify-between items-end">
                        <div>
                            <h1 className="text-4xl font-black uppercase">{courseId}</h1>
                            <p className="opacity-80 uppercase text-xs mt-1">Academic Resource Portal</p>
                        </div>
                        <span className="bg-orange-500 text-white px-3 py-1 rounded text-[10px] font-black uppercase">
                            Section {studentProfile?.section}
                        </span>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8 flex-grow">
                <div className="bg-white rounded-xl shadow-xl overflow-hidden min-h-[600px] border border-gray-100">

                    {/* TABS */}
                    <div className="flex overflow-x-auto border-b bg-gray-50/50 no-scrollbar">
                        {[
                            { id: 'notes', label: 'Unit Materials', icon: FileText },
                            { id: 'qb', label: 'Question Bank', icon: BookOpen },
                            { id: 'videos', label: 'Videos', icon: PlayCircle },
                            { id: 'assignments', label: 'Assignments', icon: ClipboardList },
                            { id: 'announcements', label: 'Notices', icon: Bell },
                            { id: 'attendance', label: 'Attendance', icon: CheckCircle },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center px-8 py-5 font-bold transition border-b-4 uppercase text-[10px] tracking-widest ${activeTab === tab.id
                                    ? 'bg-white text-blue-900 border-b-blue-900 border-t-4 border-t-orange-500'
                                    : 'text-gray-400 hover:text-blue-900'
                                    }`}
                            >
                                <tab.icon size={18} className="mr-2" />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="p-8">
                        {/* UNIT-WISE NOTES LOGIC */}
                        {activeTab === 'notes' && (
                            <div className="space-y-8 animate-in fade-in duration-500">
                                {[1, 2, 3, 4, 5].map((unitNum) => {
                                    // Logic: Find the topic name for this unit
                                    const unitTopic = syllabusTopics.find(t => t.unit_no === unitNum);
                                    // Logic: Find all notes belonging to this unit
                                    const unitNotes = materials.filter(m =>
                                        m.type === 'Lecture Notes' && m.title.includes(`Unit ${unitNum}`)
                                    );

                                    return (
                                        <div key={unitNum} className="border-2 border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                                            <div className="bg-blue-900 p-4 flex justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-orange-500 text-white w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm">
                                                        {unitNum}
                                                    </div>
                                                    <div>
                                                        <h3 className="text-white text-[10px] font-black uppercase tracking-widest opacity-70">Unit Module</h3>
                                                        <p className="text-white font-bold text-sm uppercase">
                                                            {unitTopic ? unitTopic.topic_name : `Module ${unitNum} Content`}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className="bg-white/10 text-white text-[9px] px-3 py-1 rounded-full font-black uppercase">
                                                    {unitNotes.length} Files
                                                </span>
                                            </div>

                                            <div className="p-4 bg-gray-50/30">
                                                {unitNotes.length > 0 ? (
                                                    <div className="space-y-3">
                                                        {unitNotes.map((note, i) => (
                                                            <div key={i} className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:border-blue-400 transition-all group shadow-sm">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                                        <FileText size={20} />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm font-bold text-gray-800 uppercase tracking-tight">{note.title}</p>
                                                                        <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">Reference: {note.posted_by}</p>
                                                                    </div>
                                                                </div>
                                                                <a href={note.file_link} target="_blank" className="p-2.5 bg-gray-100 text-gray-500 hover:bg-blue-900 hover:text-white rounded-xl transition-all shadow-sm">
                                                                    <Download size={18} />
                                                                </a>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="py-10 text-center">
                                                        <p className="text-gray-300 text-[10px] font-black uppercase tracking-[0.2em] italic">
                                                            No unit {unitNum} notes uploaded by faculty yet
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* QUESTION BANK */}
                        {activeTab === 'qb' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                                {materials.filter(m => m.type === 'Question Bank').map((q, i) => (
                                    <div key={i} className="p-5 border rounded-xl flex justify-between items-center bg-gray-50 group">
                                        <div className="flex items-center gap-3">
                                            <BookOpen className="text-teal-600" />
                                            <span className="font-bold text-gray-800 text-xs uppercase">{q.title}</span>
                                        </div>
                                        <a href={q.file_link} target="_blank" className="text-white bg-teal-600 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest">Access</a>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* VIDEOS */}
                        {activeTab === 'videos' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
                                {materials.filter(m => m.type === 'YouTube Video').map((video, i) => (
                                    <div key={i} className="bg-white border rounded-xl overflow-hidden group">
                                        <div className="aspect-video bg-blue-900 flex items-center justify-center relative">
                                            <PlayCircle size={48} className="text-white opacity-50 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                        <div className="p-4 text-center">
                                            <h3 className="font-bold text-gray-800 mb-3 text-xs uppercase truncate">{video.title}</h3>
                                            <a href={video.file_link} target="_blank" className="inline-block bg-pink-600 text-white px-6 py-2 rounded-lg text-[10px] font-black uppercase">Watch Now</a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* ASSIGNMENTS */}
                        {activeTab === 'assignments' && (
                            <div className="space-y-4">
                                {materials.filter(m => m.type === 'Assignment').map((assn, i) => (
                                    <div key={i} className="flex items-center justify-between p-5 border-l-8 border-orange-500 bg-white shadow-sm rounded-r-lg border border-gray-100">
                                        <div>
                                            <p className="font-black text-gray-800 uppercase tracking-tight">{assn.title}</p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase">Source: Faculty Dashboard</p>
                                        </div>
                                        <a href={assn.file_link} target="_blank" className="bg-orange-500 text-white px-5 py-2 rounded-lg text-[9px] font-black uppercase shadow-md">Download</a>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* ANNOUNCEMENTS */}
                        {activeTab === 'announcements' && (
                            <div className="space-y-4">
                                {announcements.map((ann, i) => (
                                    <div key={i} className="bg-yellow-50/30 border-l-8 border-yellow-500 p-6 rounded-r-xl border border-yellow-100 shadow-sm">
                                        <div className="flex justify-between items-start">
                                            <p className="font-black text-blue-900 text-lg uppercase">{ann.title}</p>
                                            <span className="text-[9px] bg-yellow-200 px-3 py-1 rounded-full font-black uppercase">Notice</span>
                                        </div>
                                        <p className="text-sm text-gray-700 mt-2 font-medium">{ann.content}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* ATTENDANCE */}
                        {activeTab === 'attendance' && (
                            <div className="text-center py-12">
                                <div className="relative inline-flex items-center justify-center">
                                    <svg className="w-48 h-48 transform -rotate-90">
                                        <circle cx="96" cy="96" r="80" stroke="#f3f4f6" strokeWidth="12" fill="transparent" />
                                        <circle
                                            cx="96" cy="96" r="80" stroke={(marks?.subject_attendance || 0) < 75 ? '#ef4444' : '#1e3a8a'}
                                            strokeWidth="12" fill="transparent"
                                            strokeDasharray={502}
                                            strokeDashoffset={502 - ((marks?.subject_attendance || 0) / 100) * 502}
                                            strokeLinecap="round"
                                            className="transition-all duration-1000"
                                        />
                                    </svg>
                                    <div className="absolute flex flex-col items-center">
                                        <span className="text-5xl font-black text-blue-900">{(marks?.subject_attendance || 0)}%</span>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Attendance</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
}