import React, { useState, useRef, useEffect } from 'react';
import { Download, FileJson, FileSpreadsheet, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { downloadJSON, downloadCSV } from '../lib/exportUtils';

export default function ExportWidget({ data, jsonFilename, csvOptions = [], forceDark = false }) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);

    const toggleOpen = () => setIsOpen(!isOpen);

    // Close when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [menuRef]);

    const containerClasses = forceDark
        ? "bg-slate-800 border-slate-700 text-slate-200"
        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200";

    const itemHoverClasses = forceDark
        ? "hover:bg-slate-700"
        : "hover:bg-slate-100 dark:hover:bg-slate-700";

    return (
        <div className="relative z-50" ref={menuRef}>
            <button
                onClick={toggleOpen}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-sm border transition-all duration-300 font-medium text-sm
                    ${forceDark
                        ? 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border-slate-700'
                        : 'bg-white hover:bg-slate-50 text-indigo-600 border-indigo-100'
                    }`}
            >
                {isOpen ? <X className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                <span>Export</span>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className={`absolute right-0 mt-2 w-72 rounded-xl shadow-xl border overflow-hidden p-2 ${containerClasses}`}
                    >
                        <div className="flex flex-col gap-1">
                            <div className="px-3 py-2 text-xs font-bold uppercase opacity-50 tracking-wider">
                                Export Data
                            </div>

                            {/* JSON Export */}
                            <button
                                onClick={() => {
                                    downloadJSON(data, jsonFilename || 'export');
                                    setIsOpen(false);
                                }}
                                className={`flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors w-full text-left ${itemHoverClasses}`}
                            >
                                <div className={`p-2 rounded-md ${forceDark ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-600'}`}>
                                    <FileJson className="w-4 h-4" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-semibold">Complete Dataset (JSON)</span>
                                    <span className="text-xs opacity-70">Full structured data</span>
                                </div>
                            </button>

                            {/* CSV Options */}
                            {csvOptions.length > 0 && (
                                <>
                                    <div className={`h-px my-1 mx-2 ${forceDark ? 'bg-slate-700' : 'bg-slate-100 dark:bg-slate-700'}`} />
                                    {csvOptions.map((opt, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                downloadCSV(opt.data, opt.filename || `export_${idx}`);
                                                setIsOpen(false);
                                            }}
                                            className={`flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors w-full text-left ${itemHoverClasses}`}
                                        >
                                            <div className={`p-2 rounded-md ${forceDark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-green-100 text-green-600'}`}>
                                                <FileSpreadsheet className="w-4 h-4" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-semibold">{opt.label || 'Export CSV'}</span>
                                                <span className="text-xs opacity-70">{opt.description || 'Table format'}</span>
                                            </div>
                                        </button>
                                    ))}
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
