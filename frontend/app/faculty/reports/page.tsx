'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { 
    FileText, Download, Trash2, ChevronLeft, 
    Loader2, ExternalLink, Eye, Calendar, Clock 
} from 'lucide-react';

export default function ReportsHistory() {
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const router = useRouter();

    const fetchReports = async () => {
        const staffNo = localStorage.getItem('staff_no'); 
        const userId = localStorage.getItem('user_id');

        try {
            const { data, error } = await supabase
                .from('faculty_progress_reports')
                .select('*')
                .eq('faculty_id', staffNo || userId) 
                .order('created_at', { ascending: false });

            if (error) throw error;
            setReports(data || []);
        } catch (err) {
            console.error("Error fetching reports:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, []);

    const handleDownload = async (url: string, filename: string, id: string) => {
        try {
            setDownloadingId(id);
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Download failed:', error);
            alert('Failed to download file.');
        } finally {
            setDownloadingId(null);
        }
    };

    const handleDelete = async (id: string, pdfUrl: string) => {
        if (!confirm("Are you sure you want to permanently delete this report from the history?")) return;

        try {
            // 1. Delete from Database
            const { error: dbError } = await supabase
                .from('faculty_progress_reports')
                .delete()
                .match({ id: id });

            if (dbError) throw dbError;

            // 2. Attempt to delete from Storage if it exists in your bucket
            const pathParts = pdfUrl.split('/faculty-progress-pdfs/');
            if (pathParts.length > 1) {
                const filePath = pathParts[1];
                await supabase.storage
                    .from('faculty-progress-pdfs')
                    .remove([filePath]);
            }

            // 3. Update UI
            setReports((prev) => prev.filter(r => r.id !== id));
            alert("Report deleted successfully.");
            
        } catch (err: any) {
            console.error("Delete failed:", err);
            alert("Delete failed: " + err.message);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-slate-50">
            <Navbar />
            <div className="container mx-auto px-4 py-8 flex-grow">
                {/* Back Button */}
                <button 
                    onClick={() => router.back()} 
                    className="flex items-center gap-2 text-blue-900 font-black text-xs uppercase mb-6 hover:bg-white hover:shadow-sm p-2 rounded-lg transition-all w-fit"
                >
                    <ChevronLeft size={16} /> Back to Progress
                </button>

                <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
                    {/* Header */}
                    <div className="bg-slate-900 p-8 border-b-4 border-orange-500">
                        <div className="flex items-center gap-4">
                            <div className="bg-orange-500 p-3 rounded-2xl text-white">
                                <FileText size={28} />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-white uppercase tracking-tighter">
                                    Report Archive
                                </h1>
                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                                    History of generated syllabus coverage reports
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-24">
                                <Loader2 className="animate-spin text-orange-500 mb-4" size={48} />
                                <p className="text-xs font-black text-slate-400 uppercase">Synchronizing History...</p>
                            </div>
                        ) : reports.length === 0 ? (
                            <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                                <FileText size={64} className="mx-auto text-slate-200 mb-4" />
                                <p className="text-slate-400 font-black uppercase text-sm">No archived reports found.</p>
                                <button 
                                    onClick={() => router.push('/faculty/Progress')}
                                    className="mt-4 bg-blue-900 text-white px-6 py-2 rounded-xl font-black text-xs uppercase hover:bg-orange-600 transition-colors"
                                >
                                    Generate New Report
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {reports.map((report) => {
                                    // INDIAN TIME CONVERSION
                                    const dateObj = new Date(report.created_at);
                                    
                                    const indianDate = dateObj.toLocaleDateString('en-IN', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        timeZone: 'Asia/Kolkata'
                                    });

                                    const indianTime = dateObj.toLocaleTimeString('en-IN', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: true,
                                        timeZone: 'Asia/Kolkata'
                                    });

                                    const displayFileName = report.subject_code 
                                        ? `${report.subject_code}_Progress_${indianDate.replace(/\//g, '-')}`
                                        : `Progress_Report_${indianDate.replace(/\//g, '-')}`;

                                    return (
                                        <div 
                                            key={report.id} 
                                            className="group flex flex-col md:flex-row items-center justify-between p-5 border-2 border-slate-100 rounded-2xl hover:border-blue-900 transition-all bg-white hover:shadow-lg gap-4"
                                        >
                                            <div className="flex items-center gap-5 w-full md:w-auto">
                                                <div className="bg-blue-50 p-4 rounded-2xl group-hover:bg-blue-900 group-hover:text-white transition-colors">
                                                    <FileText size={24} />
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-900 text-sm uppercase tracking-tight">
                                                        {displayFileName}
                                                    </p>
                                                    <div className="flex items-center gap-4 mt-1">
                                                        <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                                                            <Calendar size={12} className="text-orange-500" /> {indianDate}
                                                        </span>
                                                        <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                                                            <Clock size={12} className="text-orange-500" /> {indianTime}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 pt-4 md:pt-0">
                                                {/* VIEW BUTTON */}
                                                <a 
                                                    href={report.pdf_url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-blue-900 hover:text-white transition-all font-black text-[10px] uppercase"
                                                >
                                                    <Eye size={16} /> View
                                                </a>

                                                {/* DOWNLOAD BUTTON */}
                                                <button 
                                                    onClick={() => handleDownload(report.pdf_url, `${displayFileName}.pdf`, report.id)}
                                                    disabled={downloadingId === report.id}
                                                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-green-600 hover:text-white transition-all font-black text-[10px] uppercase disabled:opacity-50"
                                                >
                                                    {downloadingId === report.id ? (
                                                        <Loader2 size={16} className="animate-spin" />
                                                    ) : (
                                                        <Download size={16} />
                                                    )}
                                                    Download
                                                </button>

                                                {/* DELETE BUTTON */}
                                                <button 
                                                    onClick={() => handleDelete(report.id, report.pdf_url)}
                                                    className="p-2 bg-slate-100 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                                    title="Delete Permanent"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
}