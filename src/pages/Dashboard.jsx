import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../lib/api';
import { ArrowLeft, BookOpen, Layers, Award, ExternalLink, Calendar } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts';
import { motion } from 'framer-motion';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Dashboard() {
    const { id } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        api.get(`/researcher/${id}`)
            .then(res => {
                setData(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setError("Failed to load researcher data.");
                setLoading(false);
            });
    }, [id]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );

    if (error) return <div className="p-10 text-center text-red-500">{error}</div>;

    const { profile, stats } = data;
    const hal = stats.hal;
    const dblp = stats.dblp;

    // Prepare Chart Data
    const yearsMap = {};

    // Merge years from HAL and DBLP (taking max to avoid double counting if duplicate, or sum if different sources. 
    // Comparing is hard, let's prioritize HAL for "Complete" years if available, or merge.)
    // Strategy: Use HAL as base, fallback to DBLP if HAL empty.
    // Actually, let's show HAL stats primarily if available as it's often richer for French labs.

    const sourceStats = hal.found ? hal : dblp;

    const yearData = Object.entries(sourceStats.years_distribution || {})
        .map(([year, count]) => ({ year, count }))
        .sort((a, b) => a.year - b.year);

    // Doc Type Mapping - Full Descriptive Names
    const DOC_TYPE_MAPPING = {
        'ART': 'Journal Article',
        'COMM': 'Conference Paper',
        'OUV': 'Book',
        'COUV': 'Book Chapter',
        'DOUV': 'Book Direction / Proceedings',
        'PATENT': 'Patent',
        'OTHER': 'Other Publication',
        'UNDEFINED': 'Undefined',
        'THESE': 'Thesis',
        'HDR': 'Habilitation (HDR)',
        'REPORT': 'Report',
        'POSTER': 'Poster',
        'VIDEO': 'Video',
        'SOFTWARE': 'Software',
        'LECTURE': 'Lecture',
        'MAP': 'Map',
        'IMG': 'Image',
        'SON': 'Sound',
        'PRESCONF': 'Keynote / Invited Talk',
        'CREPORT': 'Research Report',
        'ETHESE': 'Thesis (Electronic)',
        'MEM': 'Student Memoir',
        'PROCEEDINGS': 'Proceedings',
        'ISSUE': 'Special Issue',
        'BLOG': 'Blog Post',
        'NOTICE': 'Encyclopedia Entry',
        'TRAD': 'Translation'
    };

    const typeData = Object.entries(sourceStats.types_distribution || {})
        .map(([name, value]) => ({
            name: DOC_TYPE_MAPPING[name] || name, // Use mapped name or original code
            value
        }));

    const totalPubs = sourceStats.total_publications || 0;

    return (
        <div className="max-w-7xl mx-auto px-6 pb-20">
            <Link to="/" className="inline-flex items-center space-x-2 text-slate-500 hover:text-blue-600 mb-6 transition">
                <ArrowLeft className="w-4 h-4" /> <span>Back to Researchers</span>
            </Link>

            {/* Header Profile */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-8 mb-8 flex flex-col md:flex-row items-center md:items-start gap-8 bg-white"
            >
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                    {profile.name.charAt(0)}
                </div>
                <div className="flex-1 text-center md:text-left">
                    <h1 className="text-3xl font-bold text-slate-800 mb-2">{profile.name}</h1>
                    <div className="flex flex-wrap justify-center md:justify-start gap-4 text-slate-500 mb-4">
                        {profile.category && <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-sm font-medium">{profile.category.replace('_', ' ')}</span>}
                        {profile.office && <span className="flex items-center gap-1"><Layers className="w-4 h-4" /> {profile.office}</span>}
                    </div>
                    {profile.url_listic && (
                        <a href={profile.url_listic} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center justify-center md:justify-start gap-1">
                            View Lab Profile <ExternalLink className="w-3 h-3" />
                        </a>
                    )}
                </div>

                {/* Key Stats Cards */}
                <div className="flex gap-4">
                    <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-100 min-w-[120px]">
                        <div className="text-3xl font-bold text-blue-600">{totalPubs}</div>
                        <div className="text-xs text-slate-400 uppercase tracking-widest font-semibold">Publications</div>
                    </div>
                    <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-100 min-w-[120px]">
                        <div className="text-3xl font-bold text-emerald-600">{yearData.length > 0 ? Math.max(...yearData.map(y => y.count)) : 0}</div>
                        <div className="text-xs text-slate-400 uppercase tracking-widest font-semibold">Peak Year</div>
                    </div>
                </div>
            </motion.div>

            {/* Visualizations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">

                {/* Timeline */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="glass-card p-6 bg-white"
                >
                    <h3 className="text-lg font-bold text-slate-700 mb-6 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-500" /> Publication Timeline
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={yearData}>
                                <defs>
                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Area type="monotone" dataKey="count" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCount)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Document Types */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="glass-card p-6 bg-white"
                >
                    <h3 className="text-lg font-bold text-slate-700 mb-6 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-emerald-500" /> Document Types
                    </h3>
                    <div className="h-64 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={typeData}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {typeData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            </div>

            {/* Keywords Cloud & Recent Pubs & Collaborators & Venues */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                {/* Keywords */}
                {sourceStats.top_keywords && Object.keys(sourceStats.top_keywords).length > 0 && (
                    <div className="lg:col-span-1 glass-card p-6 bg-white">
                        <h3 className="text-lg font-bold text-slate-700 mb-4">Research Topics</h3>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(sourceStats.top_keywords).map(([keyword, count], i) => (
                                <span
                                    key={i}
                                    className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs border border-blue-100"
                                    style={{ fontSize: Math.min(12 + count * 0.5, 16) }}
                                >
                                    {keyword}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Collaborators */}
                <div className="lg:col-span-2 glass-card p-6 bg-white">
                    <h3 className="text-lg font-bold text-slate-700 mb-4">Top Collaborators</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {sourceStats.top_collaborators && Object.entries(sourceStats.top_collaborators).slice(0, 10).map(([name, count], i) => (
                            <div key={i} className="flex justify-between items-center p-2 rounded hover:bg-slate-50 border-b border-slate-50 last:border-0">
                                <span className="font-medium text-slate-700 truncate" title={name}>{name}</span>
                                <span className="text-xs font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded-full">{count} Papiers</span>
                            </div>
                        ))}
                        {(!sourceStats.top_collaborators || Object.keys(sourceStats.top_collaborators).length === 0) && (
                            <div className="text-slate-400 italic">No collaborator info available.</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Venues & Recent Pubs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Venues */}
                <div className="glass-card p-6 bg-white">
                    <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <Award className="w-5 h-5 text-purple-500" /> Top Venues & Journals
                    </h3>
                    <div className="space-y-3">
                        {(sourceStats.top_venues || sourceStats.top_journals) &&
                            Object.entries(sourceStats.top_venues || sourceStats.top_journals || {})
                                .sort((a, b) => b[1] - a[1]) // Sort desc
                                .slice(0, 8)
                                .map(([name, count], i) => (
                                    <div key={i} className="flex gap-3 items-center">
                                        <div className="w-6 h-6 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 font-bold text-xs shrink-0">
                                            {i + 1}
                                        </div>
                                        <div className="flex-1 text-sm text-slate-700 font-medium truncate" title={name}>{name}</div>
                                        <div className="text-sm text-slate-500 font-mono bg-slate-100 px-2 rounded">{count}</div>
                                    </div>
                                ))}
                        {(!sourceStats.top_venues && !sourceStats.top_journals) && (
                            <div className="text-slate-400 italic">No venue info available.</div>
                        )}
                    </div>
                </div>

                {/* Recent Pubs */}
                <div className="glass-card p-6 bg-white">
                    <h3 className="text-lg font-bold text-slate-700 mb-4">Latest Publications</h3>
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {sourceStats.recent_publications?.map((pub, i) => (
                            <div key={i} className="flex gap-4 items-start p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-blue-200 transition">
                                <div className="mt-1 min-w-[40px] text-center">
                                    <span className="block text-sm font-bold text-slate-700">{pub.year || pub.producedDateY_i}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <a href={pub.url || `https://scholar.google.com/scholar?q=${encodeURIComponent(pub.title || pub.title_s?.[0])}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block font-medium text-slate-800 hover:text-blue-600 truncate transition mb-1"
                                        title={pub.title || pub.title_s?.[0]}
                                    >
                                        {pub.title || pub.title_s?.[0]}
                                    </a>
                                    <div className="text-xs text-slate-500 truncate">{pub.venue || pub.journalTitle_s}</div>
                                </div>
                            </div>
                        ))}
                        {(!sourceStats.recent_publications || sourceStats.recent_publications.length === 0) && (
                            <div className="text-slate-400 italic">No recent publications found.</div>
                        )}
                    </div>
                </div>
            </div>

            {!hal.found && !dblp.found && (
                <div className="mt-8 p-4 bg-yellow-50 text-yellow-700 rounded-lg text-center">
                    We couldn't find detailed statistics for this researcher in public databases (HAL/DBLP).
                </div>
            )}

        </div>
    );
}
