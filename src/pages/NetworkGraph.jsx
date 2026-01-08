import { useRef, useState, useEffect, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import api from '../lib/api';
import { Search, Download } from 'lucide-react';

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
    const [searchQuery, setSearchQuery] = useState('');
    const [highlightedNodeId, setHighlightedNodeId] = useState(null);
    const [showSearchResults, setShowSearchResults] = useState(false);

    // Filter nodes based on search query
    const searchResults = searchQuery.trim()
        ? graphData.nodes.filter(n =>
            n.name.toLowerCase().includes(searchQuery.toLowerCase())
        ).slice(0, 10)
        : [];

    // Function to zoom to a specific node
    const zoomToNode = (node) => {
        if (fgRef.current && node.x !== undefined && node.y !== undefined) {
            fgRef.current.centerAt(node.x, node.y, 500);
            fgRef.current.zoom(2, 500);
            setHighlightedNodeId(node.id);
            setShowSearchResults(false);
            setInfo(`Navigué vers: ${node.name}`);
            // Clear highlight after 3 seconds
            setTimeout(() => setHighlightedNodeId(null), 3000);
        }
    };

    // Function to export graph data as JSON
    const exportGraphData = () => {
        // Create clean export data (remove internal properties like fx, fy)
        const exportData = {
            nodes: graphData.nodes.map(n => ({
                id: n.id,
                name: n.name,
                type: n.type,
                color: n.color,
                ...(n.data ? { data: n.data } : {})
            })),
            links: graphData.links.map(l => ({
                source: l.source.id || l.source,
                target: l.target.id || l.target
            })),
            exportDate: new Date().toISOString(),
            totalNodes: graphData.nodes.length,
            totalLinks: graphData.links.length
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `network-graph-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setInfo(`Graphe exporté: ${graphData.nodes.length} nœuds, ${graphData.links.length} liens.`);
    };

    useEffect(() => {
        if (fgRef.current) {
            // Strong repulsion to prevent overlap
            fgRef.current.d3Force('charge').strength(-4000).distanceMax(1500);
            fgRef.current.d3Force('link').distance(150);
        }
    }, [graphData]);

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

    // Helper to remove a node and all its descendants
    const removeNodeAndDescendants = useCallback((nodeId) => {
        setGraphData(prev => {
            // Find all descendants using BFS
            const toRemove = new Set([nodeId]);
            let changed = true;
            while (changed) {
                changed = false;
                prev.links.forEach(link => {
                    const sourceId = link.source.id || link.source;
                    const targetId = link.target.id || link.target;
                    if (toRemove.has(sourceId) && !toRemove.has(targetId)) {
                        toRemove.add(targetId);
                        changed = true;
                    }
                });
            }
            // Don't remove the clicked node itself, only its children
            toRemove.delete(nodeId);

            // Also remove these descendants from expandedNodes
            setExpandedNodes(prevExpanded => {
                const newSet = new Set(prevExpanded);
                toRemove.forEach(id => newSet.delete(id));
                newSet.delete(nodeId); // Also mark the clicked node as collapsed
                return newSet;
            });

            return {
                nodes: prev.nodes.filter(n => !toRemove.has(n.id)),
                links: prev.links.filter(l => {
                    const sourceId = l.source.id || l.source;
                    const targetId = l.target.id || l.target;
                    return !toRemove.has(sourceId) && !toRemove.has(targetId);
                })
            };
        });
    }, []);

    const handleNodeClick = useCallback(async (node) => {
        // Toggle: If already expanded, collapse (remove children)
        if (expandedNodes.has(node.id)) {
            removeNodeAndDescendants(node.id);
            setInfo(`Collapsed ${node.name}.`);
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

        // 2. Global Projects Expansion -> Show 3 sub-categories
        if (type === 'group_projects_global') {
            setLoading(true);
            try {
                const res = await api.get('/projects');
                const projects = res.data;

                // Cache all projects for later use
                setResearcherCache(prev => ({ ...prev, allProjects: projects }));

                // Create 3 sub-nodes: Collaborateurs HAL, Partenaires, Financeurs
                const newNodes = [
                    { id: 'proj-collaborators-hal', name: 'Collaborateurs (HAL)', val: 12, color: '#ec4899', type: 'proj_collab_hal' },
                    { id: 'proj-partners', name: 'Partenaires', val: 12, color: '#f59e0b', type: 'proj_partners_group' },
                    { id: 'proj-funders', name: 'Financeurs', val: 12, color: '#8b5cf6', type: 'proj_funders_group' },
                    { id: 'proj-by-category', name: 'Par Catégorie', val: 12, color: '#10b981', type: 'proj_by_category' }
                ];

                const newLinks = newNodes.map(n => ({ source: id, target: n.id }));
                addNodesAndLinks(id, newNodes, newLinks);

                setInfo("Choisissez: Collaborateurs HAL, Partenaires, Financeurs ou Par Catégorie.");
            } catch (e) {
                console.error(e);
                setInfo("Error loading projects.");
            } finally {
                setLoading(false);
            }
            return;
        }

        // 2.1 Projects by Category (original behavior)
        if (type === 'proj_by_category') {
            const projects = researcherCache.allProjects || [];
            const types = [...new Set(projects.map(p => p.type || 'Autres'))];

            const newNodes = types.map(t => ({
                id: `proj-type-${t}`,
                name: t,
                val: 10,
                color: '#10b981',
                type: 'project_category',
                raw_type: t
            }));

            // Cache projects by type
            const cacheUpdate = {};
            projects.forEach(p => {
                const t = p.type || 'Autres';
                if (!cacheUpdate[t]) cacheUpdate[t] = [];
                cacheUpdate[t].push(p);
            });
            setResearcherCache(prev => ({ ...prev, ...cacheUpdate }));

            const newLinks = newNodes.map(n => ({ source: id, target: n.id }));
            addNodesAndLinks(id, newNodes, newLinks);
            setInfo("Choisissez une catégorie de projet.");
            return;
        }

        // 2.2 Partners Group -> List all unique partners
        if (type === 'proj_partners_group') {
            const projects = researcherCache.allProjects || [];
            const partnerMap = {}; // partner name -> list of projects

            projects.forEach(p => {
                const partnersStr = p.PARTENAIRES || '';
                if (!partnersStr.trim()) return;
                const partners = partnersStr.split(',').map(s => s.trim()).filter(s => s);
                partners.forEach(partner => {
                    if (!partnerMap[partner]) partnerMap[partner] = [];
                    partnerMap[partner].push(p);
                });
            });

            // Cache partner -> projects
            setResearcherCache(prev => ({ ...prev, partnerProjects: partnerMap }));

            const newNodes = Object.keys(partnerMap).slice(0, 30).map(partner => ({
                id: `partner-${partner.replace(/\s+/g, '_')}`,
                name: partner,
                val: 6,
                color: '#fbbf24',
                type: 'item_partner',
                partnerName: partner
            }));

            const newLinks = newNodes.map(n => ({ source: id, target: n.id }));
            addNodesAndLinks(id, newNodes, newLinks);
            setInfo(`${Object.keys(partnerMap).length} partenaires trouvés.`);
            return;
        }

        // 2.3 Partner item -> Show projects for this partner
        if (type === 'item_partner') {
            const partnerName = node.partnerName;
            const projects = (researcherCache.partnerProjects || {})[partnerName] || [];

            const newNodes = projects.map(p => ({
                id: `partner-proj-${p._unique_id}`,
                name: p.NOM,
                val: 5,
                color: '#fcd34d',
                type: 'item_project_leaf',
                data: p
            }));

            const newLinks = newNodes.map(n => ({ source: id, target: n.id }));
            addNodesAndLinks(id, newNodes, newLinks);
            setInfo(`${projects.length} projets avec ${partnerName}.`);
            return;
        }

        // 2.4 Funders Group -> List all unique funders
        if (type === 'proj_funders_group') {
            const projects = researcherCache.allProjects || [];
            const funderMap = {}; // funder name -> list of projects

            projects.forEach(p => {
                const fundersStr = p.FINANCEURS || '';
                if (!fundersStr.trim()) return;
                // Funders might have complex names with dashes, split carefully
                const funders = fundersStr.split(',').map(s => s.trim()).filter(s => s);
                funders.forEach(funder => {
                    if (!funderMap[funder]) funderMap[funder] = [];
                    funderMap[funder].push(p);
                });
            });

            // Cache funder -> projects
            setResearcherCache(prev => ({ ...prev, funderProjects: funderMap }));

            const newNodes = Object.keys(funderMap).map(funder => ({
                id: `funder-${funder.replace(/\s+/g, '_')}`,
                name: funder,
                val: 6,
                color: '#a78bfa',
                type: 'item_funder',
                funderName: funder
            }));

            const newLinks = newNodes.map(n => ({ source: id, target: n.id }));
            addNodesAndLinks(id, newNodes, newLinks);
            setInfo(`${Object.keys(funderMap).length} financeurs trouvés.`);
            return;
        }

        // 2.5 Funder item -> Show projects funded by this funder
        if (type === 'item_funder') {
            const funderName = node.funderName;
            const projects = (researcherCache.funderProjects || {})[funderName] || [];

            const newNodes = projects.map(p => ({
                id: `funder-proj-${p._unique_id}`,
                name: p.NOM,
                val: 5,
                color: '#c4b5fd',
                type: 'item_project_leaf',
                data: p
            }));

            const newLinks = newNodes.map(n => ({ source: id, target: n.id }));
            addNodesAndLinks(id, newNodes, newLinks);
            setInfo(`${projects.length} projets financés par ${funderName}.`);
            return;
        }

        // 2.6 Collaborators from HAL (global for LISTIC)
        if (type === 'proj_collab_hal') {
            setLoading(true);
            setInfo("Chargement des collaborateurs depuis HAL...");
            try {
                // Fetch global stats from HAL for LISTIC
                const halUrl = `https://api.archives-ouvertes.fr/search/?q=structAcronym_s:"LISTIC"&wt=json&rows=0&facet=true&facet.field=authFullName_s&facet.limit=50&facet.mincount=5`;
                const response = await fetch(halUrl);
                const data = await response.json();

                const authorFacet = data.facet_counts?.facet_fields?.authFullName_s || [];
                const collaborators = [];
                for (let i = 0; i < authorFacet.length; i += 2) {
                    collaborators.push({ name: authorFacet[i], count: authorFacet[i + 1] });
                }

                const newNodes = collaborators.slice(0, 30).map(c => ({
                    id: `hal-collab-${c.name.replace(/\s+/g, '_')}`,
                    name: c.name,
                    val: 5,
                    color: '#f9a8d4',
                    type: 'item_collab',
                    collabName: c.name
                }));

                const newLinks = newNodes.map(n => ({ source: id, target: n.id }));
                addNodesAndLinks(id, newNodes, newLinks);
                setInfo(`${collaborators.length} collaborateurs HAL trouvés.`);
            } catch (e) {
                console.error(e);
                setInfo("Erreur de chargement HAL.");
            } finally {
                setLoading(false);
            }
            return;
        }

        // 2.5 Project Category Expansion -> Show 4 sub-options for this category
        if (type === 'project_category') {
            const catProjects = researcherCache[node.raw_type] || [];
            const categoryName = node.raw_type;

            // Cache the projects for this specific category
            setResearcherCache(prev => ({ ...prev, [`cat-projects-${categoryName}`]: catProjects }));

            // Create 4 sub-nodes for this category
            const newNodes = [
                { id: `cat-${categoryName}-collab-hal`, name: 'Collaborateurs (HAL)', val: 8, color: '#ec4899', type: 'cat_collab_hal', categoryName },
                { id: `cat-${categoryName}-partners`, name: 'Partenaires', val: 8, color: '#f59e0b', type: 'cat_partners', categoryName },
                { id: `cat-${categoryName}-funders`, name: 'Financeurs', val: 8, color: '#8b5cf6', type: 'cat_funders', categoryName },
                { id: `cat-${categoryName}-projects-list`, name: 'Liste des Projets', val: 8, color: '#34d399', type: 'cat_projects_list', categoryName }
            ];

            const newLinks = newNodes.map(n => ({ source: id, target: n.id }));
            addNodesAndLinks(id, newNodes, newLinks);
            setInfo(`Catégorie ${name}: Choisissez une vue.`);
            return;
        }

        // 2.5.1 Category -> Projects List
        if (type === 'cat_projects_list') {
            const catProjects = researcherCache[`cat-projects-${node.categoryName}`] || [];

            const newNodes = catProjects.map(p => ({
                id: p._unique_id || `proj-${p.NOM}`,
                name: p.NOM,
                val: 6,
                color: '#34d399',
                type: 'item_project_global',
                data: p
            }));

            const newLinks = newNodes.map(n => ({ source: id, target: n.id }));
            addNodesAndLinks(id, newNodes, newLinks);
            setInfo(`${catProjects.length} projets ${node.categoryName}.`);
            return;
        }

        // 2.5.2 Category -> Partners for this category
        if (type === 'cat_partners') {
            const catProjects = researcherCache[`cat-projects-${node.categoryName}`] || [];
            const partnerMap = {};

            catProjects.forEach(p => {
                const partnersStr = p.PARTENAIRES || '';
                if (!partnersStr.trim()) return;
                const partners = partnersStr.split(',').map(s => s.trim()).filter(s => s);
                partners.forEach(partner => {
                    if (!partnerMap[partner]) partnerMap[partner] = [];
                    partnerMap[partner].push(p);
                });
            });

            setResearcherCache(prev => ({ ...prev, [`cat-partner-projects-${node.categoryName}`]: partnerMap }));

            const newNodes = Object.keys(partnerMap).map(partner => ({
                id: `cat-partner-${node.categoryName}-${partner.replace(/\s+/g, '_')}`,
                name: partner,
                val: 5,
                color: '#fbbf24',
                type: 'cat_item_partner',
                partnerName: partner,
                categoryName: node.categoryName
            }));

            const newLinks = newNodes.map(n => ({ source: id, target: n.id }));
            addNodesAndLinks(id, newNodes, newLinks);
            setInfo(`${Object.keys(partnerMap).length} partenaires pour ${node.categoryName}.`);
            return;
        }

        // 2.5.3 Category Partner item -> Show projects for this partner in this category
        if (type === 'cat_item_partner') {
            const partnerMap = researcherCache[`cat-partner-projects-${node.categoryName}`] || {};
            const projects = partnerMap[node.partnerName] || [];

            const newNodes = projects.map(p => ({
                id: `cat-partner-proj-${node.categoryName}-${p._unique_id}`,
                name: p.NOM,
                val: 4,
                color: '#fcd34d',
                type: 'item_project_leaf',
                data: p
            }));

            const newLinks = newNodes.map(n => ({ source: id, target: n.id }));
            addNodesAndLinks(id, newNodes, newLinks);
            setInfo(`${projects.length} projets avec ${node.partnerName}.`);
            return;
        }

        // 2.5.4 Category -> Funders for this category
        if (type === 'cat_funders') {
            const catProjects = researcherCache[`cat-projects-${node.categoryName}`] || [];
            const funderMap = {};

            catProjects.forEach(p => {
                const fundersStr = p.FINANCEURS || '';
                if (!fundersStr.trim()) return;
                const funders = fundersStr.split(',').map(s => s.trim()).filter(s => s);
                funders.forEach(funder => {
                    if (!funderMap[funder]) funderMap[funder] = [];
                    funderMap[funder].push(p);
                });
            });

            setResearcherCache(prev => ({ ...prev, [`cat-funder-projects-${node.categoryName}`]: funderMap }));

            const newNodes = Object.keys(funderMap).map(funder => ({
                id: `cat-funder-${node.categoryName}-${funder.replace(/\s+/g, '_')}`,
                name: funder,
                val: 5,
                color: '#a78bfa',
                type: 'cat_item_funder',
                funderName: funder,
                categoryName: node.categoryName
            }));

            const newLinks = newNodes.map(n => ({ source: id, target: n.id }));
            addNodesAndLinks(id, newNodes, newLinks);
            setInfo(`${Object.keys(funderMap).length} financeurs pour ${node.categoryName}.`);
            return;
        }

        // 2.5.5 Category Funder item -> Show projects funded by this funder in this category
        if (type === 'cat_item_funder') {
            const funderMap = researcherCache[`cat-funder-projects-${node.categoryName}`] || {};
            const projects = funderMap[node.funderName] || [];

            const newNodes = projects.map(p => ({
                id: `cat-funder-proj-${node.categoryName}-${p._unique_id}`,
                name: p.NOM,
                val: 4,
                color: '#c4b5fd',
                type: 'item_project_leaf',
                data: p
            }));

            const newLinks = newNodes.map(n => ({ source: id, target: n.id }));
            addNodesAndLinks(id, newNodes, newLinks);
            setInfo(`${projects.length} projets financés par ${node.funderName}.`);
            return;
        }

        // 2.5.6 Category -> Collaborators from HAL for the projects in this category
        if (type === 'cat_collab_hal') {
            const catProjects = researcherCache[`cat-projects-${node.categoryName}`] || [];

            if (catProjects.length === 0) {
                setInfo("Aucun projet dans cette catégorie.");
                return;
            }

            setLoading(true);
            setInfo("Chargement des collaborateurs depuis HAL...");

            try {
                // Search HAL for publications mentioning these project names
                const projectNames = catProjects.map(p => p.NOM).join('" OR "');
                const halUrl = `https://api.archives-ouvertes.fr/search/?q=text:("${encodeURIComponent(projectNames)}")&wt=json&rows=0&facet=true&facet.field=authFullName_s&facet.limit=30&facet.mincount=1`;

                const response = await fetch(halUrl);
                const data = await response.json();

                const authorFacet = data.facet_counts?.facet_fields?.authFullName_s || [];
                const collaborators = [];
                for (let i = 0; i < authorFacet.length; i += 2) {
                    collaborators.push({ name: authorFacet[i], count: authorFacet[i + 1] });
                }

                if (collaborators.length === 0) {
                    setInfo("Aucun collaborateur HAL trouvé pour ces projets.");
                    setLoading(false);
                    return;
                }

                const newNodes = collaborators.map(c => ({
                    id: `cat-hal-collab-${node.categoryName}-${c.name.replace(/\s+/g, '_')}`,
                    name: c.name,
                    val: 4,
                    color: '#f9a8d4',
                    type: 'item_collab',
                    collabName: c.name
                }));

                const newLinks = newNodes.map(n => ({ source: id, target: n.id }));
                addNodesAndLinks(id, newNodes, newLinks);
                setInfo(`${collaborators.length} collaborateurs HAL trouvés.`);
            } catch (e) {
                console.error(e);
                setInfo("Erreur de chargement HAL.");
            } finally {
                setLoading(false);
            }
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
            const newNodes = pubs.slice(0, 5).map((pub, idx) => {
                // HAL uses title_s (can be string or array), DBLP might use title
                let rawTitle = pub.title_s || pub.title || 'Untitled Publication';
                if (Array.isArray(rawTitle)) rawTitle = rawTitle[0];
                const displayTitle = rawTitle.length > 35 ? rawTitle.substring(0, 35) + '...' : rawTitle;

                // Store authors for later expansion
                let authors = pub.authFullName_s || [];
                if (!Array.isArray(authors)) authors = [authors];

                return {
                    id: `pub-${parentId}-${idx}`,
                    name: displayTitle,
                    fullTitle: rawTitle,
                    authors: authors,
                    val: 4,
                    color: '#fcd34d',
                    type: 'item_project'
                };
            });

            const newLinks = newNodes.map(n => ({ source: id, target: n.id }));
            addNodesAndLinks(id, newNodes, newLinks);
            setInfo(`Showing ${pubs.length} recent publications.`);
            return;
        }

        // 6.5 Publication Expansion -> Show all co-authors
        if (type === 'item_project') {
            const authors = node.authors || [];

            if (authors.length === 0) {
                setInfo("No authors found for this publication.");
                return;
            }

            const newNodes = authors.map((authorName, idx) => {
                const authorId = `author-${node.id}-${authorName.replace(/\s+/g, '_')}`;
                return {
                    id: authorId,
                    name: authorName,
                    collabName: authorName,
                    val: 4,
                    color: '#f9a8d4',
                    type: 'item_collab'
                };
            });

            const newLinks = newNodes.map(n => ({ source: node.id, target: n.id }));
            addNodesAndLinks(node.id, newNodes, newLinks);
            setInfo(`Showing ${authors.length} authors.`);
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
            const newNodes = collabs.map(([collabName, count], idx) => {
                // Use a unique ID based on the collaborator's name (hashed or sanitized)
                const collabId = `collab-${parentId}-${collabName.replace(/\s+/g, '_')}`;
                return {
                    id: collabId,
                    name: collabName,
                    collabName: collabName, // Store original name for HAL lookup
                    val: 4,
                    color: '#f9a8d4',
                    type: 'item_collab'
                };
            });

            const newLinks = newNodes.map(n => ({ source: id, target: n.id }));
            addNodesAndLinks(id, newNodes, newLinks);
            setInfo("Expanded Collaborators.");
            return;
        }

        // 8. Collaborator Node Expansion -> Treat like a researcher (recursive)
        if (type === 'item_collab') {
            const collabName = node.collabName || node.name;
            setInfo(`Loading data for ${collabName}...`);
            setLoading(true);

            try {
                // Fetch HAL stats directly by name using the global stats endpoint with author filter
                // Or we can directly query HAL. For simplicity, let's use a direct HAL search.
                const halUrl = `https://api.archives-ouvertes.fr/search/?q=authFullName_t:"${encodeURIComponent(collabName)}"&wt=json&fl=title_s,producedDateY_i,docType_s,keyword_s,authFullName_s,journalTitle_s&rows=50&sort=producedDateY_i%20desc`;

                const response = await fetch(halUrl);
                const data = await response.json();
                const docs = data.response?.docs || [];

                if (docs.length === 0) {
                    setInfo(`No publications found for ${collabName}.`);
                    setLoading(false);
                    return;
                }

                // Process stats like in backend
                const keywords = [];
                const coAuthors = [];
                const collabNameLower = collabName.toLowerCase();

                docs.forEach(d => {
                    if (d.keyword_s) {
                        if (Array.isArray(d.keyword_s)) keywords.push(...d.keyword_s);
                        else keywords.push(d.keyword_s);
                    }
                    if (d.authFullName_s) {
                        const authors = Array.isArray(d.authFullName_s) ? d.authFullName_s : [d.authFullName_s];
                        authors.forEach(auth => {
                            if (auth.toLowerCase() !== collabNameLower) {
                                coAuthors.push(auth);
                            }
                        });
                    }
                });

                // Count collaborators
                const collabCounts = {};
                coAuthors.forEach(name => {
                    collabCounts[name] = (collabCounts[name] || 0) + 1;
                });
                const topCollaborators = Object.entries(collabCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10)
                    .reduce((acc, [k, v]) => { acc[k] = v; return acc; }, {});

                // Store in cache
                const cacheKey = `details-${node.id}`;
                setResearcherCache(prev => ({
                    ...prev,
                    [cacheKey]: {
                        stats: {
                            hal: {
                                found: true,
                                recent_publications: docs.slice(0, 5),
                                top_collaborators: topCollaborators
                            }
                        }
                    }
                }));

                // Add sub-nodes (Projets & Collaborateurs)
                const newNodes = [
                    { id: `p-proj-${node.id}`, name: 'Publications', val: 6, color: '#f59e0b', type: 'researcher_projects', parentId: node.id },
                    { id: `p-collab-${node.id}`, name: 'Collaborateurs', val: 6, color: '#ec4899', type: 'researcher_collabs', parentId: node.id }
                ];
                const newLinks = newNodes.map(n => ({ source: node.id, target: n.id }));
                addNodesAndLinks(node.id, newNodes, newLinks);

                setInfo(`Loaded ${docs.length} publications for ${collabName}.`);
            } catch (e) {
                console.error(e);
                setInfo(`Error loading data for ${collabName}.`);
            } finally {
                setLoading(false);
            }
            return;
        }

    }, [expandedNodes, researcherCache, removeNodeAndDescendants]);

    return (
        <div className="h-[calc(100vh-100px)] relative overflow-hidden bg-slate-900 mx-4 rounded-3xl shadow-2xl border border-slate-800">
            {/* Info Panel */}
            <div className="absolute top-4 left-4 z-10 glass-card-dark p-3 max-w-xs pointer-events-none select-none">
                <p className="text-slate-300 text-xs mb-2">
                    Click to expand, click again to collapse.
                </p>
                <div className="text-xs text-blue-300 font-mono bg-slate-800 p-2 rounded border border-slate-700">
                    &gt; {info}
                </div>
            </div>

            {/* Search Bar */}
            <div className="absolute top-4 right-4 z-20">
                <div className="relative">
                    <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg overflow-hidden shadow-lg">
                        <Search className="w-4 h-4 text-slate-400 ml-3" />
                        <input
                            type="text"
                            placeholder="Rechercher un nœud..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setShowSearchResults(true);
                            }}
                            onFocus={() => setShowSearchResults(true)}
                            onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
                            className="bg-transparent text-white text-sm px-3 py-2 w-64 outline-none placeholder-slate-500"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => {
                                    setSearchQuery('');
                                    setShowSearchResults(false);
                                }}
                                className="text-slate-400 hover:text-white px-2"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {/* Search Results Dropdown */}
                    {showSearchResults && searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                            {searchResults.map((node, idx) => (
                                <button
                                    key={node.id}
                                    onClick={() => zoomToNode(node)}
                                    className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-2 border-b border-slate-700 last:border-b-0"
                                >
                                    <span
                                        className="w-3 h-3 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: node.color }}
                                    />
                                    <span className="truncate">{node.name}</span>
                                    <span className="text-xs text-slate-500 ml-auto">{node.type}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {showSearchResults && searchQuery && searchResults.length === 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-3 text-center text-slate-500 text-sm">
                            Aucun nœud trouvé
                        </div>
                    )}
                </div>

                {/* Node count and export button */}
                <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500">
                        {graphData.nodes.length} nœud{graphData.nodes.length > 1 ? 's' : ''}
                    </span>
                    <button
                        onClick={exportGraphData}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded transition-colors"
                        title="Exporter le graphe en JSON"
                    >
                        <Download className="w-3 h-3" />
                        Exporter
                    </button>
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

                // DAG Layout (Left to Right) - Ensures forward expansion
                dagMode="lr"
                dagLevelDistance={350}

                // PHYSICS TUNING:
                // 1. High VelocityDecay = High Friction (moves like in honey, stops floating)
                // 2. High AlphaDecay = Simulation ends quickly
                d3AlphaDecay={0.2}
                d3VelocityDecay={0.8}

                // Pre-calculate layout before rendering to avoid "flying" nodes
                warmupTicks={100}
                cooldownTicks={0} // Stop calculating once stable

                // Zoom limits
                minZoom={0.3}
                maxZoom={4}

                // Fix node position after drag
                onNodeDragEnd={node => {
                    node.fx = node.x;
                    node.fy = node.y;
                }}

                // Freeze simulation after initial layout
                onEngineStop={() => {
                    // Fix all nodes in place after simulation stops
                    if (fgRef.current) {
                        graphData.nodes.forEach(node => {
                            if (node.x !== undefined && node.y !== undefined) {
                                node.fx = node.x;
                                node.fy = node.y;
                            }
                        });
                    }
                }}
                nodeCanvasObject={(node, ctx, globalScale) => {
                    const label = node.name;

                    // Use FIXED sizes in graph coordinates (not screen pixels)
                    // This prevents nodes from overlapping when zooming
                    const baseWidth = 140;
                    const baseHeight = 40;
                    const baseFontSize = 12;
                    const baseRadius = 6;

                    // Scale font for readability but keep node size fixed
                    const fontSize = Math.max(baseFontSize, baseFontSize / Math.sqrt(globalScale));
                    ctx.font = `600 ${fontSize}px "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;

                    const width = baseWidth;
                    const height = baseHeight;
                    const radius = baseRadius;

                    const x = node.x - width / 2;
                    const y = node.y - height / 2;

                    // Check if this node is highlighted (from search)
                    const isHighlighted = node.id === highlightedNodeId;

                    // Glowing Shadow (stronger if highlighted)
                    ctx.shadowColor = isHighlighted ? '#ffffff' : node.color;
                    ctx.shadowBlur = isHighlighted ? 30 : 15;
                    ctx.shadowOffsetX = 0;
                    ctx.shadowOffsetY = 0;

                    // Draw Rounded Rectangle
                    ctx.fillStyle = node.color;
                    ctx.strokeStyle = isHighlighted ? '#ffffff' : 'rgba(255, 255, 255, 0.9)';
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
                    const maxWidth = width - 16; // Fixed padding
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
