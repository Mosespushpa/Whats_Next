// 1. DATA WITH DESCRIPTIONS
const data = {
    "name": "After 10th",
    "description": "Basic 10th standard.",
    "children": [
        {
            "name": "Intermediate",
            "description": "Standard RESTful endpoints for resource management.",
            "children": [
                { "name": "MPC", "description": "User profile and account management." },
                { "name": "BiPC", "description": "Transaction and order history logs." },
                { "name": "CEC", "description": "User profile and account management." },
                { "name": "HEC", "description": "Transaction and order history logs." },
                { "name": "MEC", "description": "User profile and account management." },
                { "name": "Agriculture", "description": "Transaction and order history logs." }
            ]
        },
        {
            "name": "Poly",
            "description": "Authentication layers including JWT and OAuth2.",
            "children": [{ "name": "CSE", "description": "Secure delegated access protocol." }]
        },
        {
            "name": "ITI",
            "description": "Authentication layers including JWT and OAuth2.",
            "children": [{ "name": "CSE", "description": "Secure delegated access protocol." }]
        },
        {
            "name": "Job",
            "description": "Authentication layers including JWT and OAuth2.",
            "children": [
                { "name": "Police", "description": "Secure delegated access protocol." },
                { "name": "Army", "description": "Secure delegated access protocol." },
                { "name": "Government", "description": "Secure delegated access protocol." }
            ]
        },
         {
            "name": "Business",
            "description": "Authentication layers including JWT and OAuth2.",
            "children": [{ "name": "CSE", "description": "Secure delegated access protocol." }]
        }
    ]
};
// ... [Data object remains the same as before] ...

let width, height, svg, g, treeLayout, root;
const duration = 600;
const sparkDuration = 500;
let i = 0;

// Function to handle dynamic sizing
function init() {
    // Clear existing SVG if resizing
    d3.select("#tree-container").selectAll("*").remove();

    const container = document.getElementById("tree-container");
    width = container.clientWidth;
    height = container.clientHeight;

    svg = d3.select("#tree-container").append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .call(d3.zoom().on("zoom", (event) => g.attr("transform", event.transform)))
        .append("g");

    // Define filter (needs to be re-added on re-init)
    const defs = svg.append("defs");
    const filter = defs.append("filter").attr("id", "spark-glow");
    filter.append("feGaussianBlur").attr("stdDeviation", "2.5").attr("result", "coloredBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    g = svg.append("g").attr("transform", `translate(80, ${height / 2})`);

    // Responsive spacing: tighten gaps on small screens
    const horizontalGap = width < 600 ? 120 : 200;
    treeLayout = d3.tree().nodeSize([60, horizontalGap]);

    root = d3.hierarchy(data, d => d.children);
    root.x0 = 0; root.y0 = 0;

    function collapseAll(d) {
        if (d.children) {
            d._children = d.children;
            d._children.forEach(collapseAll);
            d.children = null;
        }
    }

    collapseAll(root);
    update(root);
}

// Re-run init when screen size changes
window.onresize = init;
init();

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