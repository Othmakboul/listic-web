import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import NetworkGraph from './pages/NetworkGraph';
import ProjectDashboard from './pages/ProjectDashboard';
import useTheme from './lib/useTheme';

function App() {
  const { theme, toggleTheme } = useTheme();

  return (
    <BrowserRouter>
      <div className="min-h-screen transition-colors duration-300 bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-white font-sans selection:bg-cyan-500 selection:text-white">
        <Navbar theme={theme} toggleTheme={toggleTheme} />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/network" element={<NetworkGraph />} />
          <Route path="/projects" element={<ProjectDashboard />} />
          <Route path="/researcher/:id" element={<Dashboard />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
