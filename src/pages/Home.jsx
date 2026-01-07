import { useEffect, useState } from 'react';
import api from '../lib/api';
import { Link } from 'react-router-dom';
import { Search, User, Mail, Phone, Building } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Home() {
    const [researchers, setResearchers] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/researchers')
            .then(res => {
                setResearchers(res.data);
                setFiltered(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    useEffect(() => {
        const q = query.toLowerCase();
        setFiltered(researchers.filter(r =>
            r.name.toLowerCase().includes(q) ||
            (r.email && r.email.toLowerCase().includes(q))
        ));
    }, [query, researchers]);

    return (
        <div className="max-w-7xl mx-auto px-6 pb-20">
            <div className="text-center mb-12">
                <h1 className="text-5xl font-extrabold text-slate-800 mb-4">
                    Discover <span className="text-blue-600">Research</span> Excellence
                </h1>
                <p className="text-slate-500 text-lg">Explore the profiles and impact of LISTIC laboratory members.</p>

                <div className="mt-8 relative max-w-xl mx-auto">
                    <Search className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        className="w-full pl-12 pr-4 py-3 rounded-full border border-slate-200 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                        placeholder="Search researchers..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="text-center text-slate-400">Loading researchers...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map((r, i) => (
                        <motion.div
                            key={r._unique_id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                        >
                            <Link to={`/researcher/${r._unique_id}`} className="block group">
                                <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl border border-slate-100 transition-all duration-300 transform group-hover:-translate-y-1">
                                    <div className="flex items-center space-x-4 mb-4">
                                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl">
                                            {r.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 text-lg group-hover:text-blue-600 transition">{r.name}</h3>
                                            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-500 uppercase tracking-wide">
                                                {r.category?.replace('_', ' ')}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-2 text-sm text-slate-500">
                                        {r.email && (
                                            <div className="flex items-center space-x-2">
                                                <Mail className="w-4 h-4" />
                                                <span className="truncate">{r.email.replace(/ -@- | –@– | @ /g, '@')}</span>
                                            </div>
                                        )}
                                        {r.phone && (
                                            <div className="flex items-center space-x-2">
                                                <Phone className="w-4 h-4" />
                                                <span className="truncate">{Array.isArray(r.phone) ? r.phone[0] : r.phone}</span>
                                            </div>
                                        )}
                                        {r.office && (
                                            <div className="flex items-center space-x-2">
                                                <Building className="w-4 h-4" />
                                                <span>{r.office}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
