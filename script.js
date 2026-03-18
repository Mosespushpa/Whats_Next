// 1. DATA (Updated for Career Path Project)
const data = {
    "name": "After 10th",
    "description": "The crossroads after secondary school. Explore paths like Intermediate, Diploma, or Vocational courses.",
    "children": [
        {
            "name": "Intermediate",
            "description": "2-year course (Class 11 & 12). The most common path for higher education.",
            "children": [
                { "name": "MPC", "description": "Maths, Physics, Chemistry. Path to Engineering and Architecture." },
                { "name": "BiPC", "description": "Biology, Physics, Chemistry. Path to Medicine and Pharmacy." },
                { "name": "CEC", "description": "Commerce, Economics, Civics. Path to CA, Business, and Law." },
                { "name": "MEC", "description": "Maths, Economics, Commerce. Great for Finance and Management." }
            ]
        },
        {
            "name": "Polytechnic",
            "description": "3-year Diploma in Engineering fields. Faster route to technical jobs.",
            "children": [
                { "name": "Mechanical", "description": "Design and manufacturing of machines." },
                { "name": "CSE", "description": "Software development and computer hardware." }
            ]
        },
        {
            "name": "ITI",
            "description": "Vocational training for specialized industrial skills.",
            "children": [{ "name": "Electrician", "description": "Industrial and domestic electrical work." }]
        }
    ]
};

let width, height, svg, g, treeLayout, root;
const duration = 600;
const sparkDuration = 500;
let i = 0;

