import { useRef, useState, useEffect, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import api from '../lib/api';
import { Search } from 'lucide-react';

export default function NetworkGraph() {
    const fgRef = useRef();
    const [graphData, setGraphData] = useState({
        nodes: [
            { id: 'root', name: 'LISTIC', val: 20, color: '#ef4444', type: 'root' } // Red for global root
        ],
        links: []
    });
    const [loading, setLoading] = useState(false);
    const [expandedNodes, setExpandedNodes] = useState(new Set());
    const [info, setInfo] = useState("Click on the LISTIC node to start.");
    const [researcherCache, setResearcherCache] = useState({}); // Cache for researcher details

    useEffect(() => {
        if (fgRef.current) {
            // Increase repulsion significantly to separate sibling nodes
            fgRef.current.d3Force('charge').strength(-1500);
            fgRef.current.d3Force('link').distance(100);
            fgRef.current.d3Force('collide', fgRef.current.d3Force('collide') || undefined); // Ensure collide might be active if needed, but charge usually handles it.
        }
    }, [graphData]); // Re-run when graph data changes to ensure forces apply new nodes

    // Helper to add nodes safely
    // ... (keeping existing code, but ensure we don't duplicate lines around) ...

    /* ... later in return statement ... */

    const addNodesAndLinks = (sourceNodeId, newNodes, newLinks) => {
        setGraphData(prev => {
            const existingNodeIds = new Set(prev.nodes.map(n => n.id));
            const filteredNewNodes = newNodes.filter(n => !existingNodeIds.has(n.id));

            // Avoid duplicate links
            const existingLinkKeys = new Set(prev.links.map(l => `${l.source.id || l.source}-${l.target.id || l.target}`));
            const filteredNewLinks = newLinks.filter(l => !existingLinkKeys.has(`${l.source}-${l.target}`));

            return {
                nodes: [...prev.nodes, ...filteredNewNodes],
                links: [...prev.links, ...filteredNewLinks]
            };
        });
    };

    const handleNodeClick = useCallback(async (node) => {
        if (expandedNodes.has(node.id)) {
            setInfo(`Already exploring ${node.name}...`);
            return;
        }

        const { id, type, name } = node;
        setExpandedNodes(prev => new Set(prev).add(id));

        // 1. Root Expansion: LISTIC -> Chercheurs & Projets
        if (type === 'root') {
            const newNodes = [
                { id: 'group-researchers', name: 'Chercheurs', val: 15, color: '#3b82f6', type: 'group_researchers' },
                { id: 'group-projects', name: 'Projets', val: 15, color: '#10b981', type: 'group_projects_global' }
            ];
            const newLinks = newNodes.map(n => ({ source: id, target: n.id }));
            addNodesAndLinks(id, newNodes, newLinks);
            setInfo("Expanded LISTIC. Choose Researchers or Projects.");
            return;
        }

        // 2. Global Projects Expansion
        if (type === 'group_projects_global') {
            setLoading(true);
            try {
                const res = await api.get('/projects');
                const projects = res.data;

                // Group by type (Nationaux, Internationaux...)
                const types = [...new Set(projects.map(p => p.type || 'Autres'))];

                const newNodes = types.map(t => ({
                    id: `proj-type-${t}`,
                    name: t,
                    val: 10,
                    color: '#10b981', // Emerald
                    type: 'project_category',
                    raw_type: t
                }));

                const newLinks = newNodes.map(n => ({ source: id, target: n.id }));
                addNodesAndLinks(id, newNodes, newLinks);

                // Cache projects
                const cacheUpdate = {};
                projects.forEach(p => {
                    const t = p.type || 'Autres';
                    if (!cacheUpdate[t]) cacheUpdate[t] = [];
                    cacheUpdate[t].push(p);
                });

                // Merge into researcherCache (reusing this state for generic caching)
                setResearcherCache(prev => ({ ...prev, ...cacheUpdate }));

                setInfo("Expanded Projects. Choose a category.");
            } catch (e) {
                console.error(e);
                setInfo("Error loading projects.");
            } finally {
                setLoading(false);
            }
            return;
        }

        // 2.5 Project Category Expansion
        if (type === 'project_category') {
            const catProjects = researcherCache[node.raw_type] || [];

            const newNodes = catProjects.map(p => ({
                id: p._unique_id || `proj-${p.NOM}`,
                name: p.NOM,
                val: 8,
                color: '#34d399', // Lighter emerald
                type: 'item_project_global',
                data: p
            }));

            const newLinks = newNodes.map(n => ({ source: id, target: n.id }));
            addNodesAndLinks(id, newNodes, newLinks);
            setInfo(`Showing ${name} projects.`);
            return;
        }

        // 3. Researchers Group Expansion -> Categories
        if (type === 'group_researchers') {
            setLoading(true);
            try {
                const res = await api.get('/researchers');
                const researchers = res.data;

                // Extract categories
                const categories = [...new Set(researchers.map(r => r.category || 'Uncategorized'))];

                const newNodes = categories.map(cat => ({
                    id: `cat-${cat}`,
                    name: cat,
                    val: 12,
                    color: '#8b5cf6', // Violet
                    type: 'category',
                    raw_category: cat
                }));

                const newLinks = newNodes.map(n => ({ source: id, target: n.id }));
                addNodesAndLinks(id, newNodes, newLinks);

                // Store all researchers in cache to use when clicking category
                const cacheUpdate = {};
                researchers.forEach(r => {
                    const cat = r.category || 'Uncategorized';
                    if (!cacheUpdate[cat]) cacheUpdate[cat] = [];
                    cacheUpdate[cat].push(r);
                });
                setResearcherCache(prev => ({ ...prev, ...cacheUpdate }));

                setInfo("Expanded Researchers. Click a category.");
            } catch (err) {
                console.error(err);
                setInfo("Error loading researchers.");
            } finally {
                setLoading(false);
            }
            return;
        }

        // 4. Category Expansion -> Specific Researchers
        if (type === 'category') {
            const categoryResearchers = researcherCache[node.raw_category] || [];

            const newNodes = categoryResearchers.map(r => ({
                id: r._unique_id,
                name: r.name,
                val: 8,
                color: '#60a5fa', // Lighter blue
                type: 'researcher',
                data: r
            }));

            const newLinks = newNodes.map(n => ({ source: id, target: n.id }));
            addNodesAndLinks(id, newNodes, newLinks);
            setInfo(`Showing researchers in ${name}.`);
            return;
        }

        // 5. Researcher Expansion -> Projets (Personal) & Collaborateurs (Personal)
        if (type === 'researcher') {
            const newNodes = [
                { id: `p-proj-${id}`, name: 'Projets', val: 6, color: '#f59e0b', type: 'researcher_projects', parentId: id },
                { id: `p-collab-${id}`, name: 'Collaborateurs', val: 6, color: '#ec4899', type: 'researcher_collabs', parentId: id }
            ];
            const newLinks = newNodes.map(n => ({ source: id, target: n.id }));
            addNodesAndLinks(id, newNodes, newLinks);

            // Prefetch details
            setInfo(`Loading data for ${name}...`);
            try {
                const res = await api.get(`/researcher/${id}`);
                setResearcherCache(prev => ({ ...prev, [`details-${id}`]: res.data }));
                setInfo(`Loaded data for ${name}. Click sub-nodes to see details.`);
            } catch (e) {
                console.error(e);
                setInfo(`Error loading details for ${name}.`);
            }
            return;
        }

        // 6. Researcher Projects Expansion
        if (type === 'researcher_projects') {
            const parentId = node.parentId;
            const details = researcherCache[`details-${parentId}`];

            if (!details || !details.stats) {
                setInfo("Please wait, data is loading or missing.");
                // We should probably allow trying to fetch again if missing, but for now cache check is simple
                return;
            }

            const stats = details.stats.hal.found ? details.stats.hal : details.stats.dblp;

            if (!stats || !stats.recent_publications) {
                setInfo("No projects/publications found.");
                return;
            }

            const pubs = stats.recent_publications || [];
            const newNodes = pubs.slice(0, 5).map((pub, idx) => ({
                id: `pub-${parentId}-${idx}`,
                name: pub.title?.substring(0, 30) + '...',
                fullTitle: pub.title,
                val: 4,
                color: '#fcd34d',
                type: 'item_project'
            }));

            const newLinks = newNodes.map(n => ({ source: id, target: n.id }));
            addNodesAndLinks(id, newNodes, newLinks);
            setInfo("Expanded Projects.");
            return;
        }

        // 7. Researcher Collaborators Expansion
        if (type === 'researcher_collabs') {
            const parentId = node.parentId;
            const details = researcherCache[`details-${parentId}`];

            if (!details || !details.stats) {
                setInfo("Please wait, data is loading or missing.");
                return;
            }

            const stats = details.stats.hal.found ? details.stats.hal : details.stats.dblp;

            if (!stats || !stats.top_collaborators) {
                setInfo("No collaborators found.");
                return;
            }

            const collabs = Object.entries(stats.top_collaborators).slice(0, 10);
            const newNodes = collabs.map(([name, count], idx) => ({
                id: `collab-${parentId}-${idx}`,
                name: name,
                val: 4,
                color: '#f9a8d4',
                type: 'item_collab'
            }));

            const newLinks = newNodes.map(n => ({ source: id, target: n.id }));
            addNodesAndLinks(id, newNodes, newLinks);
            setInfo("Expanded Collaborators.");
            return;
        }

    }, [expandedNodes, researcherCache]);

    return (
        <div className="h-[calc(100vh-100px)] relative overflow-hidden bg-slate-900 mx-4 rounded-3xl shadow-2xl border border-slate-800">
            <div className="absolute top-4 left-4 z-10 glass-card-dark p-4 max-w-sm pointer-events-none select-none">
                <div className="pointer-events-auto">
                    <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                        <Search className="w-5 h-5 text-blue-400" /> Research Network
                    </h2>
                    <p className="text-slate-300 text-sm mb-2">
                        Interactive hierarchy: LISTIC &rarr; Groups &rarr; Details.
                    </p>
                    <div className="text-xs text-blue-300 font-mono bg-slate-800 p-2 rounded border border-slate-700">
                        &gt; {info}
                    </div>
                </div>
            </div>

            <ForceGraph2D
                ref={fgRef}
                graphData={graphData}
                nodeLabel="name"
                nodeColor={node => node.color}
                nodeRelSize={6}
                linkColor={() => 'rgba(255,255,255,0.2)'}
                onNodeClick={handleNodeClick}
                backgroundColor="#0f172a"

                // DAG Layout (Left to Right)
                dagMode="lr"
                dagLevelDistance={350}

                // Reduce movement/swimming
                d3AlphaDecay={0.1}
                d3VelocityDecay={0.3}
                cooldownTicks={100}
                // Auto zoom removed

                onNodeDragEnd={node => {
                    node.fx = node.x;
                    node.fy = node.y;
                }}
                nodeCanvasObject={(node, ctx, globalScale) => {
                    const label = node.name;
                    const fontSize = 12 / globalScale;
                    ctx.font = `600 ${fontSize}px "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;

                    // Fixed Dimensions (Uniform Size)
                    // We divide by globalScale to keep them constant physical size on screen, 
                    // or we can define them in graph units. 
                    // Let's keep them constant screen size (approx 120px wide) basically like UI elements
                    const width = 140 / globalScale;
                    const height = 40 / globalScale;
                    const radius = 6 / globalScale;

                    const x = node.x - width / 2;
                    const y = node.y - height / 2;

                    // Glowing Shadow
                    ctx.shadowColor = node.color;
                    ctx.shadowBlur = 15;
                    ctx.shadowOffsetX = 0;
                    ctx.shadowOffsetY = 0;

                    // Draw Rounded Rectangle
                    ctx.fillStyle = node.color;
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
                    ctx.lineWidth = 1 / globalScale; // Thinner elegant border

                    ctx.beginPath();
                    ctx.moveTo(x + radius, y);
                    ctx.lineTo(x + width - radius, y);
                    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
                    ctx.lineTo(x + width, y + height - radius);
                    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
                    ctx.lineTo(x + radius, y + height);
                    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
                    ctx.lineTo(x, y + radius);
                    ctx.quadraticCurveTo(x, y, x + radius, y);
                    ctx.closePath();

                    ctx.fill();
                    ctx.shadowBlur = 0; // Reset shadow for stroke
                    ctx.stroke();

                    // Text Rendering
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = '#ffffff';

                    // Truncation Logic
                    let displayLabel = label;
                    const maxWidth = width - (16 / globalScale); // Padding
                    if (ctx.measureText(displayLabel).width > maxWidth) {
                        while (ctx.measureText(displayLabel + '...').width > maxWidth && displayLabel.length > 0) {
                            displayLabel = displayLabel.slice(0, -1);
                        }
                        displayLabel += '...';
                    }

                    ctx.fillText(displayLabel, node.x, node.y);

                    node.__bckgDimensions = [width, height];
                }}
                nodePointerAreaPaint={(node, color, ctx) => {
                    ctx.fillStyle = color;
                    const dims = node.__bckgDimensions;
                    if (dims) {
                        ctx.fillRect(node.x - dims[0] / 2, node.y - dims[1] / 2, ...dims);
                    }
                }}
            />
            {loading && (
                <div className="absolute bottom-4 right-4 bg-slate-800 text-white px-4 py-2 rounded-full text-xs animate-pulse">
                    Loading Data...
                </div>
            )}
        </div>
    );
}
