'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { API_URL } from '@/config';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { 
    Save, FileUp, UserCheck, ArrowLeft, Search, Loader2, 
    Megaphone, BookOpen, FileText, ClipboardList, Beaker, Trash2,
    Youtube, PlayCircle, RefreshCw, FileSpreadsheet, CheckCircle
} from 'lucide-react';

export default function SectionManagement() {
    const params = useParams();
    const router = useRouter();
    const courseCode = params.course as string;
    const sectionName = params.section as string; 

    const isLabCourse = courseCode?.toLowerCase().includes('lab') || courseCode?.startsWith('CS3402') || courseCode?.startsWith('CS3403');

    // --- Core States ---
    const [students, setStudents] = useState<any[]>([]);
    const [filteredStudents, setFilteredStudents] = useState<any[]>([]);
    const [uploadedMaterials, setUploadedMaterials] = useState<any[]>([]); 
    const [searchQuery, setSearchQuery] = useState('');
    const [activeAction, setActiveAction] = useState('marks');
    const [isSaving, setIsSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    // --- Syllabus & Unit States ---
    const [selectedUnit, setSelectedUnit] = useState(1);
    const [topicInput, setTopicInput] = useState("");
    const [syllabusTopics, setSyllabusTopics] = useState<any[]>([]);
    const [selectedTopicName, setSelectedTopicName] = useState("");

    // --- Excel Upload States ---
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [markEntity, setMarkEntity] = useState('cia1_marks');
    const [excelPreview, setExcelPreview] = useState<any[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    // Form States
    const [subAnn, setSubAnn] = useState({ title: '', content: '' });
    const [videoData, setVideoData] = useState({ title: '', url: '' });
    const [courseSubject, setCourseSubject] = useState('');

    // --- 1. INITIAL FETCH ---
    const fetchData = async () => {
        try {
            const res = await axios.get(`${API_URL}/marks/section?course_code=${courseCode}&section=${sectionName}`);
            setStudents(res.data);
            setFilteredStudents(res.data);
            // Capture the actual course subject from the first student's data
            if (res.data.length > 0 && res.data[0].subject) {
                setCourseSubject(res.data[0].subject);
            }
        } catch (error) {
            console.error("Error fetching students", error);
        }
    };

    // --- 2. TOPICS FETCH LOGIC ---
    const fetchSyllabusTopics = async () => {
        try {
            const res = await axios.get(`${API_URL}/syllabus/${courseCode}/${sectionName}?unit_no=${selectedUnit}`);
            setSyllabusTopics(res.data);
        } catch (error) {
            console.error("Error loading syllabus topics");
        }
    };

    // --- 3. SAVE TOPIC LOGIC ---
    const handleSaveTopic = async () => {
        if (!topicInput.trim()) return alert("Enter a topic name first");
        setIsSaving(true);
        try {
            await axios.post(`${API_URL}/syllabus/topics`, {
                course_code: courseCode,
                section: sectionName,
                unit_no: selectedUnit,
                topic_name: topicInput.trim()
            });
            setTopicInput(""); 
            fetchSyllabusTopics(); // Refresh dropdown list
        } catch (error) {
            alert("Failed to save topic.");
        } finally {
            setIsSaving(false);
        }
    };

    // --- 4. DELETE TOPIC LOGIC ---
    const handleDeleteTopic = async (topicId: number) => {
        if (!confirm("Remove this topic from current unit?")) return;
        try {
            await axios.delete(`${API_URL}/syllabus/topics/${topicId}`);
            fetchSyllabusTopics(); // Refresh list
        } catch (error) {
            alert("Failed to delete topic.");
        }
    };

    useEffect(() => {
        if (courseCode && sectionName) {
            fetchData();
            fetchMaterials();
        }
    }, [courseCode, sectionName]);

    useEffect(() => {
        if (courseCode && sectionName) {
            fetchSyllabusTopics();
        }
    }, [courseCode, sectionName, selectedUnit]);

    // --- 5. MATERIALS FETCH LOGIC ---
    const fetchMaterials = async () => {
        try {
            const res = await axios.get(`${API_URL}/materials/${courseCode}`);
            setUploadedMaterials(res.data);
        } catch (e) {
            console.error("Error loading files");
        }
    };

    useEffect(() => {
        if (activeAction === 'uploads') fetchMaterials();
    }, [activeAction]);

    // --- 6. DELETE LOGIC ---
    const handleDelete = async (id: number) => {
        if (!confirm("⚠️ Are you sure?")) return;
        try {
            await axios.delete(`${API_URL}/materials/${id}`);
            alert("🗑️ Removed successfully!");
            fetchMaterials();
        } catch (error) {
            alert("Delete failed.");
        }
    };

    // --- 7. SEARCH LOGIC ---
    useEffect(() => {
        const filtered = students.filter(s =>
            s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.roll_no.includes(searchQuery)
        );
        setFilteredStudents(filtered);
    }, [searchQuery, students]);

    const handleMarkChange = (roll_no: string, field: string, value: string) => {
        const updated = students.map(s => s.roll_no === roll_no ? { ...s, [field]: value } : s);
        setStudents(updated);
    };

    // --- 8. SAVE MARKS DATA (MANUAL) ---
    const handleSaveMarks = async () => {
        setIsSaving(true);
        try {
            const savePromises = students.map(student =>
                axios.post(`${API_URL}/marks/sync`, {
                    student_roll_no: student.roll_no,
                    course_code: courseCode,
                    cia1_marks: isLabCourse ? 0 : Number(student.cia1_marks) || 0,
                    cia1_retest: isLabCourse ? 0 : Number(student.cia1_retest) || 0,
                    ia1_marks: isLabCourse ? 0 : Number(student.ia1_marks) || 0,
                    cia2_marks: isLabCourse ? 0 : Number(student.cia2_marks) || 0,
                    cia2_retest: isLabCourse ? 0 : Number(student.cia2_retest) || 0,
                    ia2_marks: isLabCourse ? 0 : Number(student.ia2_marks) || 0,
                    subject_attendance: Number(student.subject_attendance) || 0
                })
            );
            await Promise.all(savePromises);
            alert(`✅ Section ${sectionName} data synced successfully.`);
        } catch (error) {
            console.error("Sync failed:", error);
            alert("Failed to sync data.");
        } finally {
            setIsSaving(false);
        }
    };

    // --- 9. EXCEL PROCESSING LOGIC ---
    const handleExcelProcess = async () => {
        if (!selectedFile) { alert("Select a file!"); return; }
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('course_code', courseCode);
        formData.append('section', sectionName);
        formData.append('entity', markEntity);

        setIsProcessing(true);
        try {
            const res = await axios.post(`${API_URL}/marks/process-excel`, formData);
            setExcelPreview(res.data.preview);
            alert("Excel parsed! Verify the preview table below.");
        } catch (error) {
            alert("Processing failed. Check file format.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleConfirmExcelSync = async () => {
        setIsSaving(true);
        try {
            await axios.post(`${API_URL}/marks/bulk-sync-excel`, {
                course_code: courseCode,
                entity: markEntity,
                data: excelPreview
            });
            alert("🚀 All marks from Excel synced to Database!");
            setExcelPreview([]);
            setSelectedFile(null);
            fetchData(); // Refresh main table
            setActiveAction('marks');
        } catch (error) {
            alert("Bulk sync failed.");
        } finally {
            setIsSaving(false);
        }
    };

    // --- 10. UPLOAD LOGIC (FILES/VIDEOS) ---
    const handleFileUpload = async (type: string, titleId: string, fileInputId: string, isLectureNote: boolean = false) => {
        const fileInput = document.getElementById(fileInputId) as HTMLInputElement;
        const userId = localStorage.getItem('user_id');

        let finalTitle = "";
        if (isLectureNote) {
            finalTitle = selectedTopicName;
        } else {
            const titleInput = document.getElementById(titleId) as HTMLInputElement;
            finalTitle = titleInput?.value || "";
        }

        if (!finalTitle || !fileInput?.files?.[0]) { alert("Required: Enter/Select Title AND a File!"); return; }
        
        const formData = new FormData();
        formData.append('file', fileInput.files[0]); 
        formData.append('course_code', courseCode);
        formData.append('type', type);
        formData.append('title', `${finalTitle} (Unit ${selectedUnit})`);
        formData.append('posted_by', userId!);
        
        setUploading(true);
        try {
            await axios.post(`${API_URL}/materials`, formData);
            alert(`📁 ${type} uploaded!`);
            
            if (!isLectureNote) {
                const titleInput = document.getElementById(titleId) as HTMLInputElement;
                if(titleInput) titleInput.value = ""; 
            }
            fileInput.value = "";
            fetchMaterials();
        } catch (error) { alert("Upload failed."); } finally { setUploading(false); }
    };

    const handleVideoPost = async (e: React.FormEvent) => {
        e.preventDefault();
        const userId = localStorage.getItem('user_id');
        if (!videoData.title || !videoData.url) { alert("Provide both Title and URL!"); return; }
        const formData = new FormData();
        formData.append('course_code', courseCode);
        formData.append('type', 'YouTube Video');
        formData.append('title', `${videoData.title} (Unit ${selectedUnit})`);
        formData.append('url', videoData.url); 
        formData.append('posted_by', userId!);
        setUploading(true);
        try {
            await axios.post(`${API_URL}/materials`, formData);
            alert("🎬 YouTube link shared!");
            setVideoData({ title: '', url: '' });
            fetchMaterials();
        } catch (error) { alert("Failed to post video."); } finally { setUploading(false); }
    };

const handlePostSubAnnouncement = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post(`${API_URL}/announcements`, {
                title: subAnn.title,
                content: subAnn.content,
                type: "Subject", 
                course_code: courseCode.trim().toUpperCase(), // Sends "21AD32A"
                section: sectionName, // Sends "A"
                audience: "Student", // Tags for students
                posted_by: localStorage.getItem('user_id') 
            });
            alert(`📢 Notice broadcasted!`);
            setSubAnn({ title: '', content: '' });
        } catch (error) { alert("Failed to post."); }
    };

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Navbar />
            <div className="container mx-auto px-4 py-8 flex-grow">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <button onClick={() => router.back()} className="flex items-center gap-2 text-blue-900 font-bold hover:underline mb-2">
                            <ArrowLeft size={18} /> Back
                        </button>
                        <h1 className={`text-3xl font-black uppercase ${isLabCourse ? 'text-purple-700' : 'text-blue-900'}`}>
                            {courseCode} Management
                        </h1>
                        <p className="text-gray-500 font-bold text-xs uppercase tracking-widest">Section {sectionName}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button onClick={() => setActiveAction('marks')} className={`px-5 py-2 rounded-lg font-bold flex items-center gap-2 transition ${activeAction === 'marks' ? 'bg-blue-900 text-white shadow-lg' : 'bg-white border text-gray-600'}`}>
                            <UserCheck size={18} /> Attendance & Marks
                        </button>
                        <button onClick={() => setActiveAction('excel')} className={`px-5 py-2 rounded-lg font-bold flex items-center gap-2 transition ${activeAction === 'excel' ? 'bg-green-600 text-white shadow-lg' : 'bg-white border text-gray-600'}`}>
                            <FileSpreadsheet size={18} /> Excel Upload
                        </button>
                        <button onClick={() => setActiveAction('uploads')} className={`px-5 py-2 rounded-lg font-bold flex items-center gap-2 transition ${activeAction === 'uploads' ? 'bg-blue-900 text-white shadow-lg' : 'bg-white border text-gray-600'}`}>
                            <FileUp size={18} /> Uploads & Notices
                        </button>
                    </div>
                </div>

                {/* UNIT SELECTOR BAR (For Uploads) */}
                {activeAction === 'uploads' && (
                    <div className="bg-[#1e3a8a] rounded-xl p-5 mb-8 flex flex-col sm:flex-row items-center justify-between shadow-xl gap-4">
                        <div className="flex items-center gap-3 text-white">
                            <CheckCircle className="text-orange-500" size={24} />
                            <h2 className="font-black uppercase tracking-tighter text-lg">Target Unit Selector:</h2>
                        </div>
                        <div className="flex gap-3">
                            {[1, 2, 3, 4, 5].map((u) => (
                                <button key={u} onClick={() => setSelectedUnit(u)}
                                    className={`w-10 h-10 rounded-lg font-black transition-all ${selectedUnit === u ? 'bg-orange-500 text-white scale-110 shadow-lg' : 'bg-blue-800/50 text-blue-200 hover:bg-blue-700'}`}
                                >
                                    {u}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* TAB 1: MANUAL MARKS TABLE */}
                {activeAction === 'marks' && (
                    <div className="bg-white rounded-xl shadow-md border overflow-hidden animate-in fade-in duration-300">
                        <div className="p-4 bg-gray-50 border-b flex flex-col sm:flex-row justify-between gap-4">
                            <div className="relative w-full sm:w-72">
                                <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                                <input type="text" placeholder="Search Roll No..." className="pl-10 pr-4 py-2 w-full border rounded-lg outline-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                            </div>
                            <button onClick={handleSaveMarks} disabled={isSaving} className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold flex items-center justify-center gap-2">
                                {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Sync Data
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className={`text-white text-[10px] uppercase tracking-wider font-bold ${isLabCourse ? 'bg-purple-700' : 'bg-blue-900'}`}>
                                    <tr>
                                        <th className="p-4">Roll No</th>
                                        <th className="p-4">Name</th>
                                        {!isLabCourse && (
                                            <>
                                                <th className="p-4 text-center">CIA 1</th>
                                                <th className="p-4 text-center bg-blue-800">IA 1</th>
                                                <th className="p-4 text-center">C1 Retest</th>
                                                <th className="p-4 text-center">CIA 2</th>
                                                <th className="p-4 text-center bg-blue-800">IA 2</th>
                                                <th className="p-4 text-center">C2 Retest</th>
                                            </>
                                        )}
                                        <th className="p-4 text-center">Att %</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStudents.map((stu) => (
                                        <tr key={stu.roll_no} className="hover:bg-blue-50 border-b transition text-sm">
                                            <td className="p-4 font-bold text-gray-700">{stu.roll_no}</td>
                                            <td className="p-4 text-gray-800 font-medium">{stu.name}</td>
                                            {!isLabCourse && (
                                                <>
                                                    <td className="p-4 text-center">
                                                        <input type="number" value={stu.cia1_marks ?? ''} onChange={(e) => handleMarkChange(stu.roll_no, 'cia1_marks', e.target.value)} 
                                                        className={`w-14 border rounded p-1 text-center font-bold ${Number(stu.cia1_marks) < 30 && stu.cia1_marks !== '' ? 'bg-red-100 text-red-700 border-red-400' : 'bg-white'}`} />
                                                    </td>
                                                    <td className="p-4 text-center bg-blue-50/50">
                                                        <input type="number" value={stu.ia1_marks ?? ''} onChange={(e) => handleMarkChange(stu.roll_no, 'ia1_marks', e.target.value)} 
                                                        className="w-14 border rounded p-1 text-center font-bold bg-white" />
                                                    </td>
                                                    <td className="p-4 text-center bg-gray-50/50">
                                                        <input type="number" value={stu.cia1_retest ?? ''} onChange={(e) => handleMarkChange(stu.roll_no, 'cia1_retest', e.target.value)} 
                                                        className={`w-14 border rounded p-1 text-center font-bold ${Number(stu.cia1_retest) < 30 && stu.cia1_retest !== '' ? 'bg-red-100 text-red-700 border-red-400' : 'bg-white'}`} />
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <input type="number" value={stu.cia2_marks ?? ''} onChange={(e) => handleMarkChange(stu.roll_no, 'cia2_marks', e.target.value)} 
                                                        className={`w-14 border rounded p-1 text-center font-bold ${Number(stu.cia2_marks) < 30 && stu.cia2_marks !== '' ? 'bg-red-100 text-red-700 border-red-400' : 'bg-white'}`} />
                                                    </td>
                                                    <td className="p-4 text-center bg-blue-50/50">
                                                        <input type="number" value={stu.ia2_marks ?? ''} onChange={(e) => handleMarkChange(stu.roll_no, 'ia2_marks', e.target.value)} 
                                                        className="w-14 border rounded p-1 text-center font-bold bg-white" />
                                                    </td>
                                                    <td className="p-4 text-center bg-gray-50/50">
                                                        <input type="number" value={stu.cia2_retest ?? ''} onChange={(e) => handleMarkChange(stu.roll_no, 'cia2_retest', e.target.value)} 
                                                        className={`w-14 border rounded p-1 text-center font-bold ${Number(stu.cia2_retest) < 30 && stu.cia2_retest !== '' ? 'bg-red-100 text-red-700 border-red-400' : 'bg-white'}`} />
                                                    </td>
                                                </>
                                            )}
                                            <td className="p-4 text-center">
                                                <input type="number" value={stu.subject_attendance ?? ''} onChange={(e) => handleMarkChange(stu.roll_no, 'subject_attendance', e.target.value)} 
                                                className="w-14 border rounded p-1 text-center font-bold" />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* TAB 2: EXCEL UPLOAD WORKFLOW (STEP 1) */}
                {activeAction === 'excel' && (
                    <div className="bg-white p-8 rounded-xl shadow-md border-t-4 border-green-600 animate-in fade-in duration-500">
                        <div className="flex items-center gap-3 mb-6">
                            <FileSpreadsheet className="text-green-600" size={32} />
                            <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">Automated Excel Sync</h2>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 bg-gray-50 p-6 rounded-xl border border-dashed border-gray-300">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-gray-400 mb-3 tracking-widest">1. Select Target Column</label>
                                <select 
                                    value={markEntity} 
                                    onChange={(e) => setMarkEntity(e.target.value)}
                                    className="w-full p-4 border-2 rounded-xl font-bold text-blue-900 focus:border-green-500 outline-none transition shadow-sm"
                                >
                                    <option value="cia1_marks">CIA 1 Marks</option>
                                    <option value="ia1_marks">IA 1 Marks</option>
                                    <option value="cia1_retest">CIA 1 Retest</option>
                                    <option value="cia2_marks">CIA 2 Marks</option>
                                    <option value="ia2_marks">IA 2 Marks</option>
                                    <option value="cia2_retest">CIA 2 Retest</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-[10px] font-black uppercase text-gray-400 mb-3 tracking-widest">2. Choose College Excel File</label>
                                <input 
                                    type="file" 
                                    accept=".xlsx, .xls, .csv" 
                                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                    className="w-full p-3 bg-white border-2 border-dashed rounded-xl cursor-pointer hover:border-green-500 transition text-sm font-medium"
                                />
                            </div>
                        </div>

                        <button 
                            onClick={handleExcelProcess}
                            disabled={isProcessing || !selectedFile}
                            className="w-full bg-green-600 text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-green-700 transition shadow-lg flex items-center justify-center gap-3 disabled:bg-gray-300"
                        >
                            {isProcessing ? <Loader2 className="animate-spin" /> : <RefreshCw size={20} />}
                            Process Excel Data
                        </button>

                        {/* PREVIEW TABLE */}
                        {excelPreview.length > 0 && (
                            <div className="mt-10 border-t pt-8 animate-in slide-in-from-top-4 duration-500">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-black text-gray-500 uppercase text-xs tracking-widest">Extracted Marks Preview</h3>
                                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black">{excelPreview.length} Students Detected</span>
                                </div>
                                <div className="max-h-96 overflow-y-auto rounded-xl border-2 border-gray-100 shadow-inner">
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-100 sticky top-0">
                                            <tr className="text-[10px] font-black uppercase text-gray-500">
                                                <th className="p-4">VH Number</th>
                                                <th className="p-4">Student Name</th>
                                                <th className="p-4 text-center">Score Found</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {excelPreview.map((row, i) => (
                                                <tr key={i} className="border-b last:border-0 text-sm hover:bg-blue-50/30 transition">
                                                    <td className="p-4 font-mono font-bold text-blue-900">{row.vh_no}</td>
                                                    <td className="p-4 text-gray-600 font-medium">{row.name || "N/A"}</td>
                                                    <td className="p-4 text-center">
                                                        <span className="font-black text-green-700 bg-green-100 px-4 py-1 rounded-lg">
                                                            {row.mark}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="mt-8 flex gap-4">
                                    <button 
                                        onClick={() => setExcelPreview([])}
                                        className="flex-1 bg-white border-2 border-gray-200 text-gray-500 py-3 rounded-xl font-bold uppercase tracking-widest hover:bg-gray-50 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handleConfirmExcelSync}
                                        disabled={isSaving}
                                        className="flex-[2] bg-blue-900 text-white py-3 rounded-xl font-black uppercase tracking-widest hover:bg-blue-800 transition shadow-lg flex items-center justify-center gap-2"
                                    >
                                        {isSaving ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                                        Final Sync to Database
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 3: UPLOADS & NOTICES */}
                {activeAction === 'uploads' && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {isLabCourse ? (
                                <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-purple-600 col-span-full md:col-span-1 flex flex-col justify-between min-h-[400px]">
                                    <div>
                                        <div className="flex items-center gap-2 mb-4"><Beaker className="text-purple-600" size={20} /><h3 className="font-bold">Lab Manuals</h3></div>
                                        <input type="text" id="lab-title" placeholder="Manual Name..." className="w-full border p-2 rounded mb-3 text-sm" />
                                        <input type="file" id="lab-file" className="text-xs mb-4 w-full" />
                                    </div>
                                    <button disabled={uploading} onClick={() => handleFileUpload('Lab Manual', 'lab-title', 'lab-file')} className="w-full bg-purple-600 text-white py-3 rounded-lg font-black uppercase text-xs shadow-lg hover:bg-purple-700">
                                        {uploading ? "Uploading..." : `Upload U${selectedUnit}`}
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {/* LECTURE NOTES (TOPIC MANAGEMENT) */}
                                    <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-blue-900 flex flex-col justify-between min-h-[400px]">
                                        <div>
                                            <div className="flex items-center gap-2 mb-4">
                                                <BookOpen className="text-blue-900" size={20} />
                                                <h3 className="font-bold text-sm uppercase">Lecture Notes</h3>
                                            </div>

                                            {/* Topic Input Row */}
                                            <div className="flex gap-1 mb-2">
                                                <input 
                                                    placeholder="Topic name..." 
                                                    className="flex-grow border p-2 rounded text-sm outline-none focus:ring-1 ring-blue-900" 
                                                    value={topicInput} 
                                                    onChange={(e) => setTopicInput(e.target.value)} 
                                                />
                                                <button 
                                                    onClick={handleSaveTopic} 
                                                    className="bg-blue-900 text-white px-3 py-1 rounded font-bold text-[10px] uppercase shadow-sm"
                                                >
                                                    Take
                                                </button>
                                            </div>

                                            {/* Scrollable Topics List */}
                                            <div className="mb-4 bg-gray-50 border rounded-lg p-2 max-h-24 overflow-y-auto">
                                                <p className="text-[9px] font-black text-gray-400 uppercase mb-2 tracking-widest">Added Topics (Unit {selectedUnit})</p>
                                                {syllabusTopics.length > 0 ? syllabusTopics.map((t) => (
                                                    <div key={t.id} className="flex justify-between items-center gap-2 mb-1 bg-white p-1.5 rounded border shadow-sm group">
                                                        <span className="text-[10px] font-bold text-blue-900 truncate">{t.topic_name}</span>
                                                        <button onClick={() => handleDeleteTopic(t.id)} className="text-red-400 hover:text-red-600 transition-colors">
                                                            <Trash2 size={12}/>
                                                        </button>
                                                    </div>
                                                )) : (
                                                    <p className="text-[10px] text-gray-300 italic">No topics added yet.</p>
                                                )}
                                            </div>

                                            {/* Topic Selector for File Attachment */}
                                            <select 
                                                className="w-full border p-2 rounded text-sm mb-4 bg-white font-bold text-blue-900 shadow-inner" 
                                                value={selectedTopicName} 
                                                onChange={(e) => setSelectedTopicName(e.target.value)}
                                            >
                                                <option value="">-- Choose Topic --</option>
                                                {syllabusTopics.map((t: any) => <option key={t.id} value={t.topic_name}>{t.topic_name}</option>)}
                                            </select>

                                            <input type="file" id="notes-file" className="text-[10px] mb-4 w-full" />
                                        </div>
                                        <button disabled={uploading} onClick={() => handleFileUpload('Lecture Notes', '', 'notes-file', true)} className="w-full bg-blue-900 text-white py-3 rounded-lg font-black uppercase text-xs shadow-lg">
                                            {uploading ? "Uploading..." : `Upload U${selectedUnit}`}
                                        </button>
                                    </div>

                                    {/* QUESTION BANK */}
                                    <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-teal-600 flex flex-col justify-between min-h-[400px]">
                                        <div>
                                            <div className="flex items-center gap-2 mb-4"><FileText className="text-teal-600" size={20} /><h3 className="font-bold text-sm uppercase">Question Bank</h3></div>
                                            <input type="text" id="qb-title" placeholder="Title..." className="w-full border p-2 rounded mb-3 text-sm" />
                                            <input type="file" id="qb-file" className="text-[10px] mb-4 w-full" />
                                        </div>
                                        <button disabled={uploading} onClick={() => handleFileUpload('Question Bank', 'qb-title', 'qb-file')} className="w-full bg-teal-600 text-white py-3 rounded-lg font-black uppercase text-xs shadow-lg">
                                            {uploading ? "Uploading..." : `Upload U${selectedUnit}`}
                                        </button>
                                    </div>

                                    {/* ASSIGNMENTS */}
                                    <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-orange-500 flex flex-col justify-between min-h-[400px]">
                                        <div>
                                            <div className="flex items-center gap-2 mb-4"><ClipboardList className="text-orange-500" size={20} /><h3 className="font-bold text-sm uppercase">Assignments</h3></div>
                                            <input type="text" id="assign-title" placeholder="Title..." className="w-full border p-2 rounded mb-3 text-sm" />
                                            <input type="file" id="assign-file" className="text-[10px] mb-4 w-full" />
                                        </div>
                                        <button disabled={uploading} onClick={() => handleFileUpload('Assignment', 'assign-title', 'assign-file')} className="w-full bg-orange-500 text-white py-3 rounded-lg font-black uppercase text-xs shadow-lg">
                                            {uploading ? "Uploading..." : `Assign U${selectedUnit}`}
                                        </button>
                                    </div>

                                    {/* YOUTUBE VIDEOS */}
                                    <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-red-600 flex flex-col justify-between min-h-[400px]">
                                        <div>
                                            <div className="flex items-center gap-2 mb-4"><Youtube className="text-red-600" size={20} /><h3 className="font-bold text-sm uppercase">YouTube Videos</h3></div>
                                            <input type="text" placeholder="Video Title..." className="w-full border p-2 rounded mb-3 text-sm outline-none" value={videoData.title} onChange={(e) => setVideoData({...videoData, title: e.target.value})} />
                                            <input type="text" placeholder="Paste URL here..." className="w-full border p-2 rounded mb-3 text-sm outline-none" value={videoData.url} onChange={(e) => setVideoData({...videoData, url: e.target.value})} />
                                        </div>
                                        <button disabled={uploading} onClick={handleVideoPost} className="w-full bg-red-600 text-white py-3 rounded-lg font-black uppercase text-xs flex items-center justify-center gap-2 hover:bg-red-700 transition shadow-lg">
                                            {uploading ? "Sharing..." : <><PlayCircle size={16}/> Share U{selectedUnit}</>}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* MANAGE UPLOADS TABLE */}
                        <div className="bg-white rounded-xl shadow-lg border border-red-100 overflow-hidden">
                            <div className="p-4 bg-red-50 border-b border-red-100 flex items-center gap-2">
                                <Trash2 size={18} className="text-red-600" />
                                <h3 className="font-bold text-red-800 uppercase text-xs tracking-[0.2em]">Manage Current Uploads</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-500 border-b">
                                        <tr><th className="p-4">Title</th><th className="p-4">Type</th><th className="p-4 text-center">Action</th></tr>
                                    </thead>
                                    <tbody>
                                        {uploadedMaterials.length > 0 ? uploadedMaterials.map((m) => (
                                            <tr key={m.id} className="border-b last:border-0 hover:bg-red-50/30 transition">
                                                <td className="p-4 font-bold text-gray-700 text-sm">{m.title}</td>
                                                <td className="p-4"><span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${m.type === 'YouTube Video' ? 'bg-red-100 text-red-700' : 'bg-gray-200'}`}>{m.type}</span></td>
                                                <td className="p-4 text-center">
                                                    <button onClick={() => handleDelete(m.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition shadow-sm"><Trash2 size={18} /></button>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan={3} className="p-10 text-center text-gray-400 italic">No files uploaded yet.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* POST NOTICE (Restored from code1) */}
                        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-blue-900">
                            <h2 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2"><Megaphone className="text-orange-500" /> Post Notice</h2>
                            <form onSubmit={handlePostSubAnnouncement} className="space-y-4">
                                <input className="w-full p-3 border rounded outline-none" placeholder="Title..." value={subAnn.title} onChange={(e) => setSubAnn({ ...subAnn, title: e.target.value })} required />
                                <textarea className="w-full p-3 border rounded outline-none h-28" placeholder="Message details..." value={subAnn.content} onChange={(e) => setSubAnn({ ...subAnn, content: e.target.value })} required />
                                <button type="submit" className="bg-blue-900 text-white px-8 py-2 rounded-lg font-bold hover:bg-blue-800 transition">Broadcast</button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
            <Footer />
        </div>
    );
}