function init() {
    d3.select("#tree-container").selectAll("*").remove();
    const container = document.getElementById("tree-container");
    width = container.clientWidth;
    height = container.clientHeight;

    const svgElement = d3.select("#tree-container").append("svg")
        .attr("width", "100%")
        .attr("height", "100%");

    const zoom = d3.zoom()
        .scaleExtent([0.5, 2])
        .on("zoom", (event) => g.attr("transform", event.transform));

    svg = svgElement.call(zoom);
    g = svg.append("g");

    // Define Filter for Spark
    const defs = svg.append("defs");
    const filter = defs.append("filter").attr("id", "spark-glow");
    filter.append("feGaussianBlur").attr("stdDeviation", "2.5").attr("result", "blur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "blur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Set Initial Position
    const initialTransform = d3.zoomIdentity.translate(150, height / 2).scale(1);
    svg.call(zoom.transform, initialTransform);

    treeLayout = d3.tree().nodeSize([60, 200]);
    root = d3.hierarchy(data, d => d.children);
    root.x0 = 0; 
    root.y0 = 0;

    collapseAll(root);
    update(root);
}

function collapseAll(d) {
    if (d.children) {
        d._children = d.children;
        d._children.forEach(collapseAll);
        d.children = null;
    }
}

// Ensure init runs on load
window.onload = init;
window.onresize = init;

// ... Keep your existing update(), diagonal(), fitToScreen(), and resetTree() functions below ...

function update(source) {
    const treeData = treeLayout(root);
    const nodes = treeData.descendants();
    const links = treeData.links();

    const horizontalGap = width < 600 ? 120 : 200;
    nodes.forEach(d => d.y = d.depth * horizontalGap);

    // --- NODES ---
    const node = g.selectAll('g.node').data(nodes, d => d.id || (d.id = ++i));

    const nodeEnter = node.enter().append('g')
        .attr('class', 'node')
        .attr("transform", d => `translate(${source.y0},${source.x0})`)
        .on('click', (event, d) => {
            if (d.children) { d._children = d.children; d.children = null; }
            else { d.children = d._children; d._children = null; }
            update(d);
        })
        .on('mouseover', (event, d) => {
            document.getElementById("info-title").innerText = d.data.name;
            document.getElementById("info-content").innerHTML = `<p>${d.data.description || "No description."}</p>`;
            d3.select(event.currentTarget).select("circle").style("fill", "#ff9f43");
        })
        .on('mouseout', (event, d) => {
            d3.select(event.currentTarget).select("circle").style("fill", d._children ? "#3498db" : "#fff");
        });

    nodeEnter.append('circle').attr('r', 10).style("fill", d => d._children ? "#3498db" : "#fff");
    
    // Mobile text size adjustment
    nodeEnter.append('text')
        .attr("dy", ".35em")
        .attr("x", -15)
        .attr("text-anchor", "end")
        .style("font-size", width < 600 ? "11px" : "14px")
        .text(d => d.data.name);

    const nodeUpdate = nodeEnter.merge(node);
    nodeUpdate.transition().duration(duration).attr("transform", d => `translate(${d.y},${d.x})`);
    nodeUpdate.select('circle').style("fill", d => d._children ? "#3498db" : "#fff");

    node.exit().transition().duration(duration).attr("transform", d => `translate(${source.y},${source.x})`).remove();

    // --- LINKS & SPARK ---
    const link = g.selectAll('path.link').data(links, d => d.target.id);
    const linkEnter = link.enter().insert('path', "g").attr("class", "link")
        .attr('d', d => { const o = { x: source.x0, y: source.y0 }; return diagonal(o, o); });

    const linkUpdate = linkEnter.merge(link);
    const linkTransition = linkUpdate.transition().duration(duration).attr('d', d => diagonal(d.source, d.target));

    link.exit().transition().duration(duration)
        .attr('d', d => { const o = { x: source.x, y: source.y }; return diagonal(o, o); }).remove();

    if (source.children && source.id) {
        const relevantLinks = links.filter(l => l.source.id === source.id);
        linkTransition.end().then(() => {
            g.selectAll("circle.spark-instance")
                .data(relevantLinks, d => `spark-${d.source.id}-${d.target.id}`)
                .join("circle")
                .attr("class", "spark")
                .attr("r", 4)
                .attr("filter", "url(#spark-glow)")
                .attr("transform", d => `translate(${d.source.y},${d.source.x})`)
                .transition().duration(sparkDuration).ease(d3.easeCircleOut)
                .attrTween("transform", function(d) {
                    const p = diagonal(d.source, d.target);
                    const pathNode = d3.create("svg:path").attr("d", p).node();
                    const length = pathNode.getTotalLength();
                    return t => {
                        const pt = pathNode.getPointAtLength(t * length);
                        return `translate(${pt.x},${pt.y})`;
                    };
                })
                .style("opacity", 0).remove();
        });
    }

    nodes.forEach(d => { d.x0 = d.x; d.y0 = d.y; });
}

function diagonal(s, d) {
    return `M ${s.y} ${s.x} C ${(s.y + d.y) / 2} ${s.x}, ${(s.y + d.y) / 2} ${d.x}, ${d.y} ${d.x}`;
}

/**
 * Zoom and pan the camera to show the entire visible tree
 */
function fitToScreen() {
    const bounds = g.node().getBBox();
    const parent = d3.select("#tree-container").node();
    const fullWidth = parent.clientWidth;
    const fullHeight = parent.clientHeight;
    
    const width = bounds.width;
    const height = bounds.height;
    const midX = bounds.x + width / 2;
    const midY = bounds.y + height / 2;
    
    if (width === 0 || height === 0) return; // Nothing to fit

    // Calculate scale with 10% padding
    const scale = 0.85 / Math.max(width / fullWidth, height / fullHeight);
    
    // Smooth transition to the new center
    svg.transition().duration(750).call(
        d3.zoom().on("zoom", (event) => g.attr("transform", event.transform)).transform,
        d3.zoomIdentity
            .translate(fullWidth / 2, fullHeight / 2)
            .scale(scale)
            .translate(-midX, -midY)
    );
}

/**
 * Collapses all nodes and centers the root
 */
function resetTree() {
    // 1. Collapse everything
    collapseAll(root);
    update(root);
    
    // 2. Center the root node again
    const container = document.getElementById("tree-container");
    const initialTransform = d3.zoomIdentity
        .translate(150, container.clientHeight / 2)
        .scale(1);

    svg.transition().duration(750).call(
        d3.zoom().on("zoom", (event) => g.attr("transform", event.transform)).transform, 
        initialTransform
    );
    
    // 3. Clear the info panel
    document.getElementById("info-title").innerText = "Hover over a node";
    document.getElementById("info-content").innerHTML = "<p>Detailed information will appear here.</p>";
}