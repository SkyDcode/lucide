// frontend/src/modules/graph/services/d3Service.js
// Services utilitaires pour initialiser un canvas SVG D3, gérer zoom/pan, et upserts nodes/links
import { select } from 'd3-selection';
import { zoom, zoomIdentity } from 'd3-zoom';
import { drag } from 'd3-drag';

/** Hash deterministe simple pour couleurs (utilisé si pas de color fn fournie) */
function hashColor(str) {
  let h = 0;
  for (let i = 0; i < String(str).length; i++) h = (h * 31 + String(str).charCodeAt(i)) >>> 0;
  const r = (h & 0xff0000) >> 16;
  const g = (h & 0x00ff00) >> 8;
  const b = (h & 0x0000ff);
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * @param {HTMLElement} el - conteneur (div) qui accueillera le svg
 * @param {{width?:number,height?:number,background?:string}} opts
 */
export function initSvg(el, opts = {}) {
  const width = opts.width ?? el.clientWidth ?? 800;
  const height = opts.height ?? 600;

  const svg = select(el)
    .append('svg')
    .attr('class', 'w-full h-full block')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .style('background', opts.background ?? 'transparent');

  const gRoot = svg.append('g').attr('class', 'graph-root');
  const gLinks = gRoot.append('g').attr('class', 'links');
  const gNodes = gRoot.append('g').attr('class', 'nodes');
  const gLabels = gRoot.append('g').attr('class', 'labels');

  const z = zoom().scaleExtent([0.1, 4]).on('zoom', (event) => {
    gRoot.attr('transform', event.transform);
  });
  svg.call(z);

  function resetZoom() { svg.transition().duration(400).call(z.transform, zoomIdentity); }
  function zoomTo(t) { svg.transition().duration(400).call(z.transform, t); }

  function fitView(nodes, padding = 40) {
    if (!nodes || !nodes.length) { resetZoom(); return; }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
      const x = Number.isFinite(n.x) ? n.x : 0;
      const y = Number.isFinite(n.y) ? n.y : 0;
      if (x < minX) minX = x; if (y < minY) minY = y; if (x > maxX) maxX = x; if (y > maxY) maxY = y;
    }
    if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) { resetZoom(); return; }
    const vbWidth = Math.max(1, maxX - minX + padding * 2);
    const vbHeight = Math.max(1, maxY - minY + padding * 2);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const container = svg.node().getBoundingClientRect();
    const scale = Math.min(container.width / vbWidth, container.height / vbHeight);
    const transform = zoomIdentity.translate(container.width / 2, container.height / 2).scale(scale).translate(-cx, -cy);
    zoomTo(transform);
  }

  /** Upsert des liens (lignes) */
  function renderLinks(links, { stroke = '#7e8695', strokeWidth = 1.2, curve = null } = {}) {
    const sel = gLinks.selectAll('line.link').data(links, (d) => d.id ?? `${d.source}-${d.target}-${d.type ?? ''}`);
    sel.exit().remove();
    const enter = sel.enter().append('line').attr('class', 'link').attr('stroke', stroke).attr('stroke-width', strokeWidth).attr('opacity', 0.85);
    const merged = enter.merge(sel);
    merged
      .attr('x1', (d) => d.source.x)
      .attr('y1', (d) => d.source.y)
      .attr('x2', (d) => d.target.x)
      .attr('y2', (d) => d.target.y);
    return merged;
  }

  /** Upsert des noeuds (cercles) + drag
   * @param {Array} nodes
   * @param {{r?:(d:any)=>number, fill?:(d:any)=>string, onClick?:(d:any, event:PointerEvent)=>void, onHover?:(d:any)=>void}} options
   */
  function renderNodes(nodes, options = {}) {
    const r = options.r ?? (() => 8);
    const fill = options.fill ?? ((d) => hashColor(d.type || d.id));

    const sel = gNodes.selectAll('circle.node').data(nodes, (d) => d.id);
    sel.exit().remove();
    const enter = sel.enter().append('circle')
      .attr('class', 'node')
      .attr('r', r)
      .attr('fill', fill)
      .attr('stroke', '#0f172a')
      .attr('stroke-width', 1.5)
      .call(drag()
        .on('start', (event, d) => {
          d.fx = d.x; d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x; d.fy = event.y;
        })
        .on('end', (event, d) => {
          d.fx = null; d.fy = null;
        })
      );

    if (options.onClick) enter.on('click', (event, d) => options.onClick(d, event));
    if (options.onHover) enter.on('mouseenter', (_, d) => options.onHover(d));

    const merged = enter.merge(sel);
    merged
      .attr('r', r)
      .attr('fill', fill)
      .attr('cx', (d) => d.x)
      .attr('cy', (d) => d.y);

    return merged;
  }

  /** Upsert labels */
  function renderLabels(nodes, { text = (d) => d.name ?? String(d.id), fontSize = 11 } = {}) {
    const sel = gLabels.selectAll('text.label').data(nodes, (d) => d.id);
    sel.exit().remove();
    const enter = sel.enter().append('text')
      .attr('class', 'label select-none')
      .attr('text-anchor', 'middle')
      .attr('dy', -12)
      .attr('font-size', fontSize)
      .attr('fill', '#e5e7eb')
      .attr('stroke', '#0f172a')
      .attr('stroke-width', 0.25)
      .text(text);

    const merged = enter.merge(sel);
    merged
      .attr('x', (d) => d.x)
      .attr('y', (d) => d.y)
      .text(text);
    return merged;
  }

  function destroy() { svg.remove(); }

  return { svg, gRoot, gLinks, gNodes, gLabels, fitView, resetZoom, zoomTo, renderLinks, renderNodes, renderLabels, destroy };
}