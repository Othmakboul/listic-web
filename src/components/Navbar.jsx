import { Link } from 'react-router-dom';
import { Network, Sun, Moon } from 'lucide-react';

export default function Navbar({ theme, toggleTheme }) {
    return (
        <nav className="sticky top-0 z-50 glass-card dark:glass-card-dark bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 m-4 mb-8 rounded-2xl shadow-sm">
            <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                <Link to="/" className="flex items-center space-x-3 text-2xl font-bold bg-gradient-to-r from-blue-600 to-emerald-500 dark:from-blue-400 dark:to-emerald-400 bg-clip-text text-transparent">
                    <Network className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    <span>LISTIC Vision</span>
                </Link>
                <div className="flex items-center space-x-6 font-medium text-slate-700 dark:text-gray-200">
                    <Link to="/" className="hover:text-emerald-500 dark:hover:text-emerald-400 transition">Researchers</Link>
                    <Link to="/projects" className="hover:text-emerald-500 dark:hover:text-emerald-400 transition">Projects</Link>
                    <Link to="/network" className="hover:text-emerald-500 dark:hover:text-emerald-400 transition">Network Map</Link>

                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition focus:outline-none"
                        aria-label="Toggle Theme"
                    >
                        {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>
                </div>
            </div>
        </nav>
    );
}
