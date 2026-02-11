'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { FileText, Download, Trash2, ChevronLeft, Loader2, ExternalLink } from 'lucide-react';

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
        if (!confirm("Are you sure you want to permanently delete this report?")) return;

        try {
            const { error: dbError } = await supabase
                .from('faculty_progress_reports')
                .delete()
                .match({ id: id });

            if (dbError) throw dbError;

            const pathParts = pdfUrl.split('/faculty-progress-pdfs/');
            if (pathParts.length > 1) {
                const filePath = pathParts[1];
                await supabase.storage
                    .from('faculty-progress-pdfs')
                    .remove([filePath]);
            }

            setReports((prev) => prev.filter(r => r.id !== id));
            alert("Report deleted successfully.");
            
        } catch (err: any) {
            console.error("Delete failed:", err);
            alert("Delete failed: " + err.message);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Navbar />
            <div className="container mx-auto px-4 py-8 flex-grow">
                <button 
                    onClick={() => router.back()} 
                    className="flex items-center gap-2 text-blue-900 font-black text-xs uppercase mb-6 hover:text-orange-600 transition-colors"
                >
                    <ChevronLeft size={16} /> Back to Dashboard
                </button>

                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                    <div className="bg-blue-900 p-6">
                        <h1 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-3">
                            <FileText /> Generated Progress Reports
                        </h1>
                        <p className="text-blue-200 text-[10px] font-bold uppercase mt-1">History of all uploaded syllabus coverage PDFs</p>
                    </div>

                    <div className="p-6">
                        {loading ? (
                            <div className="flex justify-center py-20">
                                <Loader2 className="animate-spin text-blue-900" size={40} />
                            </div>
                        ) : reports.length === 0 ? (
                            <div className="text-center py-20">
                                <FileText size={48} className="mx-auto text-gray-200 mb-4" />
                                <p className="text-gray-400 font-bold uppercase text-sm">No reports found in your archive.</p>
                                <button 
                                    onClick={() => router.push('/faculty/Progress')}
                                    className="mt-4 text-blue-600 font-black text-xs underline"
                                >
                                    Generate your first report now
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {reports.map((report) => {
                                    // 1. Correct Time Conversion for India (Asia/Kolkata)
                                    const dateObj = new Date(report.created_at);
                                    
                                    // Formatting for display: Day-Month-Year (e.g., 08-02-2026)
                                    const indianDate = dateObj.toLocaleDateString('en-IN', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        timeZone: 'Asia/Kolkata'
                                    }).replace(/\//g, '-');

                                    // Formatting for display: 9:52 PM
                                    const indianTime = dateObj.toLocaleTimeString('en-IN', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: true,
                                        timeZone: 'Asia/Kolkata'
                                    });
                                    
                                    const fileName = `Progress_Report_${indianDate}.pdf`;
                                    
                                    return (
                                        <div key={report.id} className="flex items-center justify-between p-4 border-2 border-gray-50 rounded-xl hover:border-blue-100 transition-all bg-white shadow-sm">
                                            <div className="flex items-center gap-4">
                                                <div className="bg-red-50 p-3 rounded-lg">
                                                    <FileText className="text-red-600" size={24} />
                                                </div>
                                                <div>
                                                    <p className="font-black text-blue-900 text-sm">
                                                        {fileName}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase">
                                                        Generated: {indianDate} | {indianTime}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => handleDownload(report.pdf_url, fileName, report.id)}
                                                    disabled={downloadingId === report.id}
                                                    className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-green-600 hover:text-white transition-all shadow-sm disabled:opacity-50"
                                                    title="Download PDF"
                                                >
                                                    {downloadingId === report.id ? (
                                                        <Loader2 size={18} className="animate-spin" />
                                                    ) : (
                                                        <Download size={18} />
                                                    )}
                                                </button>

                                                <a 
                                                    href={report.pdf_url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-blue-900 hover:text-white transition-all shadow-sm"
                                                    title="View in Browser"
                                                >
                                                    <ExternalLink size={18} />
                                                </a>

                                                <button 
                                                    onClick={() => handleDelete(report.id, report.pdf_url)}
                                                    className="p-2 bg-gray-100 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                                    title="Delete"
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