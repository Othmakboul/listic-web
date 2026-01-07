import { useState, useEffect } from 'react';
import { Search, Database, Users, Calendar, Award, FileText, BarChart2 } from 'lucide-react';
import ExportWidget from '../components/ExportWidget';
import api from '../lib/api';

export default function ProjectDashboard() {
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        api.get('/projects').then(res => setProjects(res.data)).catch(console.error);
    }, []);

    const handleProjectClick = async (project) => {
        setSelectedProject(project);
        setStats(null);
        setLoading(true);
        try {
            const uid = project._unique_id || project.NOM;
            const res = await api.get(`/project/${uid}`);
            setStats(res.data.stats);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const filteredProjects = projects.filter(p =>
        p.NOM.toLowerCase().includes(filter.toLowerCase()) ||
        (p['MOTS CLÉS'] && p['MOTS CLÉS'].toLowerCase().includes(filter.toLowerCase()))
    );

    return (
        <div className="flex h-screen bg-slate-900 text-white overflow-hidden font-sans">
            {/* Sidebar List */}
            <div className="w-1/3 max-w-sm border-r border-slate-800 flex flex-col glass-effect">
                <div className="p-6 border-b border-slate-800">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-4">
                        LISTIC Projects
                    </h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search projects..."
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder-slate-500 text-slate-200"
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {filteredProjects.map(p => (
                        <div
                            key={p._unique_id || p.NOM}
                            onClick={() => handleProjectClick(p)}
                            className={`p-4 rounded-xl cursor-pointer transition-all duration-200 border ${selectedProject === p
                                ? 'bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                                : 'bg-slate-800/50 border-slate-700 hover:border-slate-600 hover:bg-slate-800'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h3 className={`font-bold ${selectedProject === p ? 'text-emerald-400' : 'text-slate-200'}`}>
                                    {p.NOM}
                                </h3>
                                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-700">
                                    {p.type || 'Project'}
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                                {p['MOTS CLÉS'] || 'No keywords specified'}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black">
                {selectedProject ? (
                    <div className="p-8 max-w-5xl mx-auto space-y-8">
                        {/* Header */}
                        <div className="glass-card-dark p-8 rounded-3xl border border-slate-700/50 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>

                            <div className="relative z-10">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3 mb-2 text-emerald-400 font-mono text-sm">
                                        <Database className="w-4 h-4" />
                                        <span>{selectedProject.type || 'Research Project'}</span>
                                        {selectedProject['PÉRIODE'] && (
                                            <>
                                                <span className="text-slate-600">•</span>
                                                <span className="text-slate-400">{selectedProject['PÉRIODE']}</span>
                                            </>
                                        )}
                                    </div>
                                    <ExportWidget
                                        data={{ project: selectedProject, stats }}
                                        jsonFilename={`${selectedProject.NOM}_report`}
                                        forceDark={true}
                                        csvOptions={[
                                            {
                                                label: "Detected Publications",
                                                data: stats?.hal?.recent_publications,
                                                filename: `${selectedProject.NOM}_publications`,
                                                description: "List of found papers"
                                            },
                                            {
                                                label: "Contributors",
                                                data: stats?.hal?.top_authors ? Object.entries(stats.hal.top_authors).map(([name, count]) => ({ name, count })) : [],
                                                filename: `${selectedProject.NOM}_contributors`,
                                                description: "Top authors"
                                            }
                                        ]}
                                    />
                                </div>
                                <h1 className="text-5xl font-bold text-white tracking-tight mb-4">
                                    {selectedProject.NOM}
                                </h1>
                                <p className="text-lg text-slate-300 leading-relaxed max-w-3xl">
                                    {selectedProject['MOTS CLÉS']}
                                </p>

                                <div className="grid grid-cols-2 gap-6 mt-8">
                                    {selectedProject['PARTENAIRES'] && (
                                        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                                            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                                                <Users className="w-3 h-3" /> Partners
                                            </div>
                                            <p className="text-slate-200 text-sm">
                                                {selectedProject['PARTENAIRES']}
                                            </p>
                                        </div>
                                    )}
                                    {selectedProject['FINANCEURS'] && (
                                        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                                            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                                                <Award className="w-3 h-3" /> Funding
                                            </div>
                                            <p className="text-slate-200 text-sm">
                                                {selectedProject['FINANCEURS']}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Analysis Section */}
                        <div className="grid md:grid-cols-3 gap-6">
                            {/* Key Stats */}
                            <div className="md:col-span-1 space-y-6">
                                <div className="glass-card-dark p-6 rounded-2xl border border-slate-800">
                                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <BarChart2 className="w-4 h-4" /> Impact Analysis
                                    </h3>
                                    {loading ? (
                                        <div className="animate-pulse space-y-3">
                                            <div className="h-20 bg-slate-800 rounded-lg"></div>
                                        </div>
                                    ) : stats && stats.hal && stats.hal.found ? (
                                        <div className="text-center py-4">
                                            <div className="text-5xl font-bold text-white mb-1">
                                                {stats.hal.total_publications}
                                            </div>
                                            <div className="text-sm text-emerald-400 font-medium">Found Publications</div>
                                            <p className="text-xs text-slate-500 mt-2">
                                                Matches found via HAL Open API based on project acronym.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-slate-500 text-sm">
                                            No public data found for this acronym.
                                        </div>
                                    )}
                                </div>

                                {/* Top Contributors */}
                                {stats && stats.hal && stats.hal.top_authors && (
                                    <div className="glass-card-dark p-6 rounded-2xl border border-slate-800">
                                        <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-4">
                                            Top Contributors <span className="text-slate-600 block text-[10px] normal-case mt-0.5">(Based on detected project publications)</span>
                                        </h3>
                                        <div className="space-y-3">
                                            {Object.entries(stats.hal.top_authors).slice(0, 5).map(([name, count], i) => (
                                                <div key={i} className="flex justify-between items-center text-sm">
                                                    <span className="text-slate-300 w-full truncate pr-2">{name}</span>
                                                    <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-400 text-xs font-mono font-bold whitespace-nowrap" title={`${count} Publications associated with this project`}>
                                                        {count} Pubs
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Recent Publications */}
                            <div className="md:col-span-2 space-y-6">
                                {stats && stats.hal && stats.hal.recent_publications && (
                                    <div className="glass-card-dark p-6 rounded-2xl border border-slate-800">
                                        <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-6 flex items-center gap-2">
                                            <FileText className="w-4 h-4" /> Recent Activity
                                        </h3>
                                        <div className="space-y-4">
                                            {stats.hal.recent_publications.map((doc, i) => (
                                                <div key={i} className="group p-4 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-emerald-500/30 transition-colors">
                                                    <div className="flex justify-between items-start gap-4">
                                                        <div>
                                                            <h4 className="font-semibold text-slate-200 group-hover:text-emerald-400 transition-colors leading-snug">
                                                                {doc.title_s && doc.title_s[0]}
                                                            </h4>
                                                            <p className="text-xs text-slate-500 mt-2 flex items-center gap-2">
                                                                <Calendar className="w-3 h-3" /> {doc.producedDateY_i}
                                                                {doc.journalTitle_s && (
                                                                    <>
                                                                        <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                                                                        <span>{doc.journalTitle_s}</span>
                                                                    </>
                                                                )}
                                                            </p>
                                                        </div>
                                                        <span className="text-[10px] px-2 py-1 bg-slate-800 rounded text-slate-400 uppercase tracking-wide">
                                                            HAL
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500">
                        <Database className="w-16 h-16 mb-4 opacity-20" />
                        <p className="text-lg">Select a project to view its intelligence report.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
