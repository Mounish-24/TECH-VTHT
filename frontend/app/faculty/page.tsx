'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { API_URL } from '@/config';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { 
    BookOpen, ChevronRight, Megaphone, Beaker, Bell, 
    Camera, FileText, UserCheck, Activity
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function FacultyDashboard() {
    const [faculty, setFaculty] = useState<any>(null);
    const [theoryCourses, setTheoryCourses] = useState<any[]>([]);
    const [labCourses, setLabCourses] = useState<any[]>([]);
    const [announcements, setAnnouncements] = useState<any[]>([]);
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
                setProfilePic(facultyData.profile_pic || `https://ui-avatars.com/api/?name=${facultyData.name}&background=random`);

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

                // 4. Fetch Targeted Announcements (New Audience-based logic)
                // Faculty audience fetches: Global + Faculty-targeted notices
                const annRes = await axios.get(`${API_URL}/announcements?audience=Faculty`);
                setAnnouncements(annRes.data);

                // 5. Fetch latest progress report
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
                if (faculty) setProfilePic(`https://ui-avatars.com/api/?name=${faculty.name}&background=random`);
            }
        }
    };

    const handlePostAnnouncement = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Updated to use standardized Targeted logic
            await axios.post(`${API_URL}/announcements`, {
                title: newAnnouncement.title,
                content: newAnnouncement.content,
                section: newAnnouncement.section,
                type: "Student", // Notices posted by faculty are intended for Students
                posted_by: faculty.name,
                course_code: "Global" // Standardized as Global since it's a general section notice
            });
            setMessage("Announcement broadcasted successfully!");
            setNewAnnouncement({ title: '', content: '', section: 'All' });
            setTimeout(() => setMessage(''), 3000);
        } catch { 
            setMessage("Failed to broadcast announcement."); 
        }
    };

    if (!faculty) return <div className="min-h-screen flex items-center justify-center font-bold text-blue-900">Staff Authentication...</div>;

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Navbar />
            <div className="container mx-auto px-4 py-8 flex-grow">
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-blue-900 tracking-tight">Faculty Dashboard</h1>
                        <p className="text-sm text-gray-500">{faculty.designation}</p>
                    </div>
                    {isAdvisor && (
                        <button 
                            onClick={() => router.push('/faculty/advisors')}
                            className="bg-orange-500 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-md hover:bg-orange-600 transition-all flex items-center gap-2"
                        >
                            <UserCheck size={18} /> Manage Section {advisorSection} Portal
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-6">
                        {/* Profile Section */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border-t-4 border-blue-900 text-center">
                            <div className="relative group w-24 h-24 mb-4 mx-auto">
                                <img src={profilePic || ""} alt="Profile" className="w-24 h-24 rounded-full object-cover border-4 border-gray-100 shadow-sm" />
                                <label className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition cursor-pointer text-white">
                                    <Camera size={20} /><input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                                </label>
                            </div>
                            <h2 className="text-xl font-bold text-blue-900">{faculty.name}</h2>
                            <p className="text-xs text-gray-400 font-mono mt-1">{faculty.staff_no}</p>
                            <div className="space-y-2 text-sm border-t pt-4 font-medium mt-4">
                                <p className="flex justify-between"><span className="text-gray-500 font-normal">Department:</span> <span>AI & DS</span></p>
                                <p className="flex justify-between"><span className="text-gray-500 font-normal">Joined:</span> <span>{faculty.doj}</span></p>
                            </div>
                        </div>

                        {/* Admin Notice Section (Audience Filtered) */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-50">
                            <h3 className="text-sm font-bold text-blue-900 mb-4 flex items-center gap-2"><Bell size={14} className="text-blue-600" /> Administrative Notices</h3>
                            <div className="space-y-3 max-h-64 overflow-y-auto pr-2 no-scrollbar">
                                {announcements.length > 0 ? announcements.map((ann: any) => (
                                    <div key={ann.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                        <div className="flex justify-between items-start mb-1">
                                            <p className="text-xs font-bold text-blue-900">{ann.title}</p>
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

                    <div className="md:col-span-2 space-y-8">
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

                        {/* Announcement Section */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border-t-4 border-orange-500">
                            <h2 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2"><Megaphone className="text-orange-500" /> Targeted Student Broadcast</h2>
                            {message && <p className="mb-4 p-2 bg-green-100 text-green-700 rounded-lg text-xs text-center font-bold">{message}</p>}
                            <form onSubmit={handlePostAnnouncement} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <input className="p-3 border rounded-xl outline-none text-sm focus:border-blue-500 shadow-sm" placeholder="Notice Heading" value={newAnnouncement.title} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })} required />
                                    <select value={newAnnouncement.section} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, section: e.target.value })} className="p-3 border rounded-xl bg-gray-50 text-sm focus:border-blue-500 shadow-sm font-medium">
                                        <option value="All">All Students</option>
                                        <option value="A">Section A Only</option>
                                        <option value="B">Section B Only</option>
                                        <option value="C">Section C Only</option>
                                    </select>
                                </div>
                                <textarea className="w-full p-3 border rounded-xl outline-none h-24 text-sm focus:border-blue-500 shadow-sm" placeholder="Enter detailed message for students..." value={newAnnouncement.content} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })} required />
                                <button type="submit" className="w-full bg-blue-900 text-white font-bold py-3 rounded-xl hover:bg-blue-800 transition-all text-sm shadow-md">Post to Student Dashboards</button>
                            </form>
                        </div>

                        {/* Quick Links Section */}
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