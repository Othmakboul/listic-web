import React, { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import api from '../lib/api';
// Navbar removed
import { Calendar, FileText, Hash, Users, Award, Globe, Building } from 'lucide-react';
import ExportWidget from '../components/ExportWidget';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

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

const LANG_MAPPING = {
    'en': 'English',
    'fr': 'French',
    'es': 'Spanish',
    'de': 'German',
    'it': 'Italian'
};

function GlobalDashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [yearStart, setYearStart] = useState(2010);
    const [yearEnd, setYearEnd] = useState(new Date().getFullYear());

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const response = await api.get('/global-stats', {
                    params: {
                        start_year: yearStart,
                        end_year: yearEnd
                    }
                });
                setData(response.data.hal);
            } catch (error) {
                console.error("Error fetching global stats:", error);
            } finally {
                setLoading(false);
            }
        };

        // Debounce Fetch
        const timer = setTimeout(() => {
            fetchData();
        }, 500);

        return () => clearTimeout(timer);

    }, [yearStart, yearEnd]); // Re-fetch when years change

    if (loading && !data) return <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
    if (!data) return <div className="text-center p-10">No data available</div>;

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-4 border rounded shadow-lg z-50">
                    <p className="font-bold text-gray-800">{label || payload[0].name}</p>
                    <p className="text-indigo-600 font-semibold">Count: {payload[0].value}</p>
                </div>
            );
        }
        return null;
    };

    // Maps
    const mappedTypes = data.types.map(t => ({
        ...t,
        name: DOC_TYPE_MAPPING[t.name] || t.name
    }));

    const totalLangs = (data.languages || []).reduce((acc, curr) => acc + curr.value, 0);

    const mappedLangs = (data.languages || []).map(l => ({
        ...l,
        name: LANG_MAPPING[l.name] || l.name.toUpperCase()
    })).filter(l => l.value > 0 && (totalLangs > 0 ? (l.value / totalLangs) >= 0.01 : true));

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Global LISTIC Dashboard</h1>
                    <p className="text-gray-600">Overview of laboratory publications, keywords, and document types from HAL.</p>
                </header>

                {/* Filters */}
                <div className="bg-white p-6 rounded-xl shadow-sm mb-8 flex flex-wrap gap-6 items-center justify-between border border-gray-100">
                    <div className="flex flex-wrap gap-6 items-center">
                        <div className="flex items-center gap-2 text-gray-700 font-medium">
                            <Calendar className="w-5 h-5 text-indigo-500" />
                            <span>Range:</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col">
                                <label className="text-xs text-gray-500 mb-1">Start Year</label>
                                <input
                                    type="number"
                                    value={yearStart}
                                    onChange={(e) => setYearStart(parseInt(e.target.value))}
                                    className="border border-gray-300 rounded px-3 py-1 w-24 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                />
                            </div>
                            <span className="text-gray-400 mt-4">—</span>
                            <div className="flex flex-col">
                                <label className="text-xs text-gray-500 mb-1">End Year</label>
                                <input
                                    type="number"
                                    value={yearEnd}
                                    onChange={(e) => setYearEnd(parseInt(e.target.value))}
                                    className="border border-gray-300 rounded px-3 py-1 w-24 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                />
                            </div>
                        </div>
                        {loading && <span className="text-sm text-indigo-500 animate-pulse">Updating data...</span>}
                    </div>

                    <ExportWidget
                        data={data}
                        jsonFilename="listic_global_stats"
                        csvOptions={[
                            { label: "Publication Timeline", data: data?.years, filename: "global_publications_timeline", description: "Yearly counts" },
                            { label: "Document Types", data: data?.types, filename: "global_doc_types", description: "Distribution by type" },
                            { label: "Top Keywords", data: data?.keywords, filename: "global_keywords", description: "Most frequent topics" },
                            { label: "Top Journals", data: data?.journals, filename: "global_journals", description: "Top venues" },
                            { label: "Collaborating Structures", data: data?.structures, filename: "global_structures", description: "Partner labs" },
                        ]}
                    />
                </div>

                {/* Charts Grid - Yearly Publications */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">

                    {/* Yearly Publications */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2">
                        <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-blue-500" /> Publications per Year
                        </h3>
                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={data.years} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="name" stroke="#9ca3af" />
                                    <YAxis stroke="#9ca3af" />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend />
                                    <Line
                                        type="monotone"
                                        dataKey="value"
                                        name="Publications"
                                        stroke="#6366f1"
                                        strokeWidth={3}
                                        dot={{ fill: '#6366f1', r: 4 }}
                                        activeDot={{ r: 8 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Charts Grid - Types and Keywords */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">

                    {/* Document Types */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-green-500" /> Document Types (Top 7)
                        </h3>
                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={(() => {
                                        if (!mappedTypes || mappedTypes.length === 0) return [];
                                        const top6 = mappedTypes.slice(0, 6);
                                        const rest = mappedTypes.slice(6);
                                        const othersCount = rest.reduce((acc, curr) => acc + curr.value, 0);
                                        return [...top6, { name: 'Others', value: othersCount }];
                                    })()}
                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis dataKey="name" stroke="#9ca3af" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={60} />
                                    <YAxis stroke="#9ca3af" />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="value" name="Count" fill="#10b981" radius={[4, 4, 0, 0]}>
                                        {Array.from({ length: 7 }).map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Top Keywords */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                            <Hash className="w-5 h-5 text-purple-500" /> Top Keywords (Top 20)
                        </h3>
                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.keywords.slice(0, 20)} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                                    <XAxis type="number" stroke="#9ca3af" />
                                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} stroke="#9ca3af" />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="value" name="Occurrences" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                </div>

                {/* Charts Grid - Venues and Langs */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">

                    {/* Top Journals & Venues */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                            <Award className="w-5 h-5 text-red-500" /> Top Journals & Venues (Top 8)
                        </h3>
                        <div className="h-[500px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.journals ? data.journals.slice(0, 8) : []} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                                    <XAxis type="number" stroke="#9ca3af" />
                                    <YAxis type="category" dataKey="name" width={300} tick={{ fontSize: 11 }} stroke="#9ca3af" interval={0} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="value" name="Count" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={30} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Language Distribution */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                            <Globe className="w-5 h-5 text-cyan-500" /> Languages
                        </h3>
                        <div className="h-[500px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={mappedLangs}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={120}
                                        fill="#06b6d4"
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    >
                                        {mappedLangs
                                            .map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Top Collaborating Structures (Bar Chart) */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2">
                        <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                            <Building className="w-5 h-5 text-slate-500" /> Top Collaborating Structures (Top 10)
                        </h3>
                        <div className="h-[500px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.structures ? data.structures.slice(0, 10) : []} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                                    <XAxis type="number" stroke="#9ca3af" />
                                    <YAxis type="category" dataKey="name" width={450} tick={{ fontSize: 12 }} stroke="#9ca3af" interval={0} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="value" name="Co-publications" fill="#64748b" radius={[0, 4, 4, 0]} barSize={30} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}

export default GlobalDashboard;
