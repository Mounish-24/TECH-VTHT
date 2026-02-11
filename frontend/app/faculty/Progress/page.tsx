'use client';
import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation'; // Added for admin view
import axios from 'axios';
import { API_URL } from '@/config';
import { supabase } from '@/lib/supabase';
import { toBlob } from 'html-to-image';
import jsPDF from 'jspdf';
import { Trash2, ShieldAlert } from 'lucide-react';

type UnitProgress = { status: string; start: string; end: string; };
type SectionData = {
    unit_progress: Record<string, UnitProgress>;
    coverage_checklist: Record<string, boolean[]>;
};

type SubjectBlock = {
    id: string;
    semester: string;
    academicYear: string;
    courseCode: string;
    courseTitle: string;
    activeSections: string[];
    sectionData: Record<string, SectionData>;
};

// Sub-component to handle SearchParams safely in Next.js
function ProgressContent() {
    const searchParams = useSearchParams();
    const isAdminView = searchParams.get('adminView') === 'true';
    const targetFacultyId = searchParams.get('facultyId');

    const [faculty, setFaculty] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(true);
    const [subjects, setSubjects] = useState<SubjectBlock[]>([]);
    const [hodRemarks, setHodRemarks] = useState('');
    const reportRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const init = async () => {
            try {
                // Determine which ID to use: Admin target or Logged-in Faculty
                const userId = isAdminView ? targetFacultyId : localStorage.getItem('user_id');
                
                if (!userId) {
                    setLoading(false);
                    return;
                }

                // 1. Fetch Faculty Profile
                const res = await axios.get(`${API_URL}/faculty/${userId}`);
                const facultyData = res.data;
                setFaculty(facultyData);

                // 2. Fetch specific saved data
                const { data: savedData, error: fetchError } = await supabase
                    .from('faculty_progress')
                    .select('*')
                    .eq('staff_no', facultyData.staff_no);

                if (savedData && savedData.length > 0) {
                    const groupedSubjects: Record<string, SubjectBlock> = {};
                    savedData.forEach((record: any) => {
                        const key = record.course_code;
                        if (!groupedSubjects[key]) {
                            groupedSubjects[key] = {
                                id: Math.random().toString(),
                                semester: record.semester || '',
                                academicYear: record.academic_year || '',
                                courseCode: record.course_code || '',
                                courseTitle: record.course_title || '',
                                activeSections: [],
                                sectionData: {}
                            };
                        }
                        if (!groupedSubjects[key].activeSections.includes(record.section)) {
                            groupedSubjects[key].activeSections.push(record.section);
                        }
                        groupedSubjects[key].sectionData[record.section] = {
                            unit_progress: record.unit_progress,
                            coverage_checklist: record.coverage_checklist
                        };
                        if (record.hod_remarks) setHodRemarks(record.hod_remarks);
                    });

                    setSubjects(Object.values(groupedSubjects));
                    setIsEditing(false); // Lock view by default
                } else {
                    // Default empty state if no data exists
                    setSubjects([{
                        id: Math.random().toString(),
                        semester: '', academicYear: '', courseCode: '', courseTitle: '',
                        activeSections: [], sectionData: {}
                    }]);
                    setIsEditing(!isAdminView); // Only allow editing if NOT admin
                }
            } catch (err) {
                console.error("Init failed:", err);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [isAdminView, targetFacultyId]);

    const handleSaveDataOnly = async () => {
        if (isAdminView) return; // Safety check
        // ... (Keep your existing handleSaveDataOnly logic here)
        try {
            for (const sub of subjects) {
              for (const sec of sub.activeSections) {
                const payload = {
                  staff_no: faculty.staff_no,
                  faculty_name: faculty.name,
                  course_code: sub.courseCode,
                  course_title: sub.courseTitle,
                  semester: sub.semester,
                  academic_year: sub.academicYear,
                  section: sec,
                  unit_progress: sub.sectionData[sec].unit_progress,
                  coverage_checklist: sub.sectionData[sec].coverage_checklist,
                  hod_remarks: hodRemarks
                };
                await supabase.from('faculty_progress').upsert(payload, { onConflict: 'staff_no,course_code,section' });
              }
            }
            setIsEditing(false);
            alert('Your details have been saved and locked.');
          } catch (err) {
            console.error(err);
            alert('Error saving data');
          }
    };

    // ... (Keep existing addNewSubject, handleSectionSelect, removeSection, generateAndUploadFullPDF)
    const addNewSubject = () => { if (!isEditing || isAdminView) return; setSubjects([...subjects, { id: Math.random().toString(), semester: '', academicYear: '', courseCode: '', courseTitle: '', activeSections: [], sectionData: {} }]); };
    const handleSectionSelect = (subjectIndex: number, section: string) => {
        if (!isEditing || isAdminView) return;
        const updatedSubjects = [...subjects];
        const targetSub = updatedSubjects[subjectIndex];
        if (targetSub.activeSections.includes(section)) return;
        targetSub.activeSections.push(section);
        targetSub.sectionData[section] = {
            unit_progress: { 'Unit-1': { status: '', start: '', end: '' }, 'Unit-2': { status: '', start: '', end: '' }, 'Unit-3': { status: '', start: '', end: '' }, 'Unit-4': { status: '', start: '', end: '' }, 'Unit-5': { status: '', start: '', end: '' } },
            coverage_checklist: { 'Notes': [false, false, false, false, false], 'Question Bank': [false, false, false, false, false], 'Assignment': [false, false, false, false, false], 'Videos': [false, false, false, false, false], 'YouTube Link': [false, false, false, false, false] }
        };
        setSubjects(updatedSubjects);
    };
    const removeSection = async (subjectIndex: number, sectionToRemove: string) => {
        if (!isEditing || isAdminView) return;
        if (!confirm(`Delete Section ${sectionToRemove}?`)) return;
        try {
            await supabase.from('faculty_progress').delete().eq('staff_no', faculty.staff_no).eq('course_code', subjects[subjectIndex].courseCode).eq('section', sectionToRemove);
            const updatedSubjects = [...subjects];
            updatedSubjects[subjectIndex].activeSections = updatedSubjects[subjectIndex].activeSections.filter(s => s !== sectionToRemove);
            delete updatedSubjects[subjectIndex].sectionData[sectionToRemove];
            setSubjects(updatedSubjects);
        } catch (err) { alert("Failed to delete"); }
    };

    const generateAndUploadFullPDF = async () => {
        if (isEditing || isAdminView) return; // Admin shouldn't trigger uploads
        if (!reportRef.current || !faculty) return;
        try {
          const width = 1100;
          const height = reportRef.current.scrollHeight;
          const imageBlob = await toBlob(reportRef.current, {
            backgroundColor: '#ffffff', pixelRatio: 2, width: width, height: height,
            style: { transform: 'scale(1)', transformOrigin: 'top left', width: `${width}px`, height: `${height}px` },
            filter: (node: HTMLElement) => !(node.classList && node.classList.contains('no-print'))
          });
          if (!imageBlob) return;
          const imgData = await new Promise<string>((res) => {
            const reader = new FileReader();
            reader.onload = () => res(reader.result as string);
            reader.readAsDataURL(imageBlob);
          });
          const pdfWidth = 210;
          const pdfHeight = (height * pdfWidth) / width;
          const finalPdf = new jsPDF('p', 'mm', [pdfWidth, pdfHeight]);
          finalPdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
          const pdfBlob = finalPdf.output('blob');
          const timestamp = Date.now();
          const filePath = `${faculty.staff_no}/report_${timestamp}.pdf`;
          await supabase.storage.from('faculty-progress-pdfs').upload(filePath, pdfBlob, { upsert: true, contentType: 'application/pdf' });
          const { data: urlData } = supabase.storage.from('faculty-progress-pdfs').getPublicUrl(filePath);
          await supabase.from('faculty_progress_reports').insert([{ faculty_id: faculty.staff_no, pdf_url: urlData.publicUrl, created_at: new Date().toISOString() }]);
          alert("PDF generated and stored!");
        } catch (error) { alert("Error generating PDF."); }
      };

    if (loading) return <div className="p-10 text-center font-bold text-blue-600 uppercase tracking-widest">Loading Profile...</div>;

    return (
        <div className="min-h-screen bg-gray-100 p-4">
            {isAdminView && (
                <div className="max-w-5xl mx-auto mb-4 bg-orange-600 text-white p-3 rounded-lg flex items-center justify-center gap-3 shadow-lg animate-pulse">
                    <ShieldAlert size={20} />
                    <span className="font-black uppercase text-sm tracking-widest">Admin Monitoring Mode: View Only</span>
                </div>
            )}

            <div className="max-w-5xl mx-auto overflow-visible">
                <div className="bg-white shadow-2xl p-8 border border-gray-300" ref={reportRef}>
                    {/* Header */}
                    <div className="border-b-4 border-double border-black pb-4 mb-8 text-center">
                        <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-gray-900">
                            Vel Tech High Tech Dr.Rangarajan Dr.Sakunthala Engineering College
                        </h1>
                        <p className="text-[11px] font-bold uppercase tracking-widest mt-1 text-gray-700">An Autonomous Institution · Affiliated to Anna University</p>
                        <h2 className="text-xl font-black underline my-6 uppercase tracking-tighter text-center">Faculty Progress Report</h2>
                        <div className="grid grid-cols-3 gap-4 text-[11px] font-bold text-left px-4">
                            <p className="flex flex-col font-black text-gray-900"><span className="text-[9px] text-gray-500 uppercase">Faculty Name</span>{faculty?.name}</p>
                            <p className="flex flex-col font-black text-gray-900"><span className="text-[9px] text-gray-500 uppercase">Staff Number</span>{faculty?.staff_no}</p>
                            <p className="flex flex-col font-black text-gray-900"><span className="text-[9px] text-gray-500 uppercase">Designation</span>{faculty?.designation}</p>
                        </div>
                    </div>

                    {/* Subjects */}
                    {subjects.map((sub, sIdx) => (
                        <div key={sub.id} className="mb-10 border-2 border-black p-6 rounded-lg bg-white">
                            <h2 className="bg-black text-white px-4 py-1 inline-block text-sm font-bold uppercase mb-4">Subject Block #{sIdx + 1}</h2>
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                {['semester', 'academicYear', 'courseCode', 'courseTitle'].map((field) => (
                                    <div key={field} className="flex flex-col">
                                        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-tighter">{field.replace(/([A-Z])/g, ' $1')}</span>
                                        <input disabled={!isEditing || isAdminView} className="border-b border-black p-1 outline-none text-sm font-medium disabled:bg-gray-50 disabled:text-gray-900" value={(sub as any)[field]} onChange={e => {
                                            const updated = [...subjects]; (updated[sIdx] as any)[field] = e.target.value; setSubjects(updated);
                                        }} />
                                    </div>
                                ))}
                            </div>

                            {isEditing && !isAdminView && (
                                <div className="mb-6 no-print bg-gray-50 p-3 border border-dashed border-gray-400 text-center">
                                    <label className="block text-[10px] font-black mb-2 uppercase">Assign Section:</label>
                                    <div className="flex justify-center gap-4">
                                        {['A', 'B', 'C'].map(s => <button key={s} onClick={() => handleSectionSelect(sIdx, s)} className="border-2 border-black px-4 py-1 font-bold text-xs hover:bg-black hover:text-white transition-all uppercase">Section {s}</button>)}
                                    </div>
                                </div>
                            )}

                            {sub.activeSections.map(sec => (
                                <div key={sec} className="mt-8 border-t-2 border-black pt-4">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="bg-yellow-400 text-black px-3 py-1 text-xs font-black border border-black italic">SECTION {sec}</span>
                                        {isEditing && !isAdminView && (
                                            <button onClick={() => removeSection(sIdx, sec)} className="text-red-600 no-print flex items-center gap-1 font-black text-[10px] uppercase hover:underline"><Trash2 size={14} /> Remove Section</button>
                                        )}
                                    </div>

                                    {/* Progress Table */}
                                    <table className="w-full border-collapse border border-black text-[10px] mb-6 text-center">
                                        <thead className="bg-gray-100"><tr><th className="border border-black p-1">UNIT</th><th className="border border-black p-1">STATUS %</th><th className="border border-black p-1">START DATE</th><th className="border border-black p-1">END DATE</th></tr></thead>
                                        <tbody>
                                            {Object.keys(sub.sectionData[sec].unit_progress).map(unit => (
                                                <tr key={unit}>
                                                    <td className="border border-black p-1 font-bold bg-gray-50">{unit}</td>
                                                    {['status', 'start', 'end'].map(type => (
                                                        <td key={type} className="border border-black p-0">
                                                            <input disabled={!isEditing || isAdminView} type={type === 'status' ? 'text' : 'date'} className="w-full text-center outline-none p-1 disabled:bg-white disabled:text-gray-900" value={(sub.sectionData[sec].unit_progress as any)[unit][type]} onChange={e => {
                                                                const updated = [...subjects]; (updated[sIdx].sectionData[sec].unit_progress as any)[unit][type] = e.target.value; setSubjects(updated);
                                                            }} />
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    {/* Checklist */}
                                    <h4 className="text-[10px] font-bold underline mb-2 uppercase text-center">Course Coverage Checklist</h4>
                                    <table className="w-full border-collapse border border-black text-[10px] mb-4 text-center">
                                        <thead className="bg-gray-100"><tr><th className="border border-black p-1 text-left">Deliverables</th>{['U1', 'U2', 'U3', 'U4', 'U5'].map(u => <th key={u} className="border border-black p-1 w-10">{u}</th>)}</tr></thead>
                                        <tbody>
                                            {Object.entries(sub.sectionData[sec].coverage_checklist).map(([key, vals]) => (
                                                <tr key={key}>
                                                    <td className="border border-black p-1 text-left font-bold bg-gray-50">{key}</td>
                                                    {vals.map((v, i) => (
                                                        <td key={i} className={`border border-black font-bold text-lg ${v ? 'bg-blue-100' : ''} text-center`} onClick={() => { if (!isEditing || isAdminView) return; const updated = [...subjects]; updated[sIdx].sectionData[sec].coverage_checklist[key][i] = !v; setSubjects(updated); }}>{v ? '✓' : ''}</td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ))}
                        </div>
                    ))}

                    {isEditing && !isAdminView && (
                        <div className="no-print mb-10 text-center">
                            <button onClick={addNewSubject} className="bg-blue-600 text-white font-black px-12 py-4 rounded-full hover:bg-blue-700 shadow-xl uppercase text-xs transition-all tracking-widest">+ Add Subject</button>
                        </div>
                    )}

                    <div className="mt-10">
                        <p className="text-[10px] font-black underline uppercase text-center">FACULTY REPORT:</p>
                        <textarea disabled={!isEditing || isAdminView} className="w-full border border-black p-2 h-20 mt-1 text-xs outline-none disabled:bg-gray-50 disabled:text-gray-900" value={hodRemarks} onChange={e => setHodRemarks(e.target.value)} />
                    </div>

                    {/* Signatures */}
                    <div className="mt-20 flex justify-between items-end px-10 pb-4">
                        <div className="text-center w-48 border-t-2 border-black pt-2"><p className="text-[10px] font-black uppercase">Faculty Signature</p></div>
                        <div className="text-center w-48 border-t-2 border-black pt-2"><p className="text-[10px] font-black uppercase">HOD Signature</p></div>
                    </div>

                    {/* Action Buttons: Hidden for Admin */}
                    {!isAdminView && (
                        <div className="mt-12 no-print flex flex-col gap-4 text-center">
                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={handleSaveDataOnly} className="bg-blue-900 text-white font-black py-4 rounded hover:bg-blue-800 uppercase shadow-lg text-sm tracking-widest transition-all">Save All Data</button>
                                <button onClick={() => setIsEditing(true)} className="bg-orange-500 text-white font-black py-4 rounded hover:bg-orange-600 uppercase shadow-lg text-sm tracking-widest transition-all">Edit Details</button>
                            </div>
                            <button onClick={generateAndUploadFullPDF} className={`w-full font-black py-5 rounded uppercase shadow-2xl text-base tracking-widest transition-all ${isEditing ? 'bg-gray-400 cursor-not-allowed text-gray-200' : 'bg-green-700 text-white hover:bg-green-800'}`}>
                                {isEditing ? "Save All Data First to Enable PDF" : "Upload Full Report PDF"}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Wrapping in Suspense because of useSearchParams
export default function ProgressPage() {
    return (
        <Suspense fallback={<div className="p-10 text-center font-bold text-blue-600">Loading...</div>}>
            <ProgressContent />
        </Suspense>
    );
}