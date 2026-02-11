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
    RefreshCw
} from 'lucide-react';

// Utility function to extract YouTube video ID
function getYouTubeId(url: string): string | null {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = url.match(regex);
    return match ? match[1] : null;
}

export default function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const resolvedParams = use(params);
    const courseId = decodeURIComponent(resolvedParams.id);

    const [activeTab, setActiveTab] = useState('notes');
    const [materials, setMaterials] = useState<any[]>([]);
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [studentProfile, setStudentProfile] = useState<any>(null);
    const [marks, setMarks] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // New state for selected video in Videos tab
    const [selectedVideo, setSelectedVideo] = useState<any | null>(null);

    const fetchCourseContent = async () => {
        const userId = localStorage.getItem('user_id');
        if (!userId || !courseId) return;

        try {
            // 1. Fetch Student Profile
            const stuRes = await axios.get(`${API_URL}/student/${userId}`);
            setStudentProfile(stuRes.data);

            const cleanId = courseId.toString().trim().toUpperCase();
            console.log(`[CLIENT-FETCH] Synchronizing resources for: "${cleanId}"`);

            // 2. Fetch Materials with Triple-Path Fallback
            let matRes;
            try {
                matRes = await axios.get(`${API_URL}/materials/${encodeURIComponent(cleanId)}`);
                if (!matRes.data || matRes.data.length === 0) {
                    matRes = await axios.get(`${API_URL}/materials/course/${encodeURIComponent(cleanId)}`);
                }
            } catch (err) {
                console.warn("[DEBUG] Primary fetch failed, attempting sub-route fallback.");
                matRes = await axios.get(`${API_URL}/materials/course/${encodeURIComponent(cleanId)}`);
            }

            const rawData = matRes.data || [];
            const theoryMaterials = rawData.filter((m: any) =>
                m.type !== 'Lab Manual' && m.type !== 'Lab'
            );
            setMaterials(theoryMaterials);

            // 3. Fetch Specific Announcements
            const annRes = await axios.get(`${API_URL}/announcements?student_id=${userId}`);
            const rawAnnouncements = annRes.data || [];
            const specificNotices = rawAnnouncements.filter((a: any) =>
                a.course_code?.trim().toUpperCase() === cleanId ||
                a.course_code === "Global" ||
                a.title.toUpperCase().includes(cleanId)
            );
            setAnnouncements(specificNotices);

            // 4. Fetch specific marks/attendance
            const marksRes = await axios.get(`${API_URL}/marks/cia?student_id=${userId}`);
            const rawMarks = marksRes.data || [];
            const specificMark = rawMarks.find((m: any) =>
                m.course_code?.trim().toUpperCase() === cleanId ||
                m.subject?.trim().toUpperCase() === cleanId
            );
            setMarks(specificMark);
        } catch (error) {
            console.error("Critical connection or parsing error:", error);
        } finally {
            setLoading(false);
        }
    };

    const refreshMaterials = async () => {
        setLoading(true);
        await fetchCourseContent();
    };

    useEffect(() => {
        fetchCourseContent();
    }, [courseId]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-white">
            <div className="flex flex-col items-center gap-4">
                <RefreshCw className="animate-spin text-blue-900" size={40} />
                <p className="font-black text-blue-900 uppercase tracking-widest text-xs">Fetching Course Material...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Navbar />

            <div className="bg-blue-900 text-white py-10 shadow-lg border-b-4 border-orange-500">
                <div className="container mx-auto px-4">
                    <div className="flex justify-between items-center mb-3">
                        <button onClick={() => router.push('/student')} className="flex items-center gap-2 text-sm hover:text-orange-400 opacity-80 transition font-bold uppercase tracking-widest">
                            <ArrowLeft size={16} /> Back to Dashboard
                        </button>
                        <button
                            onClick={refreshMaterials}
                            className="flex items-center gap-2 text-sm bg-white/20 hover:bg-white/30 px-3 py-1 rounded transition font-bold uppercase tracking-widest"
                        >
                            <RefreshCw size={14} /> Force Sync
                        </button>
                    </div>
                    <div className="flex justify-between items-end">
                        <div>
                            <h1 className="text-4xl font-black tracking-tight uppercase">{courseId}</h1>
                            <p className="opacity-80 font-medium tracking-wide uppercase text-xs mt-1">Theory Subject Portal</p>
                        </div>
                        <div className="text-right">
                            <span className="bg-orange-500 text-white px-3 py-1 rounded text-[10px] font-black uppercase tracking-tighter">
                                Section {studentProfile?.section || 'N/A'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8 flex-grow">
                <div className="bg-white rounded-xl shadow-xl overflow-hidden min-h-[550px] border border-gray-100">

                    {/* TABS SECTION */}
                    <div className="flex overflow-x-auto border-b bg-gray-50/50 sticky top-0 z-10 no-scrollbar">
                        {[
                            { id: 'notes', label: 'Notes', icon: FileText },
                            { id: 'qb', label: 'Question Bank', icon: BookOpen },
                            { id: 'videos', label: 'Videos', icon: PlayCircle },
                            { id: 'assignments', label: 'Assignments', icon: ClipboardList },
                            { id: 'announcements', label: 'Announcements', icon: Bell },
                            { id: 'attendance', label: 'Attendance', icon: CheckCircle },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center px-8 py-5 font-bold transition whitespace-nowrap border-b-4 uppercase text-[10px] tracking-widest ${activeTab === tab.id
                                    ? 'bg-white text-blue-900 border-b-blue-900 border-t-4 border-t-orange-500 shadow-sm'
                                    : 'text-gray-400 hover:text-blue-900 hover:bg-white/80'
                                    }`}
                            >
                                <tab.icon size={18} className="mr-2" />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="p-8">
                        {/* LECTURE NOTES TAB */}
                        {activeTab === 'notes' && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                                {/* ... existing notes content remains unchanged ... */}
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 uppercase tracking-tighter text-sm">
                                        <FileText className="text-blue-900" size={20} /> Unit Wise Academic Notes
                                    </h2>
                                    <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-bold">
                                        {materials.filter(m => m.type === 'Lecture Notes').length} files detected
                                    </span>
                                </div>
                                {materials.filter(m => m.type === 'Lecture Notes').length > 0 ? (
                                    materials.filter(m => m.type === 'Lecture Notes').map((note, i) => (
                                        <div key={i} className="flex items-center justify-between p-5 border-b last:border-0 hover:bg-blue-50/50 transition group rounded-lg mb-3">
                                            <div className="flex items-center">
                                                <div className="p-3 bg-blue-100 text-blue-600 rounded-lg mr-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                    <FileText size={20} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-800 uppercase tracking-tight text-sm">{note.title}</p>
                                                    <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-tighter">Uploaded by Staff: {note.posted_by}</p>
                                                </div>
                                            </div>
                                            <a
                                                href={note.file_link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 text-blue-900 text-[10px] font-black border-2 border-blue-900 px-4 py-2 rounded-lg hover:bg-blue-900 hover:text-white transition uppercase tracking-widest shadow-sm"
                                            >
                                                <Download size={14} /> View File
                                            </a>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-24 bg-gray-50/50 rounded-2xl border-2 border-dashed">
                                        <FileText className="mx-auto text-gray-200 mb-4" size={60} />
                                        <p className="text-gray-400 italic font-bold uppercase text-[10px] tracking-[0.2em]">No lecture notes available yet.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* QUESTION BANK TAB */}
                        {activeTab === 'qb' && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                                {/* ... existing qb content remains unchanged ... */}
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 uppercase tracking-tighter text-sm">
                                        <BookOpen className="text-teal-600" size={20} /> Exam Specific Question Bank
                                    </h2>
                                    <span className="text-xs bg-teal-100 text-teal-800 px-3 py-1 rounded-full font-bold">
                                        {materials.filter(m => m.type === 'Question Bank').length} items found
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {materials.filter(m => m.type === 'Question Bank').length > 0 ? (
                                        materials.filter(m => m.type === 'Question Bank').map((q, i) => (
                                            <div key={i} className="p-5 border rounded-xl hover:shadow-lg flex justify-between items-center bg-gray-50 border-gray-100 transition-all group">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-teal-100 p-2 rounded-lg text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                                                        <BookOpen size={20} />
                                                    </div>
                                                    <span className="font-bold text-gray-800 text-xs uppercase tracking-tight">{q.title}</span>
                                                </div>
                                                <a
                                                    href={q.file_link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-white bg-teal-600 px-4 py-2 rounded-lg text-[9px] font-black hover:bg-teal-700 shadow-md transition uppercase tracking-widest"
                                                >
                                                    Access QB
                                                </a>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="col-span-full text-center py-24 bg-gray-50/50 rounded-2xl border-2 border-dashed">
                                            <BookOpen className="mx-auto text-gray-200 mb-4" size={60} />
                                            <p className="text-gray-400 italic font-bold uppercase text-[10px] tracking-[0.2em]">Question Bank is being prepared.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* UPDATED VIDEOS TAB */}
                        {activeTab === 'videos' && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 uppercase tracking-tighter text-sm">
                                        <PlayCircle className="text-pink-600" size={20} /> Recommended Video Tutorials
                                    </h2>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {materials.filter(m => m.type === 'YouTube Video').length > 0 ? (
                                        materials
                                            .filter(m => m.type === 'YouTube Video')
                                            .map((video, i) => {
                                                const videoId = getYouTubeId(video.file_link);
                                                const isPlaying = selectedVideo?.file_link === video.file_link;

                                                return (
                                                    <div
                                                        key={i}
                                                        className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow hover:shadow-xl transition-all group"
                                                    >
                                                        <div className="relative aspect-video bg-black">
                                                            {isPlaying && videoId ? (
                                                                <iframe
                                                                    src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
                                                                    title={video.title}
                                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                                    allowFullScreen
                                                                    className="absolute inset-0 w-full h-full"
                                                                />
                                                            ) : (
                                                                <>
                                                                    {videoId ? (
                                                                        <img
                                                                            src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                                                                            alt={video.title}
                                                                            className="w-full h-full object-cover"
                                                                            loading="lazy"
                                                                        />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                                                                            <PlayCircle size={64} className="text-pink-500 opacity-70" />
                                                                        </div>
                                                                    )}

                                                                    {/* Play overlay */}
                                                                    <button
                                                                        onClick={() => setSelectedVideo(isPlaying ? null : video)}
                                                                        className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/40 transition-all group-hover:bg-black/30"
                                                                        aria-label={isPlaying ? "Pause video" : "Play video"}
                                                                    >
                                                                        <div className="bg-white/90 rounded-full p-4 transform group-hover:scale-110 transition-transform">
                                                                            {isPlaying ? (
                                                                                <svg className="w-10 h-10 text-pink-600" fill="currentColor" viewBox="0 0 24 24">
                                                                                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                                                                                </svg>
                                                                            ) : (
                                                                                <PlayCircle size={40} className="text-pink-600 drop-shadow-lg" />
                                                                            )}
                                                                        </div>
                                                                    </button>

                                                                    {/* YouTube badge */}
                                                                    <div className="absolute bottom-3 right-3 bg-black/75 text-white text-xs px-2 py-1 rounded font-bold uppercase tracking-wider">
                                                                        YouTube
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>

                                                        <div className="p-4">
                                                            <h3 className="font-bold text-gray-900 mb-1.5 line-clamp-2 text-base">
                                                                {video.title}
                                                            </h3>
                                                            <div className="flex justify-between items-center text-sm">
                                                                <span className="text-gray-600">
                                                                    {video.posted_by || 'Staff'} • Reference
                                                                </span>
                                                                {videoId && (
                                                                    <a
                                                                        href={video.file_link}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-pink-600 hover:text-pink-800 flex items-center gap-1 text-xs hover:underline"
                                                                        onClick={e => e.stopPropagation()}
                                                                    >
                                                                        Open in YT <ExternalLink size={14} />
                                                                    </a>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                    ) : (
                                        <div className="col-span-full text-center py-32 bg-gray-50/70 rounded-2xl border-2 border-dashed">
                                            <PlayCircle className="mx-auto text-gray-300 mb-5" size={80} />
                                            <p className="text-gray-500 font-medium text-lg">
                                                No reference videos shared yet.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        {/* ASSIGNMENTS TAB */}
                        {activeTab === 'assignments' && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                                {/* ... existing assignments content remains unchanged ... */}
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 uppercase tracking-tighter text-sm">
                                        <ClipboardList className="text-orange-500" size={20} /> Subject Assignments
                                    </h2>
                                </div>
                                {materials.filter(m => m.type === 'Assignment').length > 0 ? (
                                    materials.filter(m => m.type === 'Assignment').map((assn, i) => (
                                        <div key={i} className="flex items-center justify-between p-5 border-l-8 border-orange-500 bg-white shadow-sm rounded-r-lg mb-4 hover:shadow-md transition border border-gray-100">
                                            <div>
                                                <p className="font-black text-gray-800 text-md uppercase tracking-tight">{assn.title}</p>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Shared by: {assn.posted_by}</p>
                                            </div>
                                            <a
                                                href={assn.file_link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="bg-orange-500 text-white px-5 py-2 rounded-lg text-[9px] font-black hover:bg-orange-600 uppercase tracking-widest transition shadow-md"
                                            >
                                                Download Brief
                                            </a>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-24 bg-gray-50/50 rounded-2xl border-2 border-dashed">
                                        <ClipboardList className="mx-auto text-gray-200 mb-4" size={60} />
                                        <p className="text-gray-400 italic font-bold uppercase text-[10px] tracking-[0.2em]">No assignment schedules found.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ANNOUNCEMENT TAB */}
                        {activeTab === 'announcements' && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                                {/* ... existing announcements content remains unchanged ... */}
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 uppercase tracking-tighter text-sm">
                                        <Bell className="text-yellow-500" size={20} /> Latest Subject Notices
                                    </h2>
                                </div>
                                {announcements.length > 0 ? (
                                    announcements.map((ann, i) => (
                                        <div key={i} className="bg-yellow-50/30 border-l-8 border-yellow-500 p-6 rounded-r-xl mb-4 shadow-sm border border-yellow-100">
                                            <div className="flex justify-between items-start">
                                                <p className="font-black text-blue-900 text-lg uppercase tracking-tight">{ann.title}</p>
                                                <span className="text-[9px] bg-yellow-200 text-yellow-800 px-3 py-1 rounded-full font-black uppercase tracking-widest">
                                                    {ann.course_code === "Global" ? "General Info" : "Subject Notice"}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-700 mt-2 font-medium leading-relaxed">{ann.content}</p>
                                            <p className="text-[9px] text-gray-400 mt-4 uppercase font-bold tracking-widest">Broadcast Date: {new Date(ann.created_at).toLocaleDateString()}</p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-24 bg-gray-50/50 rounded-2xl border-2 border-dashed">
                                        <Bell className="mx-auto text-gray-200 mb-4" size={60} />
                                        <p className="text-gray-400 italic font-bold uppercase text-[10px] tracking-[0.2em]">No specific subject notices broadcasted.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ATTENDANCE TAB */}
                        {activeTab === 'attendance' && (
                            <div className="text-center py-12 animate-in zoom-in duration-300">
                                {/* ... existing attendance content remains unchanged ... */}
                                <h2 className="text-xl font-black mb-10 text-gray-800 uppercase tracking-widest">
                                    Current Attendance: {courseId}
                                </h2>
                                <div className="relative inline-flex items-center justify-center mb-8">
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
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Present</span>
                                    </div>
                                </div>
                                <p className="text-gray-500 font-medium italic text-xs uppercase tracking-tighter">*Data synchronized from official faculty registry.</p>

                                {(marks?.subject_attendance || 0) < 75 && (
                                    <div className="mt-8 p-4 bg-red-50 border-2 border-red-100 rounded-xl text-red-600 text-[10px] font-black uppercase tracking-[0.2em] shadow-sm inline-block animate-pulse">
                                        ⚠️ Attendance Critical: Below 75% Requirement ⚠️
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
}