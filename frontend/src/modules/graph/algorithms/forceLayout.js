// frontend/src/modules/graph/algorithms/forceLayout.js
import { forceSimulation, forceManyBody, forceLink, forceCollide, forceCenter, forceX, forceY } from 'd3-force';

/**
 * Crée une simulation de force D3 prête à l'emploi.
 * @param {Array} nodes - [{id, x?, y?}]
 * @param {Array} links - [{source:id, target:id, type?}]
 * @param {{
 *  linkDistance?:(l:any)=>number|number,
 *  linkStrength?:(l:any)=>number|number,
 *  charge?:number,
 *  collide?:number,
 *  width?:number,
 *  height?:number,
 *  center?:boolean,
 *  forceX?:number,
 *  forceY?:number,
 *  onTick?:(sim:any)=>void,
 * }} opts
 */
export function createSimulation(nodes, links, opts = {}) {
  const sim = forceSimulation(nodes);

  const link = forceLink(links)
    .id((d) => d.id)
    .distance(typeof opts.linkDistance === 'function' ? opts.linkDistance : () => opts.linkDistance ?? 60)
    .strength(typeof opts.linkStrength === 'function' ? opts.linkStrength : () => opts.linkStrength ?? 0.7);

  const charge = forceManyBody().strength(opts.charge ?? -80);
  const collide = forceCollide().radius(opts.collide ?? 14).strength(0.9);

  sim
    .force('link', link)
    .force('charge', charge)
    .force('collide', collide);

  if (opts.center !== false) {
    const cx = (opts.width ?? 800) / 2;
    const cy = (opts.height ?? 600) / 2;
    sim.force('center', forceCenter(cx, cy));
  }

  if (typeof opts.forceX === 'number') sim.force('forceX', forceX(opts.forceX));
  if (typeof opts.forceY === 'number') sim.force('forceY', forceY(opts.forceY));

  if (typeof opts.onTick === 'function') sim.on('tick', () => opts.onTick(sim));

  return sim;
}

export function updateSimulation(sim, { nodes, links }) {
  if (!sim) return;
  if (nodes) sim.nodes(nodes);
  if (links) sim.force('link')?.links(links);
  sim.alpha(0.8).restart();
}

export function stopSimulation(sim) { if (sim) sim.stop(); }