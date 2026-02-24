'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { API_URL } from '@/config';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { 
    Users, GraduationCap, UserCog, ArrowLeft, 
    Search, Trash2, BookOpen, PlusCircle, Bell, Trophy, 
    Link as LinkIcon, Edit2, X, ChevronDown, Building2, Briefcase, UserCheck,
    FileText, Filter, Send, AlertTriangle, Activity
} from 'lucide-react';

// Searchable Dropdown Component
function SearchableDropdown({ 
    options, 
    value, 
    onChange, 
    placeholder = "-- Select --",
    displayKey = "name",
    valueKey = "id",
    className = ""
}: {
    options: any[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    displayKey?: string;
    valueKey?: string;
    className?: string;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    const filteredOptions = options.filter((option) =>
        option[displayKey]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        option[valueKey]?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedOption = options.find(opt => opt[valueKey] === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
        setSearchTerm('');
    };

    return (
        <div ref={dropdownRef} className={`relative ${className}`}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-2.5 border rounded-lg bg-gray-50 text-left flex items-center justify-between hover:bg-gray-100 transition-colors"
            >
                <span className={selectedOption ? "text-gray-900 font-medium" : "text-gray-400"}>
                    {selectedOption 
                        ? `${selectedOption[displayKey]} (${selectedOption[valueKey]})`
                        : placeholder
                    }
                </span>
                <ChevronDown size={18} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-64 overflow-hidden">
                    <div className="p-2 border-b sticky top-0 bg-white">
                        <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg">
                            <Search size={16} className="text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-transparent outline-none text-sm w-full"
                                autoFocus
                            />
                        </div>
                    </div>
                    <div className="overflow-y-auto max-h-48">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => (
                                <button
                                    key={option[valueKey]}
                                    type="button"
                                    onClick={() => handleSelect(option[valueKey])}
                                    className={`w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors ${
                                        value === option[valueKey] ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-700'
                                    }`}
                                >
                                    <div className="font-medium">{option[displayKey]}</div>
                                    <div className="text-xs text-gray-500">{option[valueKey]}</div>
                                </button>
                            ))
                        ) : (
                            <div className="px-4 py-6 text-center text-gray-400 text-sm">No results found</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function AdminDashboard() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('announcements');
    const [listSubView, setListSubView] = useState<'none' | 'students' | 'faculties'>('none');

    // --- Arrear States (Pre-processing & Sorting) ---
    const [arrearFile, setArrearFile] = useState<File | null>(null);
    const [arrearPreview, setArrearPreview] = useState<any[] | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [targetYear, setTargetYear] = useState('1');
    const [targetSem, setTargetSem] = useState('1');
    const [targetSec, setTargetSec] = useState('A');

    // --- Filter States ---
    const [filterYear, setFilterYear] = useState('');
    const [filterSem, setFilterSem] = useState('');
    const [filterSec, setFilterSec] = useState('');
    const [filterDesignation, setFilterDesignation] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // --- Modal States ---
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);

    // --- Bulk Upload State ---
    const [bulkFile, setBulkFile] = useState<File | null>(null);
    const [bulkRole, setBulkRole] = useState('Student');

    // --- Announcements State ---
    const [announcementTitle, setAnnouncementTitle] = useState('');
    const [announcementContent, setAnnouncementContent] = useState('');
    const [announcementType, setAnnouncementType] = useState('Global');
    const [activeAnnouncements, setActiveAnnouncements] = useState<any[]>([]);

    // --- Result Links State ---
    const [resultTitle, setResultTitle] = useState('');
    const [resultUrl, setResultUrl] = useState('');
    const [resultLinks, setResultLinks] = useState<any[]>([]); 

    // --- Class Advisor Mapping State ---
    const [advisorData, setAdvisorData] = useState({
        advisor_no: '',
        faculty_id: '',
        year: 1,
        semester: 1,
        section: 'A'
    });

    // --- User Creation States ---
    const [userData, setUserData] = useState({
        id: '', name: '', role: 'Student', password: '', 
        year: 1, semester: 1, section: 'A', designation: 'Assistant Professor', doj: ''
    });

    // --- Course/Lab Management States ---
    const [courseData, setCourseData] = useState({ 
        code: '', title: '', year: 1, semester: 1, credits: 3, section: 'A', faculty_id: '' 
    });
    const [labData, setLabData] = useState({ 
        code: '', title: '', year: 1, semester: 1, credits: 2, section: 'A', faculty_id: '' 
    });

    const [courses, setCourses] = useState([]);
    const [faculties, setFaculties] = useState([]); 
    const [studentsList, setStudentsList] = useState([]); 

    useEffect(() => {
        const token = localStorage.getItem('token');
        const role = localStorage.getItem('role');
        if (!token || role !== 'Admin') {
            router.push('/login');
            return;
        }
        fetchCourses();
        fetchFaculties(); 
        fetchActiveAnnouncements();
    }, [router]);

    useEffect(() => {
        if (activeTab === 'sem result link') fetchResultLinks();
        if (activeTab === 'announcements') fetchActiveAnnouncements();
    }, [activeTab]);

    useEffect(() => {
        if (listSubView === 'students') fetchStudents();
    }, [filterYear, filterSem, filterSec, listSubView]);

    useEffect(() => {
        if (listSubView === 'faculties') fetchFaculties();
    }, [filterDesignation, listSubView]);

    const fetchCourses = async () => {
        try {
            const res = await axios.get(`${API_URL}/courses`);
            setCourses(res.data);
        } catch (err) { console.error("Fetch Courses Error:", err); }
    };

    const fetchFaculties = async () => {
        try {
            const params = new URLSearchParams();
            if (filterDesignation) params.append('designation', filterDesignation);
            const res = await axios.get(`${API_URL}/admin/faculties?${params.toString()}`);
            setFaculties(res.data);
        } catch (err) { console.error("Fetch Faculty Error:", err); }
    };

    const fetchStudents = async () => {
        try {
            const params = new URLSearchParams();
            if (filterYear) params.append('year', filterYear);
            if (filterSem) params.append('semester', filterSem);
            if (filterSec) params.append('section', filterSec);
            const res = await axios.get(`${API_URL}/admin/students?${params.toString()}`);
            setStudentsList(res.data);
        } catch (err) { console.error("Fetch Student Error:", err); }
    };

    const fetchResultLinks = async () => {
        try {
            const res = await axios.get(`${API_URL}/materials/Global`);
            setResultLinks(res.data.filter((m: any) => m.type === 'Result Link'));
        } catch (err) { console.error("Error fetching links", err); }
    };

    const fetchActiveAnnouncements = async () => {
        try {
            const [studentRes, facultyRes] = await Promise.all([
                axios.get(`${API_URL}/announcements?audience=Student`),
                axios.get(`${API_URL}/announcements?audience=Faculty`)
            ]);
            const allAnn = [...studentRes.data, ...facultyRes.data];
            const uniqueAnn = Array.from(new Map(allAnn.map(item => [item.id, item])).values());
            setActiveAnnouncements(uniqueAnn.sort((a, b) => b.id - a.id));
        } catch (err) { console.error("Error fetching announcements", err); }
    };

    const filteredResults = (listSubView === 'students' ? studentsList : faculties).filter((user: any) => {
        const query = searchQuery.toLowerCase();
        const nameMatch = user.name?.toLowerCase().includes(query);
        const idMatch = (user.roll_no || user.staff_no)?.toLowerCase().includes(query);
        return nameMatch || idMatch;
    });

    const handleDeleteUser = async (id: string, role: string) => {
        if (!confirm(`Permanently delete ${role} ${id}?`)) return;
        try {
            const endpoint = role === 'Student' ? `/student/${id}` : `/faculty/${id}`;
            await axios.delete(`${API_URL}${endpoint}`);
            alert(`${role} deleted successfully!`);
            role === 'Student' ? fetchStudents() : fetchFaculties();
        } catch (err) { alert("Delete failed."); }
    };

    const handleEditClick = (user: any, role: string) => {
        setEditingUser({ 
            ...user, 
            user_role: role, 
            password: '', 
            roll_no: user.roll_no || '', 
            staff_no: user.staff_no || '',
            original_roll_no: user.roll_no,
            original_id: user.staff_no
        });
        setIsEditModalOpen(true);
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const endpoint = editingUser.user_role === 'Student' ? '/admin/student/update' : '/admin/faculty/update';
            await axios.put(`${API_URL}${endpoint}`, editingUser);
            alert(`${editingUser.user_role} updated successfully!`);
            setIsEditModalOpen(false);
            editingUser.user_role === 'Student' ? fetchStudents() : fetchFaculties();
        } catch (err) { alert("Update failed."); }
    };

    const handleBulkUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!bulkFile) return alert("Please select a CSV file");
        const formData = new FormData();
        formData.append('file', bulkFile);
        try {
            const res = await axios.post(`${API_URL}/admin/bulk-upload/${bulkRole}`, formData);
            alert(res.data.message);
            setBulkFile(null);
            fetchStudents(); fetchFaculties();
        } catch (err) { alert("Bulk upload failed."); }
    };

    const handlePostAnnouncement = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post(`${API_URL}/announcements`, {
                title: announcementTitle, 
                content: announcementContent,
                type: announcementType, 
                posted_by: 'Admin', 
                course_code: 'Global',
                section: 'All'
            });
            alert("Announcement broadcasted successfully!");
            setAnnouncementTitle(''); 
            setAnnouncementContent('');
            fetchActiveAnnouncements();
        } catch (err) { alert('Failed to post announcement'); }
    };

    const handleDeleteAnnouncement = async (id: number) => {
        if (!confirm("Remove this announcement from registry?")) return;
        try {
            await axios.delete(`${API_URL}/announcements/${id}`);
            fetchActiveAnnouncements();
        } catch (err) { alert("Failed to delete announcement"); }
    };

    const handlePostResultLink = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            
            // Explicitly appending all required fields for the backend
            formData.append('course_code', 'Global');
            formData.append('type', 'Result Link');
            formData.append('title', resultTitle);
            formData.append('url', resultUrl);
            formData.append('posted_by', localStorage.getItem('user_id') || 'Admin');
            
            await axios.post(`${API_URL}/materials`, formData);
            
            alert("✅ Semester Result link published!");
            setResultTitle(''); 
            setResultUrl('');
            fetchResultLinks();
            
        } catch (err: any) { 
            // This will now capture the exact error message from the backend!
            console.error("Result Upload Error:", err.response?.data || err);
            
            const errorMessage = err.response?.data?.detail || err.response?.data?.message || err.message;
            const formattedError = typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage);
            
            alert(`Backend Error: ${formattedError}`); 
        }
    };

    const handleDeleteLink = async (id: number) => {
        if (!confirm("Are you sure you want to delete this result link?")) return;
        try {
            await axios.delete(`${API_URL}/materials/${id}`);
            alert("Link deleted successfully");
            fetchResultLinks();
        } catch (err: any) { 
            console.error("Delete Link Error:", err.response?.data || err);
            alert("Failed to delete link"); 
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...userData,
                year: Number(userData.year),
                semester: Number(userData.semester),
                section: userData.role === 'Student' ? userData.section : 'N/A'
            };
            await axios.post(`${API_URL}/admin/create-user`, payload);
            alert(`${userData.role} created successfully!`);
            setUserData({ id: '', name: '', role: 'Student', password: '', year: 1, semester: 1, section: 'A', designation: 'Assistant Professor', doj: '' });
            fetchFaculties(); fetchStudents();
        } catch (err: any) { alert("Error creating user"); }
    };

    const handleAddSubject = async (e: React.FormEvent, data: any, isLab: boolean) => {
        e.preventDefault();
        try {
            const payload = {
                ...data,
                title: isLab && !data.title.includes('(Lab)') ? `${data.title} (Lab)` : data.title,
                year: Number(data.year),
                semester: Number(data.semester),
                credits: Number(data.credits)
            };
            await axios.post(`${API_URL}/admin/courses`, payload);
            alert("Subject added!");
            activeTab === 'courses' 
                ? setCourseData({ code: '', title: '', year: 1, semester: 1, credits: 3, section: 'A', faculty_id: '' }) 
                : setLabData({ code: '', title: '', year: 1, semester: 1, credits: 2, section: 'A', faculty_id: '' });
            fetchCourses();
        } catch (err: any) { alert("Failed to add subject"); }
    };

    const handleDeleteCourse = async (id: number) => {
        if (!confirm(`Delete subject?`)) return;
        try {
            await axios.delete(`${API_URL}/admin/courses/${id}`);
            fetchCourses();
        } catch (err) { alert('Error deleting course'); }
    };

    const handleAssignAdvisor = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData();
        Object.entries(advisorData).forEach(([key, value]) => formData.append(key, value.toString()));
        try {
            await axios.post(`${API_URL}/advisors/assign`, formData);
            alert("Class Advisor Assigned Successfully!");
            setAdvisorData({ advisor_no: '', faculty_id: '', year: 1, semester: 1, section: 'A' });
        } catch (err: any) {
            alert(err.response?.data?.detail || "Assignment Failed. Please try again.");
        }
    };

    // --- Arrear Phase 1: Analysis ---
    const handleAnalyzeArrears = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!arrearFile) return alert("Please select a file first");

        const formData = new FormData();
        formData.append('file', arrearFile);
        formData.append('year', targetYear);
        formData.append('semester', targetSem);
        formData.append('section', targetSec);

        setIsAnalyzing(true);
        try {
            const res = await axios.post(`${API_URL}/admin/arrears/preview`, formData);
            setArrearPreview(res.data.preview);
        } catch (err: any) {
            alert(err.response?.data?.detail || "Analysis failed.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    // --- Arrear Phase 2: Final Confirmation ---
    const handleConfirmArrearUpload = async () => {
        if (!arrearFile) return;
        const formData = new FormData();
        formData.append('file', arrearFile);

        try {
            await axios.post(`${API_URL}/admin/upload-arrears`, formData);
            
            await axios.post(`${API_URL}/announcements`, {
                title: "Arrear Records Published",
                content: `Arrear details for Year ${targetYear}, Section ${targetSec} have been updated. Check the Arrears tab.`,
                type: "Student",
                posted_by: "Admin",
                course_code: "Global",
                section: targetSec
            });

            alert("✅ Successfully uploaded and students notified!");
            setArrearPreview(null);
            setArrearFile(null);
            fetchActiveAnnouncements();
        } catch (err) {
            alert("Final upload failed.");
        }
    };

    const onTabClick = (tab: string) => {
        if (tab === 'topper') {
            router.push('/admin/topper');
        } else if (tab === 'placements') {
            router.push('/admin/placements');
        } else {
            setActiveTab(tab);
            setListSubView('none');
            setSearchQuery('');
            setArrearPreview(null); // Reset preview on tab change
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Navbar />
            <div className="container mx-auto px-4 py-8 flex-grow">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-blue-900 tracking-tight flex items-center gap-3">
                        <UserCog size={32} /> Admin Control Panel
                    </h1>
                    <button 
                        onClick={() => router.push('/admin/placements')}
                        className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg transition-all flex items-center gap-2"
                    >
                        <Trophy size={16} /> Placement Module
                    </button>
                </div>

                <div className="flex space-x-6 mb-8 border-b overflow-x-auto no-scrollbar">
                    {['announcements', 'create user', 'list student/faculty', 'courses', 'labs', 'upload arrear', 'placements', 'class advisor', 'topper', 'sem result link'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => onTabClick(tab)}
                            className={`pb-3 px-2 capitalize transition-all duration-200 whitespace-nowrap font-bold ${
                                activeTab === tab 
                                ? 'border-b-2 border-blue-600 text-blue-600' 
                                : 'text-gray-400 hover:text-gray-600'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                    
                    {/* TAB: Announcements */}
                    {activeTab === 'announcements' && (
                        <div className="animate-in fade-in duration-300 grid grid-cols-1 lg:grid-cols-3 gap-12">
                            <div className="lg:col-span-2">
                                <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Bell className="text-blue-600" /> Targeted Broadcast</h2>
                                <form onSubmit={handlePostAnnouncement} className="space-y-4 bg-blue-50/50 p-6 rounded-2xl border border-blue-100 shadow-sm">
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Audience Type</label>
                                            <select value={announcementType} onChange={(e) => setAnnouncementType(e.target.value)} className="w-full p-3 border rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                                                <option value="Global">Global (Everyone)</option>
                                                <option value="Faculty">Faculties Only</option>
                                                <option value="Student">Students Only</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Heading</label>
                                        <input type="text" placeholder="Title of notice" value={announcementTitle} onChange={(e) => setAnnouncementTitle(e.target.value)} className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" required />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Message Body</label>
                                        <textarea placeholder="Write announcement details here..." value={announcementContent} onChange={(e) => setAnnouncementContent(e.target.value)} className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" rows={5} required />
                                    </div>
                                    <button type="submit" className="w-full bg-blue-900 text-white px-8 py-3 rounded-xl hover:bg-blue-800 transition-all font-bold shadow-lg flex items-center justify-center gap-2">
                                        <Send size={18} /> Post Announcement
                                    </button>
                                </form>
                            </div>

                            <div className="lg:col-span-1 border-l pl-8">
                                <h2 className="text-xl font-bold mb-6 uppercase tracking-tighter flex items-center gap-2"><Filter size={20} className="text-orange-500" /> Active Registry</h2>
                                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 no-scrollbar">
                                    {activeAnnouncements.length > 0 ? activeAnnouncements.map((ann) => (
                                        <div key={ann.id} className="p-4 border rounded-xl bg-gray-50 flex justify-between items-start group hover:bg-white transition-all shadow-sm relative overflow-hidden">
                                            <div className="flex-grow">
                                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full mb-2 inline-block ${ann.type === 'Global' ? 'bg-green-100 text-green-700' : ann.type === 'Faculty' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {ann.type} • {ann.section}
                                                </span>
                                                <p className="font-bold text-blue-900 text-sm">{ann.title}</p>
                                                <p className="text-[10px] text-gray-400 italic mb-1">By: {ann.posted_by}</p>
                                                <p className="text-xs text-gray-500 line-clamp-2 mt-1">{ann.content}</p>
                                            </div>
                                            <button onClick={() => handleDeleteAnnouncement(ann.id)} className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    )) : <p className="text-center py-10 text-gray-400 italic text-sm">No recent broadcasts.</p>}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB: Create User */}
                    {activeTab === 'create user' && (
                        <div className="animate-in fade-in duration-300">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-2"><PlusCircle className="text-blue-600" /> New Registration</h2>
                            <p className="text-[10px] text-red-600 font-bold mb-6 uppercase tracking-wider italic">* Note: Ensure subjects exist before registering students for a specific sem.</p>
                            <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mb-12">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-gray-400">ID / Roll No</label>
                                    <input type="text" placeholder="HTS Number / Roll No" value={userData.id} onChange={(e) => setUserData({...userData, id: e.target.value})} className="w-full p-2.5 border rounded-lg" required />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-gray-400">Full Name</label>
                                    <input type="text" placeholder="Full Name" value={userData.name} onChange={(e) => setUserData({...userData, name: e.target.value})} className="w-full p-2.5 border rounded-lg" required />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-gray-400">Role</label>
                                    <select value={userData.role} onChange={(e) => setUserData({...userData, role: e.target.value})} className="w-full p-2.5 border rounded-lg bg-white"><option value="Student">Student</option><option value="Faculty">Faculty</option></select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-gray-400">Password</label>
                                    <input type="password" placeholder="Initial Password" value={userData.password} onChange={(e) => setUserData({...userData, password: e.target.value})} className="w-full p-2.5 border rounded-lg" required />
                                </div>
                                
                                {userData.role === 'Student' ? (
                                    <>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-gray-400">Year</label>
                                            <select value={userData.year} onChange={(e) => setUserData({...userData, year: Number(e.target.value)})} className="w-full p-2.5 border rounded-lg bg-white">
                                                {[1,2,3,4].map(y => <option key={y} value={y}>{y} Year</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-gray-400">Semester</label>
                                            <select value={userData.semester} onChange={(e) => setUserData({...userData, semester: Number(e.target.value)})} className="p-2.5 border rounded-lg bg-white">
                                                {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>{s} Sem</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1 md:col-span-2">
                                            <label className="text-[10px] font-black uppercase text-gray-400">Section</label>
                                            <select value={userData.section} onChange={(e) => setUserData({...userData, section: e.target.value})} className="w-full p-2.5 border rounded-lg bg-white font-bold text-orange-600">
                                                <option value="A">Section A</option><option value="B">Section B</option><option value="C">Section C</option>
                                            </select>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-gray-400">Designation</label>
                                            <select value={userData.designation} onChange={(e) => setUserData({...userData, designation: e.target.value})} className="w-full p-2.5 border rounded-lg bg-white">
                                                <option value="Assistant Professor">Assistant Professor</option>
                                                <option value="Associate Professor">Associate Professor</option>
                                                <option value="Professor">Professor</option>
                                                <option value="HOD">HOD</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-gray-400">Date of Joining</label>
                                            <input type="date" value={userData.doj} onChange={(e) => setUserData({...userData, doj: e.target.value})} className="w-full p-2.5 border rounded-lg" />
                                        </div>
                                    </>
                                )}
                                <button type="submit" className="bg-blue-600 text-white p-3 rounded-lg md:col-span-2 font-bold shadow-lg hover:bg-blue-700 transition-all">Complete Registration</button>
                            </form>
                            <div className="border-t pt-8">
                                <h2 className="text-xl font-bold mb-4 text-green-700 flex items-center gap-2"><LinkIcon /> Bulk Upload via CSV</h2>
                                <form onSubmit={handleBulkUpload} className="flex flex-wrap gap-4 items-end bg-green-50 p-6 rounded-xl border border-green-100">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-black uppercase text-green-600">Select Role</label>
                                        <select value={bulkRole} onChange={(e) => setBulkRole(e.target.value)} className="p-2.5 border rounded-lg bg-white outline-none"><option value="Student">Students</option><option value="Faculty">Faculty</option></select>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-black uppercase text-green-600">CSV File</label>
                                        <input type="file" accept=".csv" onChange={(e) => setBulkFile(e.target.files?.[0] || null)} className="p-2 border rounded-lg bg-white text-sm" />
                                    </div>
                                    <button type="submit" className="bg-green-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-green-700 shadow-md">Start Import</button>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* TAB: List Student/Faculty */}
                    {activeTab === 'list student/faculty' && (
                        <div className="animate-in fade-in duration-300">
                            {listSubView === 'none' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-10">
                                    <div onClick={() => setListSubView('students')} className="group cursor-pointer bg-blue-50 p-10 rounded-2xl border-2 border-transparent hover:border-blue-500 transition-all text-center">
                                        <div className="w-20 h-20 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-110 transition-transform"><GraduationCap size={40} /></div>
                                        <h3 className="text-2xl font-black text-blue-900 mb-2 uppercase tracking-tighter">Student Database</h3>
                                        <p className="text-gray-600">View and manage student records</p>
                                    </div>
                                    <div onClick={() => setListSubView('faculties')} className="group cursor-pointer bg-purple-50 p-10 rounded-2xl border-2 border-transparent hover:border-purple-500 transition-all text-center">
                                        <div className="w-20 h-20 bg-purple-600 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-110 transition-transform"><Users size={40} /></div>
                                        <h3 className="text-2xl font-black text-purple-900 mb-2 uppercase tracking-tighter">Faculty Registry</h3>
                                        <p className="text-gray-600">Manage institutional teaching staff</p>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <button onClick={() => {setListSubView('none'); setSearchQuery('');}} className="mb-6 flex items-center gap-2 text-gray-500 hover:text-blue-600 font-bold transition-colors"><ArrowLeft size={20} /> Back to Selection</button>
                                    
                                    <div className="bg-gray-50 p-6 rounded-2xl border mb-8">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Filter size={18} className="text-blue-600" />
                                            <h3 className="font-black text-blue-900 uppercase text-xs tracking-widest">Advanced Filters</h3>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            <div className="relative">
                                                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                <input type="text" placeholder="Search by Name/ID..." className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                                            </div>
                                            
                                            {listSubView === 'students' ? (
                                                <>
                                                    <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="p-2 border rounded-lg text-sm bg-white font-bold">
                                                        <option value="">All Years</option>
                                                        {[1,2,3,4].map(y => <option key={y} value={y}>{y} Year</option>)}
                                                    </select>
                                                    <select value={filterSem} onChange={(e) => setFilterSem(e.target.value)} className="p-2 border rounded-lg text-sm bg-white font-bold">
                                                        <option value="">All Semesters</option>
                                                        {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>{s} Sem</option>)}
                                                    </select>
                                                    <select value={filterSec} onChange={(e) => setFilterSec(e.target.value)} className="p-2 border rounded-lg text-sm bg-white font-bold text-orange-600">
                                                        <option value="">All Sections</option>
                                                        <option value="A">Section A</option>
                                                        <option value="B">Section B</option>
                                                        <option value="C">Section C</option>
                                                    </select>
                                                </>
                                            ) : (
                                                <select value={filterDesignation} onChange={(e) => setFilterDesignation(e.target.value)} className="p-2 border rounded-lg text-sm bg-white font-bold md:col-span-3">
                                                    <option value="">All Designations</option>
                                                    <option value="Assistant Professor">Assistant Professor</option>
                                                    <option value="Associate Professor">Associate Professor</option>
                                                    <option value="Professor">Professor</option>
                                                    <option value="HOD">HOD</option>
                                                </select>
                                            )}
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto border rounded-xl">
                                        <table className="w-full text-left">
                                            <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 border-b">
                                                <tr>
                                                    <th className="p-4">ID/Roll No</th>
                                                    <th className="p-4">Name</th>
                                                    <th className="p-4">{listSubView === 'students' ? 'Section' : 'Designation'}</th>
                                                    <th className="p-4">{listSubView === 'faculties' ? 'Smart Progress' : 'Semester'}</th>
                                                    {listSubView === 'students' && <th className="p-4">CGPA</th>}
                                                    <th className="p-4 text-center">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y text-sm">
                                                {filteredResults.map((user: any) => (
                                                    <tr key={user.roll_no || user.staff_no} className="hover:bg-gray-50 transition-colors">
                                                        <td className="p-4 font-mono font-bold text-blue-600">{user.roll_no || user.staff_no}</td>
                                                        <td className="p-4 font-bold text-gray-800">{user.name}</td>
                                                        <td className="p-4">
                                                            <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${
                                                                listSubView === 'students' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                                                            }`}>
                                                                {user.section || user.designation}
                                                            </span>
                                                        </td>
                                                        <td className="p-4">
                                                            {listSubView === 'faculties' ? (
                                                                <button 
                                                                    onClick={() => router.push(`/faculty/Progress?adminView=true&facultyId=${user.staff_no}`)}
                                                                    className="flex items-center gap-2 bg-white text-blue-900 px-3 py-1.5 rounded-lg font-black text-[10px] uppercase border-2 border-blue-50 hover:bg-blue-900 hover:text-white transition-all shadow-sm group"
                                                                >
                                                                    <Activity size={14} className="text-blue-600 group-hover:text-white" /> View Tracker
                                                                </button>
                                                            ) : (
                                                                <span className="text-gray-500 font-bold">{user.semester} Sem</span>
                                                            )}
                                                        </td>
                                                        {listSubView === 'students' && <td className="p-4 font-black text-blue-900">{user.cgpa?.toFixed(2) || '0.00'}</td>}
                                                        <td className="p-4 flex justify-center gap-2">
                                                            <button onClick={() => handleEditClick(user, listSubView === 'students' ? 'Student' : 'Faculty')} className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"><Edit2 size={14} /></button>
                                                            <button onClick={() => handleDeleteUser(user.roll_no || user.staff_no, listSubView === 'students' ? 'Student' : 'Faculty')} className="p-1 text-red-500 hover:bg-red-100 rounded transition-colors"><Trash2 size={14} /></button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB: Class Advisor Mapping */}
                    {activeTab === 'class advisor' && (
                        <div className="animate-in fade-in duration-300">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-6">
                                <UserCheck className="text-blue-600" /> Class Advisor Assignment
                            </h2>
                            <form onSubmit={handleAssignAdvisor} className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl bg-gray-50 p-8 rounded-2xl border">
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-black uppercase text-gray-400">Advisor ID / Reference</label>
                                    <input type="text" placeholder="e.g. ADV_AD_01" value={advisorData.advisor_no} onChange={(e) => setAdvisorData({...advisorData, advisor_no: e.target.value})} className="p-2.5 border rounded-lg" required />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-black uppercase text-gray-400">Select Faculty Member</label>
                                    <SearchableDropdown options={faculties} value={advisorData.faculty_id} onChange={(val) => setAdvisorData({...advisorData, faculty_id: val})} placeholder="-- Select Faculty --" displayKey="name" valueKey="staff_no" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-black uppercase text-gray-400">Target Year</label>
                                    <select value={advisorData.year} onChange={(e) => setAdvisorData({...advisorData, year: Number(e.target.value)})} className="p-2.5 border rounded-lg bg-white">
                                        {[1,2,3,4].map(y => <option key={y} value={y}>{y} Year</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-black uppercase text-gray-400">Semester</label>
                                    <select value={advisorData.semester} onChange={(e) => setAdvisorData({...advisorData, semester: Number(e.target.value)})} className="p-2.5 border rounded-lg bg-white">
                                        {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>{s} Sem</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1 md:col-span-2">
                                    <label className="text-[10px] font-black uppercase text-gray-400">Class Section</label>
                                    <select value={advisorData.section} onChange={(e) => setAdvisorData({...advisorData, section: e.target.value})} className="p-2.5 border rounded-lg bg-white font-bold text-orange-600">
                                        <option value="A">Section A</option><option value="B">Section B</option><option value="C">Section C</option>
                                    </select>
                                </div>
                                <button type="submit" className="bg-blue-600 text-white p-3 rounded-lg md:col-span-2 font-bold shadow-lg hover:bg-blue-700 transition-all">Confirm Advisor Mapping</button>
                            </form>
                        </div>
                    )}

                    {/* TAB: Course Management (Syllabus) */}
                    {(activeTab === 'courses' || activeTab === 'labs') && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-in fade-in duration-300">
                            <div>
                                <h2 className="text-xl font-bold mb-1 text-gray-800">New {activeTab === 'courses' ? 'Theory Subject' : 'Laboratory'}</h2>
                                <p className="text-[10px] text-red-600 font-bold mb-6 uppercase tracking-wider italic">* Note: Syllabus progress is auto-tracked per section.</p>
                                <form onSubmit={(e) => handleAddSubject(e, activeTab === 'courses' ? courseData : labData, activeTab === 'labs')} className="space-y-4">
                                    <input type="text" placeholder="Subject Code" value={activeTab === 'courses' ? courseData.code : labData.code} onChange={(e) => activeTab === 'courses' ? setCourseData({...courseData, code: e.target.value}) : setLabData({...labData, code: e.target.value})} className="w-full p-2.5 border rounded-lg" required />
                                    <input type="text" placeholder="Full Title" value={activeTab === 'courses' ? courseData.title : labData.title} onChange={(e) => activeTab === 'courses' ? setCourseData({...courseData, title: e.target.value}) : setLabData({...labData, title: e.target.value})} className="w-full p-2.5 border rounded-lg" required />
                                    <div className="flex space-x-4">
                                        <div className="w-1/3">
                                            <label className="block text-[10px] font-black text-gray-400 mb-1.5 uppercase">Year</label>
                                            <select value={activeTab === 'courses' ? courseData.year : labData.year} onChange={(e) => activeTab === 'courses' ? setCourseData({...courseData, year: Number(e.target.value)}) : setLabData({...labData, year: Number(e.target.value)})} className="w-full p-2.5 border rounded-lg bg-white font-medium">
                                                {[1,2,3,4].map(y => <option key={y} value={y}>{y} Year</option>)}
                                            </select>
                                        </div>
                                        <div className="w-1/3">
                                            <label className="block text-[10px] font-black text-gray-400 mb-1.5 uppercase">Sem</label>
                                            <select value={activeTab === 'courses' ? courseData.semester : labData.semester} onChange={(e) => activeTab === 'courses' ? setCourseData({...courseData, semester: Number(e.target.value)}) : setLabData({...labData, semester: Number(e.target.value)})} className="w-full p-2.5 border rounded-lg bg-white font-medium">
                                                {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>{s} Sem</option>)}
                                            </select>
                                        </div>
                                        <div className="w-1/3">
                                            <label className="block text-[10px] font-black text-gray-400 mb-1.5 uppercase">Credits</label>
                                            <input type="number" value={activeTab === 'courses' ? courseData.credits : labData.credits} onChange={(e) => activeTab === 'courses' ? setCourseData({...courseData, credits: Number(e.target.value)}) : setLabData({...labData, credits: Number(e.target.value)})} className="w-full p-2.5 border rounded-lg" />
                                        </div>
                                    </div>
                                    <select value={activeTab === 'courses' ? courseData.section : labData.section} onChange={(e) => activeTab === 'courses' ? setCourseData({...courseData, section: e.target.value}) : setLabData({...labData, section: e.target.value})} className="w-full p-2.5 border rounded-lg bg-orange-50 font-bold uppercase"><option value="A">Section A</option><option value="B">Section B</option><option value="C">Section C</option></select>
                                    <SearchableDropdown options={faculties} value={activeTab === 'courses' ? courseData.faculty_id : labData.faculty_id} onChange={(v) => activeTab === 'courses' ? setCourseData({...courseData, faculty_id: v}) : setLabData({...labData, faculty_id: v})} placeholder="-- Assign Faculty --" displayKey="name" valueKey="staff_no" />
                                    <button type="submit" className={`p-2.5 rounded-lg w-full font-bold text-white shadow-md ${activeTab === 'courses' ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700'}`}>Create Course</button>
                                </form>
                            </div>
                            <SyllabusList courses={courses.filter((c:any) => activeTab === 'labs' ? c.title.includes('(Lab)') : !c.title.includes('(Lab)'))} onDelete={handleDeleteCourse} title={`Active ${activeTab}`} />
                        </div>
                    )}

                    {/* TAB: Upload Arrear */}
                    {activeTab === 'upload arrear' && (
                        <div className="animate-in fade-in duration-300">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-red-700">
                                <FileText /> Arrear Deep-Sort Upload
                            </h2>

                            {!arrearPreview ? (
                                <form onSubmit={handleAnalyzeArrears} className="space-y-6 bg-gray-50 p-8 rounded-2xl border">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-gray-400">Target Year</label>
                                            <select value={targetYear} onChange={(e) => setTargetYear(e.target.value)} className="w-full p-2.5 border rounded-lg bg-white">
                                                {[1,2,3,4].map(y => <option key={y} value={y}>{y} Year</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-gray-400">Semester</label>
                                            <select value={targetSem} onChange={(e) => setTargetSem(e.target.value)} className="w-full p-2.5 border rounded-lg bg-white">
                                                {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>{s} Sem</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-gray-400">Section</label>
                                            <select value={targetSec} onChange={(e) => setTargetSec(e.target.value)} className="w-full p-2.5 border rounded-lg bg-white font-bold text-orange-600">
                                                <option value="A">A</option><option value="B">B</option><option value="C">C</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-black uppercase text-gray-400">Select Arrear File (VH NO required)</label>
                                        <input 
                                            type="file" 
                                            accept=".csv, .xlsx" 
                                            onChange={(e) => setArrearFile(e.target.files?.[0] || null)}
                                            className="p-3 border rounded-lg bg-white text-sm" 
                                        />
                                    </div>

                                    <button 
                                        type="submit" 
                                        disabled={isAnalyzing}
                                        className="w-full bg-blue-900 text-white py-3 rounded-xl font-bold hover:bg-blue-800 shadow-lg disabled:bg-gray-400"
                                    >
                                        {isAnalyzing ? "Analyzing Data..." : "Process & Preview Data"}
                                    </button>
                                </form>
                            ) : (
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center">
                                        <button onClick={() => setArrearPreview(null)} className="text-gray-500 flex items-center gap-2 font-bold hover:text-blue-600">
                                            <ArrowLeft size={18} /> Back to Upload
                                        </button>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black uppercase text-gray-400">Target Class</p>
                                            <p className="font-bold text-blue-900">Year {targetYear} - Sem {targetSem} - Sec {targetSec}</p>
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto border rounded-xl max-h-[400px]">
                                        <table className="w-full text-left">
                                            <thead className="bg-gray-100 sticky top-0 text-[10px] font-black uppercase text-gray-500">
                                                <tr>
                                                    <th className="p-4">VH NO</th>
                                                    <th className="p-4">Mapped Name</th>
                                                    <th className="p-4">Subject</th>
                                                    <th className="p-4">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y text-sm">
                                                {arrearPreview.map((row, idx) => (
                                                    <tr key={idx} className={row.is_valid ? "bg-white" : "bg-red-50"}>
                                                        <td className="p-4 font-mono font-bold text-blue-600">{row.vh_no}</td>
                                                        <td className="p-4 font-bold">{row.name}</td>
                                                        <td className="p-4">{row.subject_code} - {row.subject_name}</td>
                                                        <td className="p-4">
                                                            <span className={`px-2 py-1 rounded text-[10px] font-black ${row.is_valid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                {row.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <button 
                                        onClick={handleConfirmArrearUpload}
                                        className="w-full bg-green-600 text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-green-700 shadow-xl transition-all flex items-center justify-center gap-3"
                                    >
                                        <Send size={20} /> Confirm Upload & Notify Students
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB: Result Links */}
                    {activeTab === 'sem result link' && (
                        <div className="animate-in fade-in duration-300">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                <div>
                                    <h2 className="text-xl font-bold mb-2 flex items-center gap-2"><LinkIcon className="text-blue-600" /> Upload Results</h2>
                                    <p className="text-[10px] text-red-600 font-bold mb-6 uppercase tracking-wider italic">* Published links appear on student result portals immediately.</p>
                                    <form onSubmit={handlePostResultLink} className="space-y-4">
                                        <input type="text" placeholder="Title (e.g. Nov 2025 Results)" value={resultTitle} onChange={(e) => setResultTitle(e.target.value)} className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" required />
                                        <input type="url" placeholder="Paste Result URL" value={resultUrl} onChange={(e) => setResultUrl(e.target.value)} className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" required />
                                        <button type="submit" className="bg-blue-900 text-white px-8 py-2.5 rounded-lg hover:bg-blue-800 font-bold shadow-md w-full transition-all">Publish Result Link</button>
                                    </form>
                                </div>
                                <div className="border-l lg:pl-12">
                                    <h2 className="text-xl font-bold mb-6 uppercase tracking-tighter">Active Result Links</h2>
                                    <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
                                        {resultLinks.length > 0 ? resultLinks.map((link) => (
                                            <div key={link.id} className="p-4 border rounded-xl bg-gray-50 flex justify-between items-center group hover:bg-white transition-all shadow-sm">
                                                <div className="overflow-hidden">
                                                    <p className="font-bold text-blue-900 truncate">{link.title}</p>
                                                    <p className="text-[10px] text-gray-400 font-mono truncate">{link.file_link}</p>
                                                </div>
                                                <button onClick={() => handleDeleteLink(link.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
                                            </div>
                                        )) : <p className="text-center py-10 text-gray-400 italic text-sm">No result links found.</p>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal: Edit User Details */}
            {isEditModalOpen && editingUser && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-200">
                        <div className="bg-blue-900 p-6 text-white flex justify-between items-center"><h2 className="text-xl font-bold uppercase tracking-tight flex items-center gap-2"><UserCog size={24} /> Edit Profile</h2><button onClick={() => setIsEditModalOpen(false)} className="hover:rotate-90 transition-transform"><X size={24} /></button></div>
                        <form onSubmit={handleUpdateUser} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex flex-col gap-1 md:col-span-2"><label className="text-[10px] font-black uppercase text-gray-400">Full Name</label><input type="text" value={editingUser.name || ''} onChange={(e) => setEditingUser({...editingUser, name: e.target.value})} className="w-full p-2.5 border rounded-lg font-bold" required /></div>
                            <div className="flex flex-col gap-1 md:col-span-2"><label className="text-[10px] font-black uppercase text-gray-400">New Password (Empty to skip)</label><input type="password" value={editingUser.password || ''} onChange={(e) => setEditingUser({...editingUser, password: e.target.value})} placeholder="••••••••" className="w-full p-2.5 border rounded-lg" /></div>
                            <div className="md:col-span-2 flex gap-4 mt-4"><button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3 border-2 border-gray-100 rounded-xl font-black uppercase text-xs text-gray-400 hover:bg-gray-50 transition-colors">Cancel</button><button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-xs shadow-xl hover:bg-blue-700 transition-all">Save Changes</button></div>
                        </form>
                    </div>
                </div>
            )}
            <Footer />
        </div>
    );
}

function SyllabusList({ courses, onDelete, title }: any) {
    return (
        <div>
            <h2 className="text-xl font-bold mb-6 text-gray-800 tracking-tighter uppercase">{title}</h2>
            <div className="max-h-[450px] overflow-y-auto border rounded-xl divide-y">
                {courses.length > 0 ? courses.map((c: any) => (
                    <div key={c.id || c.code} className="flex justify-between items-center p-4 hover:bg-gray-50 transition-colors">
                        <div>
                            <p className="font-bold text-blue-900">{c.code} - Sec {c.section}</p>
                            <p className="text-sm text-gray-600">{c.title} (Sem {c.semester})</p>
                            <p className="text-[10px] font-bold text-blue-500 uppercase mt-1">ID: {c.faculty_id}</p>
                        </div>
                        <button onClick={() => onDelete(c.id || c.code)} className="text-red-500 hover:bg-red-50 px-3 py-1 rounded-md text-sm font-medium transition-colors font-bold uppercase tracking-tighter">Delete</button>
                    </div>
                )) : <p className="p-8 text-center text-gray-400 italic">No course records mapped.</p>}
            </div>
        </div>
    );
}