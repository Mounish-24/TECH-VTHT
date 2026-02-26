'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { API_URL } from '@/config';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { 
    BookOpen, ChevronRight, Megaphone, Beaker, Bell, 
    Camera, FileText, UserCheck, Activity, Trash2, Clock
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function FacultyDashboard() {
    const [faculty, setFaculty] = useState<any>(null);
    const [theoryCourses, setTheoryCourses] = useState<any[]>([]);
    const [labCourses, setLabCourses] = useState<any[]>([]);
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [myAnnouncements, setMyAnnouncements] = useState<any[]>([]);
    const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '', section: 'All' });
    const [message, setMessage] = useState('');
    const [latestReport, setLatestReport] = useState<any>(null);
    const [profilePic, setProfilePic] = useState<string | null>(null);
    const [isAdvisor, setIsAdvisor] = useState(false);
    const [advisorSection, setAdvisorSection] = useState('');
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('token');
        const role = localStorage.getItem('role');
        const userId = localStorage.getItem('user_id');

        if (!token || (role !== 'Faculty' && role !== 'HOD')) {
            router.push('/login');
            return;
        }

        const fetchData = async () => {
            try {
                // 1. Fetch faculty profile
                const res = await axios.get(`${API_URL}/faculty/${userId}`);
                const facultyData = res.data;
                setFaculty(facultyData);
                setProfilePic(facultyData.profile_pic || `https://ui-avatars.com/api/?name=${facultyData.name}&background=6b7280&color=fff&bold=true&size=200`);

                // 2. Check Advisor Status
                try {
                    const advisorRes = await axios.get(`${API_URL}/advisors/my-class/${userId}`);
                    if (advisorRes.data) {
                        setIsAdvisor(true);
                        setAdvisorSection(advisorRes.data.class_info.section);
                    }
                } catch (err) { 
                    setIsAdvisor(false); 
                }

                // 3. Fetch Assigned Courses
                const coursesRes = await axios.get(`${API_URL}/courses?faculty_id=${userId}`);
                const assignedCourses = coursesRes.data;
                setTheoryCourses(assignedCourses.filter((c: any) => !c.title.includes('(Lab)')));
                setLabCourses(assignedCourses.filter((c: any) => c.title.includes('(Lab)')));

                // 4. Fetch Targeted Announcements (Admin -> Faculty notices)
                const annRes = await axios.get(`${API_URL}/announcements?audience=Faculty`);
                setAnnouncements(annRes.data);

                // 5. Fetch Faculty's OWN Announcements (Faculty -> Student notices)
                fetchMyAnnouncements(facultyData.name); 

                // 6. Fetch latest progress report
                const { data: progressData } = await supabase
                    .from('faculty_progress_reports')
                    .select('pdf_url')
                    .eq('faculty_id', facultyData.staff_no)
                    .order('created_at', { ascending: false }).limit(1);
                if (progressData?.length) setLatestReport(progressData[0]);

            } catch (error) {
                console.error("Error loading dashboard data:", error);
            }
        };
        fetchData();
    }, [router]);

    const fetchMyAnnouncements = async (facultyName: string) => {
        try {
            const res = await axios.get(`${API_URL}/announcements/faculty-posts?posted_by=${encodeURIComponent(facultyName)}`);
            setMyAnnouncements(res.data);
        } catch (err) {
            console.log("My announcements endpoint not ready yet.");
            setMyAnnouncements([]);
        }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const userId = localStorage.getItem('user_id');
            setProfilePic(URL.createObjectURL(file));
            const formData = new FormData();
            formData.append('file', file);
            try {
                const res = await axios.post(`${API_URL}/faculty/${userId}/photo`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                if (res.data && res.data.profile_pic) {
                    setProfilePic(res.data.profile_pic);
                    alert("Profile photo updated!");
                }
            } catch (err) {
                if (faculty) setProfilePic(`https://ui-avatars.com/api/?name=${faculty.name}&background=6b7280&color=fff&bold=true&size=200`);
            }
        }
    };

    const handlePostAnnouncement = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post(`${API_URL}/announcements`, {
                title: newAnnouncement.title,
                content: newAnnouncement.content,
                section: newAnnouncement.section,
                type: "Student",
                posted_by: faculty.name,
                course_code: "Global"
            });
            setMessage("Announcement broadcasted successfully!");
            setNewAnnouncement({ title: '', content: '', section: 'All' });
            fetchMyAnnouncements(faculty.name); 
            setTimeout(() => setMessage(''), 3000);
        } catch { 
            setMessage("Failed to broadcast announcement."); 
        }
    };

    const handleDeleteAnnouncement = async (id: number) => {
        if (!confirm("Are you sure you want to delete this announcement?")) return;
        try {
            await axios.delete(`${API_URL}/announcements/${id}`);
            fetchMyAnnouncements(faculty.name);
        } catch (error) {
            alert("Failed to delete announcement.");
        }
    };

    if (!faculty) return <div className="min-h-screen flex items-center justify-center font-bold text-blue-900">Staff Authentication...</div>;

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Navbar />
            <div className="container mx-auto px-4 pt-0 pb-8 flex-grow">

                {/* Centered Title */}
                <div className="text-center mb-8 pt-8">
                    <h1 className="text-3xl font-bold text-blue-900 tracking-tight">Faculty Dashboard</h1>
                    <div className="flex gap-3 items-center justify-center mt-3">
                        <span className="bg-gray-100 text-gray-700 px-3 py-2 rounded-full font-bold text-xs border border-gray-300 uppercase h-fit">
                            {faculty.designation || 'Faculty'}
                        </span>
                        {isAdvisor && (
                            <span className="bg-orange-100 text-orange-700 px-3 py-2 rounded-full font-bold text-xs border border-orange-200 uppercase h-fit">
                                Advisor · Section {advisorSection}
                            </span>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">

                    {/* ===== ID CARD COLUMN ===== */}
                    <div className="md:col-span-1 flex flex-col items-center gap-6">
                        <div className="flex flex-col items-center" style={{ width: '360px' }}>

                            {/* ── Lanyard ── */}
                            <div className="flex flex-col items-center" style={{ marginBottom: '-1px' }}>
                                {/* Striped grey fabric strap */}
                                <div style={{
                                    width: '36px',
                                    height: '160px',
                                    marginTop: '-160px',
                                    background: 'repeating-linear-gradient(180deg,#374151 0px,#374151 4px,#6b7280 4px,#6b7280 8px)',
                                    borderRadius: '0 0 2px 2px',
                                    boxShadow: 'inset 2px 0 0 rgba(255,255,255,0.1), inset -2px 0 0 rgba(0,0,0,0.15)',
                                    zIndex: 5,
                                    position: 'relative',
                                }}/>
                                {/* Metal clasp — wide top */}
                                <div style={{
                                    width: '54px', height: '12px',
                                    background: 'linear-gradient(180deg,#f3f4f6 0%,#b0b7c3 50%,#d1d5db 100%)',
                                    borderRadius: '4px 4px 0 0',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.6)',
                                    position: 'relative', zIndex: 5,
                                }}/>
                                {/* Clasp narrow pin */}
                                <div style={{
                                    width: '20px', height: '11px',
                                    background: 'linear-gradient(180deg,#9ca3af,#4b5563)',
                                    borderRadius: '0 0 4px 4px',
                                    boxShadow: '0 3px 5px rgba(0,0,0,0.3)',
                                    position: 'relative', zIndex: 5,
                                }}/>
                            </div>

                            {/* ── THE CARD ── */}
                            <div
                                style={{
                                    width: '100%',
                                    background: '#ffffff',
                                    borderRadius: '18px',
                                    overflow: 'hidden',
                                    boxShadow: '0 16px 56px rgba(55,65,81,0.18), 0 2px 10px rgba(0,0,0,0.07)',
                                    border: '1px solid #dde3ed',
                                    position: 'relative', zIndex: 4,
                                }}
                            >
                                {/* ── Card Header — grey gradient ── */}
                                <div style={{
                                    background: 'linear-gradient(135deg,#374151 0%,#4b5563 100%)',
                                    padding: '22px 22px 18px',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    textAlign: 'center',
                                }}>
                                    {/* Subtle diagonal texture */}
                                    <div style={{
                                        position: 'absolute', inset: 0, opacity: 0.04,
                                        background: 'repeating-linear-gradient(-50deg,transparent,transparent 6px,#fff 6px,#fff 7px)'
                                    }}/>
                                    <div style={{ position: 'relative', zIndex: 1 }}>
                                        <p style={{ color: '#fff', fontSize: '17px', fontWeight: 900, letterSpacing: '0.07em', lineHeight: 1.2 }}>
                                            VEL TECH HIGH TECH
                                        </p>
                                        <p style={{ color: '#f97316', fontSize: '9px', fontWeight: 500, marginTop: '4px', letterSpacing: '0.02em' }}>
                                            Dr. Rangarajan Dr. Sakunthala Engineering College
                                        </p>
                                        <div style={{ height: '1.5px', background: 'linear-gradient(90deg,transparent,rgba(249,115,22,0.9),transparent)', marginTop: '14px' }}/>
                                        <p style={{ color: '#d1d5db', fontSize: '9px', letterSpacing: '0.3em', marginTop: '8px', fontWeight: 700 }}>
                                            FACULTY IDENTITY CARD
                                        </p>
                                    </div>
                                </div>

                                {/* ── Body — photo left, details right ── */}
                                <div style={{ background: '#f8fafc', padding: '32px 22px 30px', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>

                                    {/* Photo */}
                                    <div style={{ flexShrink: 0, position: 'relative' }} className="group">
                                        <div style={{
                                            width: '100px', height: '152px',
                                            borderRadius: '8px',
                                            overflow: 'hidden',
                                            border: '2.5px solid #cbd5e1',
                                            boxShadow: '0 3px 10px rgba(0,0,0,0.12)'
                                        }}>
                                            <img src={profilePic || ''} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                                        </div>
                                        <label style={{
                                            position: 'absolute', inset: 0,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            background: 'rgba(0,0,0,0.5)', borderRadius: '6px',
                                            opacity: 0, cursor: 'pointer', color: 'white',
                                            transition: 'opacity 0.2s'
                                        }} className="group-hover:opacity-100">
                                            <Camera size={18}/>
                                            <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload}/>
                                        </label>
                                    </div>

                                    {/* Right details */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        {/* Name */}
                                        <p style={{ color: '#1f2937', fontSize: '18px', fontWeight: 900, letterSpacing: '0.04em', lineHeight: 1.2 }}>
                                            {faculty.name?.toUpperCase()}
                                        </p>
                                        <div style={{
                                            display: 'inline-block', marginTop: '6px',
                                            background: '#374151', color: '#fff',
                                            fontSize: '8px', fontWeight: 700, letterSpacing: '0.2em',
                                            padding: '4px 12px', borderRadius: '3px'
                                        }}>
                                            {(faculty.designation || 'FACULTY').toUpperCase()}
                                        </div>

                                        {/* Info rows */}
                                        <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            {[
                                                { label: 'Staff No',  value: faculty.staff_no,             mono: true  },
                                                { label: 'Dept',      value: 'AI & DS',                    mono: false },
                                                { label: 'Joined',    value: String(faculty.doj || 'N/A'), mono: false },
                                            ].map(({ label, value, mono }) => (
                                                <div key={label} style={{
                                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                    background: '#eef2f8', borderRadius: '5px', padding: '7px 10px'
                                                }}>
                                                    <span style={{ fontSize: '9px', color: '#94a3b8', letterSpacing: '0.1em', fontWeight: 600, textTransform: 'uppercase' }}>{label}</span>
                                                    <span style={{ fontSize: '12px', color: '#1f2937', fontWeight: 800, fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* ── Divider ── */}
                                <div style={{ height: '1px', background: '#e8edf4', margin: '0 22px' }}/>

                                {/* ── Advisor badge + Subjects count ── */}
                                <div style={{ background: '#ffffff', padding: '20px 22px 28px' }}>
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'stretch' }}>

                                        {/* Theory count block */}
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                                <span style={{ fontSize: '8px', color: '#94a3b8', letterSpacing: '0.12em', fontWeight: 600, textTransform: 'uppercase' }}>Theory</span>
                                                <span style={{ fontSize: '12px', fontWeight: 800, color: '#374151' }}>
                                                    {theoryCourses.length} Subject{theoryCourses.length !== 1 ? 's' : ''}
                                                </span>
                                            </div>
                                            <div style={{ height: '5px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                                                <div style={{
                                                    height: '100%', borderRadius: '999px',
                                                    width: `${Math.min(theoryCourses.length * 20, 100)}%`,
                                                    background: 'linear-gradient(90deg,#374151,#6b7280)',
                                                    transition: 'width 1s ease'
                                                }}/>
                                            </div>
                                        </div>

                                        {/* Vertical separator */}
                                        <div style={{ width: '1px', background: '#e8edf4', flexShrink: 0 }}/>

                                        {/* Advisor / Lab block */}
                                        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: '72px' }}>
                                            <span style={{ fontSize: '8px', color: '#94a3b8', letterSpacing: '0.12em', fontWeight: 600, textTransform: 'uppercase' }}>
                                                {isAdvisor ? 'Advisor' : 'Labs'}
                                            </span>
                                            <span style={{ fontSize: '14px', fontWeight: 900, color: isAdvisor ? '#f97316' : '#374151', lineHeight: 1.1, marginTop: '2px', textAlign: 'center' }}>
                                                {isAdvisor ? `Sec ${advisorSection}` : `${labCourses.length}`}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* ── Footer — grey gradient ── */}
                                <div style={{
                                    background: 'linear-gradient(135deg,#374151,#4b5563)',
                                    padding: '12px 0',
                                }}/>
                            </div>
                        </div>

                        {/* Administrative Notices — below ID card */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 border-t-4 border-t-gray-400 w-full" style={{ width: '360px' }}>
                            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                                <Bell size={14} className="text-gray-500" /> Administrative Notices
                            </h3>
                            <div className="space-y-3 max-h-64 overflow-y-auto pr-1 no-scrollbar">
                                {announcements.length > 0 ? announcements.map((ann: any) => (
                                    <div key={ann.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                        <div className="flex justify-between items-start mb-1">
                                            <p className="text-xs font-bold text-gray-800">{ann.title}</p>
                                            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${ann.type === 'Global' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>
                                                {ann.type}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-gray-500 mt-1 line-clamp-3">{ann.content}</p>
                                    </div>
                                )) : <p className="text-[10px] text-gray-400 italic">No new notices for faculty.</p>}
                            </div>
                        </div>
                    </div>

                    {/* ===== MAIN CONTENT ===== */}
                    <div className="md:col-span-2 space-y-8">

                        {/* Advisor Quick Access Banner */}
                        {isAdvisor && (
                            <div className="bg-white p-6 rounded-2xl shadow-md border-t-4 border-orange-500 flex flex-col sm:flex-row justify-between items-center gap-4 relative overflow-hidden">
                                <div className="bg-orange-50 p-3 rounded-xl">
                                    <UserCheck className="text-orange-500" size={24} />
                                </div>
                                <div className="text-center sm:text-left z-10">
                                    <h2 className="text-xl font-bold text-blue-900 uppercase tracking-tight">Class Advisor Portal</h2>
                                    <p className="text-xs text-gray-400 font-medium">Manage Section {advisorSection} — Attendance, Reports & More</p>
                                </div>
                                <button 
                                    onClick={() => router.push('/faculty/advisors')}
                                    className="bg-orange-500 text-white px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-orange-600 transition-all shadow-md flex items-center gap-2 z-10"
                                >
                                    Open Portal <ChevronRight size={18} />
                                </button>
                                <UserCheck size={100} className="absolute -right-8 -bottom-8 opacity-5 text-orange-400 pointer-events-none" />
                            </div>
                        )}

                        {/* Theory Courses Section */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-blue-600">
                            <h2 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2"><BookOpen className="text-blue-600" /> My Theory Subjects</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {theoryCourses.length > 0 ? theoryCourses.map((c) => (
                                    <div key={c.id} className="border rounded-xl p-4 bg-gray-50 hover:bg-white hover:border-blue-500 transition-all group">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-blue-900">{c.code}</h3>
                                            <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded">Sec {c.section}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 mb-4 line-clamp-1 italic">{c.title}</p>
                                        <button onClick={() => router.push(`/faculty/manage/${c.code}/${c.section}`)} className="w-full py-2 bg-blue-900 text-white rounded-lg text-xs font-bold hover:bg-blue-800 transition-colors">Manage Marks</button>
                                    </div>
                                )) : <p className="text-gray-400 italic py-4 text-sm">No theory subjects assigned.</p>}
                            </div>
                        </div>

                        {/* Lab Courses Section */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-teal-500">
                            <h2 className="text-xl font-bold text-teal-900 mb-4 flex items-center gap-2"><Beaker className="text-teal-600" /> My Lab Subjects</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {labCourses.length > 0 ? labCourses.map((l) => (
                                    <div key={l.id} className="border rounded-xl p-4 bg-teal-50/20 hover:bg-white hover:border-teal-500 transition-all group">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-teal-900">{l.code}</h3>
                                            <span className="bg-teal-100 text-teal-700 text-[10px] font-bold px-2 py-0.5 rounded">Sec {l.section}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 mb-4 line-clamp-1 italic">{l.title.replace(' (Lab)', '')}</p>
                                        <button onClick={() => router.push(`/faculty/labmanage/${l.code}/${l.section}`)} className="w-full py-2 bg-teal-600 text-white rounded-lg text-xs font-bold hover:bg-teal-700 transition-colors">Manage Lab</button>
                                    </div>
                                )) : <p className="text-gray-400 italic py-4 text-sm">No lab subjects assigned.</p>}
                            </div>
                        </div>

                        {/* Announcement Grid (Post & View) */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            
                            {/* POST Announcement Section */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border-t-4 border-orange-500">
                                <h2 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2"><Megaphone className="text-orange-500" /> Broadcast Notice</h2>
                                {message && <p className="mb-4 p-2 bg-green-100 text-green-700 rounded-lg text-xs text-center font-bold">{message}</p>}
                                <form onSubmit={handlePostAnnouncement} className="space-y-4">
                                    <input className="w-full p-3 border rounded-xl outline-none text-sm focus:border-blue-500 shadow-sm" placeholder="Notice Heading" value={newAnnouncement.title} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })} required />
                                    <select value={newAnnouncement.section} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, section: e.target.value })} className="w-full p-3 border rounded-xl bg-gray-50 text-sm focus:border-blue-500 shadow-sm font-medium">
                                        <option value="All">All Students</option>
                                        <option value="A">Section A Only</option>
                                        <option value="B">Section B Only</option>
                                        <option value="C">Section C Only</option>
                                    </select>
                                    <textarea className="w-full p-3 border rounded-xl outline-none h-24 text-sm focus:border-blue-500 shadow-sm" placeholder="Enter detailed message for students..." value={newAnnouncement.content} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })} required />
                                    <button type="submit" className="w-full bg-blue-900 text-white font-bold py-3 rounded-xl hover:bg-blue-800 transition-all text-sm shadow-md">Post to Dashboard</button>
                                </form>
                            </div>

                            {/* VIEW My Broadcasts Section */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border-t-4 border-blue-500">
                                <h2 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2"><Clock className="text-blue-500" /> My Recent Broadcasts</h2>
                                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 no-scrollbar">
                                    {myAnnouncements.length > 0 ? myAnnouncements.map((ann) => (
                                        <div key={ann.id} className="p-4 border rounded-xl bg-gray-50 flex justify-between items-start group hover:bg-white transition-all shadow-sm relative overflow-hidden">
                                            <div className="flex-grow">
                                                <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full mb-2 inline-block bg-blue-100 text-blue-700">
                                                    Target: Section {ann.section}
                                                </span>
                                                <p className="font-bold text-blue-900 text-sm">{ann.title}</p>
                                                <p className="text-xs text-gray-500 line-clamp-2 mt-1">{ann.content}</p>
                                            </div>
                                            <button 
                                                onClick={() => handleDeleteAnnouncement(ann.id)} 
                                                className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                title="Delete Announcement"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    )) : (
                                        <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                                            <Megaphone className="mx-auto text-gray-300 mb-2" size={32} />
                                            <p className="text-gray-400 italic text-xs">No active broadcasts.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                        </div>

                        {/* Quick Links Section */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-12">
                            {/* Professional Smart Tracker Link */}
                            <div 
                                onClick={() => router.push("/faculty/Progress")} 
                                className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-blue-600 cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all flex justify-between items-center group overflow-hidden relative"
                            >
                                <div className="relative z-10">
                                    <h2 className="text-lg font-black text-blue-900 uppercase tracking-tighter">Course Smart Tracker</h2>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Real-time syllabus & upload monitoring</p>
                                </div>
                                <div className="bg-blue-50 p-3 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors relative z-10">
                                    <Activity size={24} />
                                </div>
                                <Activity size={80} className="absolute -right-4 -bottom-4 text-slate-50 opacity-50 group-hover:text-blue-50 transition-colors" />
                            </div>

                            {/* Report History Card */}
                            <div 
                                onClick={() => router.push("/faculty/reports")} 
                                className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-orange-500 cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all flex justify-between items-center group"
                            >
                                <div>
                                    <h2 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Generated Reports</h2>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Access past completion PDFs</p>
                                </div>
                                <div className="bg-orange-50 p-3 rounded-xl group-hover:bg-orange-500 group-hover:text-white transition-colors">
                                    <FileText size={24} />
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