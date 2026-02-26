'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { API_URL } from '@/config';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { 
    Camera, Beaker, ChevronRight, Bell, 
    ExternalLink, Briefcase, Calendar,
    CreditCard, AlertTriangle 
} from 'lucide-react'; 

export default function StudentDashboard() {
    const [student, setStudent] = useState<any>(null);
    const [courses, setCourses] = useState<any[]>([]);
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [labs, setLabs] = useState<any[]>([]);
    const [ciaMarks, setCiaMarks] = useState<any[]>([]);
    const [semResultLinks, setSemResultLinks] = useState<any[]>([]);
    const [arrears, setArrears] = useState<any[]>([]);
    
    const [activeTab, setActiveTab] = useState('courses');
    const [profilePic, setProfilePic] = useState<string | null>(null);
    const [loading, setLoading] = useState(true); 
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('token');
        const role = localStorage.getItem('role');
        const userId = localStorage.getItem('user_id');

        if (!token || role !== 'Student') {
            router.push('/login');
            return;
        }

        const loadData = async () => {
            try {
                const studentRes = await axios.get(`${API_URL}/student/${userId}`);
                const studentData = studentRes.data;
                setStudent(studentData);
                
                if (studentData.profile_pic) {
                    setProfilePic(studentData.profile_pic);
                } else {
                    setProfilePic(`https://ui-avatars.com/api/?name=${studentData.name}&background=1e3a5f&color=fff&bold=true&size=200`);
                }

                const annRes = await axios.get(`${API_URL}/announcements?audience=Student&student_id=${userId}`);
                const filteredAnnouncements = annRes.data.filter((a: any) => {
                    if (a.type === 'Placement' && a.target_year) {
                        return Number(a.target_year) === Number(studentData.year);
                    }
                    return true; 
                });
                setAnnouncements(filteredAnnouncements);

                const [ciaRes, arrearRes] = await Promise.all([
                    axios.get(`${API_URL}/marks/cia?student_id=${userId}`),
                    axios.get(`${API_URL}/student/arrears/${userId}`)
                ]);

                const allSubjects = ciaRes.data;
                setCiaMarks(allSubjects);
                setArrears(arrearRes.data);
                
                setCourses(allSubjects.filter((m: any) => !m.subject.toLowerCase().includes('(lab)'))
                    .map((m: any) => ({ code: m.subject, title: "Course Content" })));
                setLabs(allSubjects.filter((m: any) => m.subject.toLowerCase().includes('(lab)'))
                    .map((l: any) => ({ code: l.subject, title: "Practical Session" })));

                const resultsRes = await axios.get(`${API_URL}/materials/Global`);
                setSemResultLinks(resultsRes.data.filter((m: any) => m.type === 'Result Link' || m.type === 'Result'));

            } catch (error) {
                console.error("Error fetching student dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [router]);

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const userId = localStorage.getItem('user_id');
            if (!userId) return;
            setProfilePic(URL.createObjectURL(file));
            const formData = new FormData();
            formData.append('file', file);
            formData.append('roll_no', userId);
            try {
                const res = await axios.post(`${API_URL}/student/upload-photo`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                if (res.data && res.data.profile_pic) {
                    setProfilePic(res.data.profile_pic);
                    alert("Profile photo updated successfully!");
                }
            } catch (err: any) {
                setProfilePic(`https://ui-avatars.com/api/?name=${student.name}&background=1e3a5f&color=fff&bold=true&size=200`);
            }
        }
    };

    const handleTabClick = (tab: string) => {
        if (tab === 'topper') { router.push('/student/topper'); } 
        else { setActiveTab(tab); }
    };

    const getCgpaStyle = (cgpa: number) => {
        if (cgpa >= 8.5) return "border-yellow-500 bg-yellow-50 text-yellow-700 shadow-[0_0_10px_rgba(234,179,8,0.3)]";
        if (cgpa >= 7.0) return "border-slate-400 bg-slate-50 text-slate-700";
        if (cgpa < 6.0) return "border-red-500 bg-red-50 text-red-700";
        return "border-blue-200 bg-blue-50 text-blue-700";
    };

    if (loading || !student) return (
        <div className="min-h-screen flex items-center justify-center font-bold text-blue-900">
            Syncing Student Portal...
        </div>
    );

    const cgpa = Number(student.cgpa) || 0;
    const cgpaColor = cgpa >= 8.5 ? '#92400e' : cgpa < 6 ? '#dc2626' : '#0d1f3c';

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Navbar />

            <div className="container mx-auto px-4 pt-0 pb-8 flex-grow">

                {/* Centered Title */}
                <div className="text-center mb-8 pt-8">
                    <h1 className="text-3xl font-bold text-blue-900 tracking-tight">Student Dashboard</h1>
                    <div className="flex gap-3 items-center justify-center mt-3">
                        <div className={`flex flex-col items-center px-4 py-1 border-2 rounded-xl transition-all duration-500 ${getCgpaStyle(cgpa)}`}>
                            <span className="text-[8px] font-black uppercase tracking-tighter leading-none mb-0.5">Academic CGPA</span>
                            <span className="text-lg font-black leading-none">{cgpa.toFixed(2)}</span>
                        </div>
                        <span className="bg-orange-100 text-orange-700 px-3 py-2 rounded-full font-bold text-xs border border-orange-200 uppercase h-fit">
                            Section {student.section || 'A'}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">

                    {/* ===== ID CARD COLUMN ===== */}
                    <div className="md:col-span-1 flex justify-center">
                        <div className="flex flex-col items-center" style={{ width: '360px' }}>

                            {/* ── Lanyard: rope starts flush from top (navbar bottom), connects directly to card ── */}
                            <div className="flex flex-col items-center" style={{ marginBottom: '-1px' }}>
                                {/* Striped fabric strap — tall enough to visually come from navbar */}
                                <div style={{
                                    width: '36px',
                                    /* 
                                      "Student Dashboard" title area is ~120px (title + badges + mb-8).
                                      We want the rope to span from above the title all the way to card.
                                      Use a negative top margin to pull it up into the navbar zone.
                                    */
                                    height: '160px',
                                    marginTop: '-160px',   /* pulls the strap UP into the navbar */
                                    background: 'repeating-linear-gradient(180deg,#0d1f3c 0px,#0d1f3c 4px,#1e40af 4px,#1e40af 8px)',
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
                                    boxShadow: '0 16px 56px rgba(13,31,60,0.18), 0 2px 10px rgba(0,0,0,0.07)',
                                    border: '1px solid #dde3ed',
                                    position: 'relative', zIndex: 4,
                                }}
                            >
                                {/* ── Card Header — college name CENTRED ── */}
                                <div style={{
                                    background: 'linear-gradient(135deg,#0d1f3c 0%,#163566 100%)',
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
                                        <p style={{ color: '#cbd5e1', fontSize: '9px', letterSpacing: '0.3em', marginTop: '8px', fontWeight: 700 }}>
                                            STUDENT IDENTITY CARD
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
                                        {/* Name — large and prominent */}
                                        <p style={{ color: '#0d1f3c', fontSize: '18px', fontWeight: 900, letterSpacing: '0.04em', lineHeight: 1.2 }}>
                                            {student.name?.toUpperCase()}
                                        </p>
                                        <div style={{
                                            display: 'inline-block', marginTop: '6px',
                                            background: '#0d1f3c', color: '#fff',
                                            fontSize: '8px', fontWeight: 700, letterSpacing: '0.2em',
                                            padding: '4px 12px', borderRadius: '3px'
                                        }}>
                                            SECTION {student.section || 'A'}
                                        </div>

                                        {/* Info rows */}
                                        <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            {[
                                                { label: 'Roll No',  value: student.roll_no,                mono: true  },
                                                { label: 'Year',     value: `${student.year || 'N/A'} Year`, mono: false },
                                                { label: 'Semester', value: String(student.semester),        mono: false },
                                            ].map(({ label, value, mono }) => (
                                                <div key={label} style={{
                                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                    background: '#eef2f8', borderRadius: '5px', padding: '7px 10px'
                                                }}>
                                                    <span style={{ fontSize: '9px', color: '#94a3b8', letterSpacing: '0.1em', fontWeight: 600, textTransform: 'uppercase' }}>{label}</span>
                                                    <span style={{ fontSize: '12px', color: '#0d1f3c', fontWeight: 800, fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* ── Divider ── */}
                                <div style={{ height: '1px', background: '#e8edf4', margin: '0 22px' }}/>

                                {/* ── Attendance LEFT + CGPA RIGHT — same row ── */}
                                <div style={{ background: '#ffffff', padding: '20px 22px 28px' }}>
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'stretch' }}>

                                        {/* Attendance block */}
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                                <span style={{ fontSize: '8px', color: '#94a3b8', letterSpacing: '0.12em', fontWeight: 600, textTransform: 'uppercase' }}>Attendance</span>
                                                <span style={{ fontSize: '12px', fontWeight: 800, color: student.attendance_percentage < 75 ? '#ef4444' : '#16a34a' }}>
                                                    {student.attendance_percentage}%
                                                </span>
                                            </div>
                                            <div style={{ height: '5px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                                                <div style={{
                                                    height: '100%', borderRadius: '999px',
                                                    width: `${student.attendance_percentage}%`,
                                                    background: student.attendance_percentage < 75
                                                        ? 'linear-gradient(90deg,#ef4444,#f87171)'
                                                        : 'linear-gradient(90deg,#0d1f3c,#1e40af)',
                                                    transition: 'width 1s ease'
                                                }}/>
                                            </div>
                                        </div>

                                        {/* Vertical separator */}
                                        <div style={{ width: '1px', background: '#e8edf4', flexShrink: 0 }}/>

                                        {/* CGPA block */}
                                        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: '72px' }}>
                                            <span style={{ fontSize: '8px', color: '#94a3b8', letterSpacing: '0.12em', fontWeight: 600, textTransform: 'uppercase' }}>CGPA</span>
                                            <span style={{ fontSize: '22px', fontWeight: 900, color: cgpaColor, lineHeight: 1.1, marginTop: '2px' }}>
                                                {cgpa.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* ── Footer ── */}
                                <div style={{
                                    background: 'linear-gradient(135deg,#0d1f3c,#163566)',
                                    padding: '12px 0',
                                }}/>
                            </div>
                        </div>
                    </div>

                    {/* ===== MAIN CONTENT ===== */}
                    <div className="md:col-span-2 space-y-8">
                        {/* Notice Board */}
                        <div className="bg-white p-6 rounded-2xl shadow-md border-t-4 border-blue-900 flex flex-col sm:flex-row justify-between items-center gap-4 relative overflow-hidden group">
                            <div className="bg-blue-50 p-3 rounded-xl">
                                <Bell className="text-blue-600" size={24} />
                            </div>
                            <div className="text-center sm:text-left z-10">
                                <h2 className="text-xl font-bold text-blue-900 uppercase tracking-tight">Official Notice Board</h2>
                                <p className="text-xs text-gray-400 font-medium">Timetables, Academic Planners & Exam Schedules</p>
                            </div>
                            <button 
                                onClick={() => router.push('/student/notices')}
                                className="bg-blue-900 text-white px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-orange-500 transition-all shadow-md flex items-center gap-2 z-10"
                            >
                                Open Board <ChevronRight size={18} />
                            </button>
                            <Bell size={100} className="absolute -right-8 -bottom-8 opacity-5 text-blue-900 pointer-events-none" />
                        </div>

                        {/* Announcements */}
                        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-900">
                            <h2 className="text-xl font-bold mb-4 text-blue-900 flex items-center gap-2">
                                <Bell className="text-orange-500" /> Recent Updates
                            </h2>
                            {announcements.filter(a => a.type !== 'Placement' && a.type !== 'Lab' && a.type !== 'Subject').length > 0 ? (
                                <ul className="space-y-3">
                                    {announcements.filter(a => a.type !== 'Placement' && a.type !== 'Lab' && a.type !== 'Subject').map((ann: any) => (
                                        <li key={ann.id} className="bg-blue-50/50 p-4 rounded border-l-2 border-blue-200">
                                            <div className="flex justify-between items-start">
                                                <h3 className="font-bold text-blue-900 text-sm">{ann.title}</h3>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[8px] px-2 py-0.5 rounded font-black uppercase tracking-tighter ${ann.type === 'Global' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                        {ann.type}
                                                    </span>
                                                    {ann.section !== 'All' && <span className="text-[8px] bg-blue-900 text-white px-2 py-0.5 rounded font-black uppercase tracking-tighter">Sec {ann.section}</span>}
                                                </div>
                                            </div>
                                            <p className="text-sm text-gray-600 mt-2 leading-relaxed">{ann.content}</p>
                                            <p className="text-[9px] text-gray-400 mt-2 font-bold italic">By: {ann.posted_by}</p>
                                        </li>
                                    ))}
                                </ul>
                            ) : <p className="text-gray-400 italic text-sm">No specific notices for your section yet.</p>}
                        </div>

                        {/* Tabs */}
                        <div className="bg-white p-6 rounded-lg shadow-md min-h-[500px]">
                            <div className="flex border-b mb-6 overflow-x-auto pb-1 no-scrollbar gap-2">
                                {['courses', 'labs', 'cia', 'arrears', 'results', 'placements', 'fees', 'topper'].map((tab) => (
                                    <button 
                                        key={tab} 
                                        onClick={() => handleTabClick(tab)} 
                                        className={`px-4 py-3 font-bold whitespace-nowrap transition border-b-4 uppercase text-[10px] tracking-widest ${activeTab === tab ? 'text-orange-600 border-orange-500 bg-orange-50/30' : 'text-gray-400 border-transparent hover:text-blue-900'}`}
                                    >
                                        {tab === 'cia' ? 'CIA Progress' : tab === 'results' ? 'Sem Results' : tab === 'topper' ? 'Toppers' : tab}
                                    </button>
                                ))}
                            </div>

                            {activeTab === 'courses' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-300">
                                    {courses.length > 0 ? courses.map((course: any) => (
                                        <div key={course.code} onClick={() => router.push(`/student/course/${course.code}`)} className="bg-white border border-gray-100 p-5 rounded-xl hover:shadow-lg transition border-t-4 border-t-blue-500 cursor-pointer group">
                                            <h4 className="font-bold text-gray-800 flex justify-between items-center text-md uppercase">{course.code} <ChevronRight size={16} className="text-blue-500" /></h4>
                                            <p className="text-xs text-gray-500 mt-1 font-medium italic">Course Content</p>
                                            <div className="mt-4 text-[9px] text-blue-600 bg-blue-50 inline-block px-3 py-1 rounded font-bold uppercase tracking-widest group-hover:bg-blue-600 group-hover:text-white">View Materials</div>
                                        </div>
                                    )) : <p className="text-center py-10 text-gray-400 italic text-sm col-span-2">No theory subjects found.</p>}
                                </div>
                            )}

                            {activeTab === 'labs' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-300">
                                    {labs.length > 0 ? labs.map((lab: any) => (
                                        <div key={lab.code} onClick={() => router.push(`/student/lab/${lab.code}`)} className="p-5 border rounded-xl bg-teal-50/30 border-teal-100 cursor-pointer flex justify-between items-center group border-t-4 border-t-teal-500 hover:shadow-lg transition">
                                            <div className="flex items-center gap-4">
                                                <div className="bg-teal-100 p-3 rounded-lg text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-colors"><Beaker size={20} /></div>
                                                <div><h4 className="font-bold text-teal-900 text-sm uppercase">{lab.code.replace(' (Lab)', '')}</h4><p className="text-[10px] text-teal-700 uppercase font-bold tracking-tight">Practical Session</p></div>
                                            </div>
                                            <ChevronRight className="text-teal-400" />
                                        </div>
                                    )) : <p className="text-center py-10 text-gray-400 italic text-sm col-span-2">No practical subjects found.</p>}
                                </div>
                            )}

                            {activeTab === 'cia' && (
                                <div className="overflow-x-auto border rounded-xl">
                                    <table className="w-full text-left">
                                        <thead className="bg-blue-900 text-white text-[9px] uppercase tracking-widest">
                                            <tr>
                                                <th className="p-4">Subject</th>
                                                <th className="p-4 text-center">CIA 1</th>
                                                <th className="p-4 text-center bg-blue-800">IA 1</th>
                                                <th className="p-4 text-center">CIA 2</th>
                                                <th className="p-4 text-center bg-blue-800">IA 2</th>
                                                <th className="p-4 text-center bg-orange-600">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm">
                                            {ciaMarks.map((m, i) => {
                                                const bestCIA1 = Math.max(Number(m.cia1 || 0), Number(m.cia1_retest || 0));
                                                const bestCIA2 = Math.max(Number(m.cia2 || 0), Number(m.cia2_retest || 0));
                                                const totalIA = Number(m.ia1_marks || 0) + Number(m.ia2_marks || 0);
                                                const grandTotal = bestCIA1 + bestCIA2 + totalIA;
                                                return (
                                                    <tr key={i} className="border-b hover:bg-gray-50">
                                                        <td className="p-4 font-bold text-blue-900 uppercase">{m.subject}
                                                            <p className="text-[8px] text-gray-400 font-normal uppercase mt-1">CIA: 60M | IA: 40M</p>
                                                        </td>
                                                        <td className="p-4 text-center font-medium">{bestCIA1}</td>
                                                        <td className="p-4 text-center font-black text-blue-600 bg-blue-50/50">{m.ia1_marks || 0}</td>
                                                        <td className="p-4 text-center font-medium">{bestCIA2}</td>
                                                        <td className="p-4 text-center font-black text-blue-600 bg-blue-50/50">{m.ia2_marks || 0}</td>
                                                        <td className="p-4 text-center font-bold bg-orange-50 text-orange-700">{grandTotal}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {activeTab === 'arrears' && (
                                <div className="animate-in fade-in duration-300">
                                    <div className="flex items-center gap-2 mb-6">
                                        <AlertTriangle className="text-red-500" size={20} />
                                        <h3 className="font-bold text-red-700 uppercase text-xs tracking-widest">Outstanding Arrear Details</h3>
                                    </div>
                                    {arrears.length > 0 ? (
                                        <div className="overflow-x-auto border rounded-xl border-red-100">
                                            <table className="w-full text-left">
                                                <thead className="bg-red-50 text-red-700 text-[9px] uppercase tracking-widest">
                                                    <tr>
                                                        <th className="p-4">Semester</th>
                                                        <th className="p-4">Subject Code</th>
                                                        <th className="p-4">Subject Name</th>
                                                        <th className="p-4 text-center">Batch</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="text-sm">
                                                    {arrears.map((a, i) => (
                                                        <tr key={i} className="border-b hover:bg-red-50/30 transition-colors">
                                                            <td className="p-4 font-bold text-gray-700">{a.semester}</td>
                                                            <td className="p-4 font-mono font-bold text-red-600">{a.subject_code}</td>
                                                            <td className="p-4 font-medium text-gray-800">{a.subject_name}</td>
                                                            <td className="p-4 text-center text-gray-500 font-bold">{a.batch}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="text-center py-20 bg-green-50 rounded-3xl border border-green-100">
                                            <Beaker className="mx-auto text-green-200 mb-4" size={48} />
                                            <p className="text-green-700 font-black uppercase text-[10px] tracking-widest">All Clear! No arrears found in the registry.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'results' && (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    {semResultLinks.length > 0 ? semResultLinks.map((link: any, index: number) => (
                                        <div key={index} className="p-6 border-2 border-dashed border-blue-200 rounded-xl bg-blue-50/30 flex flex-col sm:flex-row justify-between items-center gap-4 group">
                                            <div className="text-center sm:text-left">
                                                <h3 className="font-bold text-blue-900 uppercase tracking-tight text-lg">{link.title}</h3>
                                                <p className="text-[10px] text-gray-500 font-bold uppercase">Official Portal Link</p>
                                            </div>
                                            <a href={link.file_link} target="_blank" rel="noopener noreferrer" className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-blue-700 transition shadow-md flex items-center gap-2">
                                                Check Results <ExternalLink size={14}/>
                                            </a>
                                        </div>
                                    )) : <div className="text-center py-20 bg-gray-50 rounded-3xl"><p className="text-gray-400 font-black uppercase text-[10px] tracking-widest">Semester results pending declaration.</p></div>}
                                </div>
                            )}

                            {activeTab === 'placements' && (
                                <div className="space-y-6 animate-in fade-in duration-500">
                                    <h2 className="text-2xl font-black text-blue-900 uppercase mb-8 flex items-center gap-3 tracking-tighter">
                                        <Briefcase className="text-orange-500" /> Placement Drives
                                    </h2>
                                    {announcements.filter(a => a.type === 'Placement').length > 0 ? announcements.filter(a => a.type === 'Placement').map((ann: any) => (
                                        <div key={ann.id} className="p-8 border-l-[16px] border-orange-500 bg-white shadow-xl rounded-r-[32px] border border-gray-100">
                                            <div className="flex justify-between items-start mb-4">
                                                <h3 className="font-black text-blue-900 uppercase text-lg tracking-tight">{ann.title}</h3>
                                                <span className="text-[9px] bg-orange-100 text-orange-700 px-4 py-1.5 rounded-full font-black uppercase tracking-widest flex items-center gap-2">
                                                    <Calendar size={12}/> {new Date(ann.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-500 mb-8 leading-relaxed font-bold">{ann.content}</p>
                                            {ann.external_link && (
                                                <a href={ann.external_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 bg-blue-900 text-white px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-500 transition-all shadow-lg">
                                                    Register Now <ExternalLink size={16} />
                                                </a>
                                            )}
                                        </div>
                                    )) : (
                                        <div className="text-center py-24 border-4 border-dashed rounded-[40px] border-gray-100">
                                            <Briefcase className="mx-auto text-gray-100 mb-6" size={60} />
                                            <p className="text-gray-300 font-black uppercase text-[10px] tracking-[0.4em]">No placement drives currently.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'fees' && (
                                <div className="space-y-8 animate-in fade-in duration-500">
                                    <div className="bg-white border-2 border-blue-50 rounded-[40px] p-12 text-center shadow-sm relative overflow-hidden">
                                        <div className="bg-blue-100 text-blue-900 w-24 h-24 rounded-[32px] flex items-center justify-center mx-auto mb-8 transition-transform hover:rotate-6">
                                            <CreditCard size={40} />
                                        </div>
                                        <h2 className="text-3xl font-bold text-blue-900 uppercase tracking-tighter">Academic Fee Payment</h2>
                                        <p className="text-gray-400 mt-4 max-w-md mx-auto text-xs font-bold leading-relaxed uppercase tracking-widest">Access Clique portal for tuition and hostel fees.</p>
                                        <div className="mt-12">
                                            <button 
                                                onClick={() => window.open('https://apps.veltech.edu.in/clique/', '_blank')} 
                                                className="bg-blue-900 text-white px-12 py-5 rounded-[24px] font-black uppercase text-xs tracking-widest hover:bg-orange-500 transition-all shadow-2xl flex items-center gap-4 mx-auto group"
                                            >
                                                Proceed to Pay <ExternalLink size={20} className="group-hover:translate-x-1 transition-transform" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="bg-orange-900 p-6 rounded-2xl shadow-xl">
                                        <p className="text-[10px] text-white font-bold uppercase leading-relaxed text-center tracking-[0.1em]">
                                            * Note: Fees once paid reflect in 24-48 working hours.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
}