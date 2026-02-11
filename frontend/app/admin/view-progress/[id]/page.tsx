'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { FileText, Download, ChevronLeft, Loader2, ExternalLink, UserCheck } from 'lucide-react';

export default function AdminFacultyProgressView() {
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const router = useRouter();
    const params = useParams();
    const facultyId = params.id; // This gets the staff_no from the URL

    useEffect(() => {
        const fetchFacultyReports = async () => {
            try {
                setLoading(true);
                const { data, error } = await supabase
                    .from('faculty_progress_reports')
                    .select('*')
                    .eq('faculty_id', facultyId) 
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setReports(data || []);
            } catch (err) {
                console.error("Error fetching reports:", err);
            } finally {
                setLoading(false);
            }
        };

        if (facultyId) fetchFacultyReports();
    }, [facultyId]);

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
        } finally {
            setDownloadingId(null);
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
                    <ChevronLeft size={16} /> Back to Faculty Registry
                </button>

                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                    <div className="bg-blue-900 p-6">
                        <h1 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-3">
                            <UserCheck /> Faculty Progress: {facultyId}
                        </h1>
                        <p className="text-blue-200 text-[10px] font-bold uppercase mt-1">Admin Monitoring Mode</p>
                    </div>

                    <div className="p-6">
                        {loading ? (
                            <div className="flex justify-center py-20">
                                <Loader2 className="animate-spin text-blue-900" size={40} />
                            </div>
                        ) : reports.length === 0 ? (
                            <div className="text-center py-20">
                                <FileText size={48} className="mx-auto text-gray-200 mb-4" />
                                <p className="text-gray-400 font-bold uppercase text-sm">No reports found for this faculty member.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {reports.map((report) => {
                                    const dateObj = new Date(report.created_at);
                                    const indianDate = dateObj.toLocaleDateString('en-IN', {
                                        day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Kolkata'
                                    }).replace(/\//g, '-');
                                    const indianTime = dateObj.toLocaleTimeString('en-IN', {
                                        hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata'
                                    });
                                    
                                    const fileName = `Progress_Report_${facultyId}_${indianDate}.pdf`;
                                    
                                    return (
                                        <div key={report.id} className="flex items-center justify-between p-4 border-2 border-gray-50 rounded-xl bg-white shadow-sm">
                                            <div className="flex items-center gap-4">
                                                <div className="bg-red-50 p-3 rounded-lg"><FileText className="text-red-600" size={24} /></div>
                                                <div>
                                                    <p className="font-black text-blue-900 text-sm">{fileName}</p>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase">Generated: {indianDate} | {indianTime}</p>
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => handleDownload(report.pdf_url, fileName, report.id)}
                                                    disabled={downloadingId === report.id}
                                                    className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-green-600 hover:text-white transition-all disabled:opacity-50"
                                                >
                                                    {downloadingId === report.id ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                                                </button>
                                                <a href={report.pdf_url} target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-blue-900 hover:text-white transition-all"><ExternalLink size={18} /></a>
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