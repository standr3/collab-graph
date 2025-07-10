import * as PIXI from 'pixi.js';
import { type Node as GraphNode } from './store';

const getRectEdgePoint = (sourcePoint: PIXI.Point, targetNode: GraphNode): PIXI.Point => {
  const sx = sourcePoint.x;
  const sy = sourcePoint.y;
  const tx = targetNode.x ?? 0;
  const ty = targetNode.y ?? 0;
  const { width: targetW, height: targetH } = targetNode;

  if (!targetW || !targetH) {
    return new PIXI.Point(tx, ty);
  }

  const dx = tx - sx;
  const dy = ty - sy;

  if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) return new PIXI.Point(tx, ty);

  const halfW = targetW / 2;
  const halfH = targetH / 2;
  const slopeY = dy / dx;
  const slopeX = dx / dy;

  let endX = tx;
  let endY = ty;

  if (Math.abs(slopeY) < halfH / halfW) {
    if (dx > 0) {
      endX = tx - halfW;
      endY = ty - halfW * slopeY;
    } else {
      endX = tx + halfW;
      endY = ty + halfW * slopeY;
    }
  } else {
    if (dy > 0) {
      endY = ty - halfH;
      endX = tx - halfH * slopeX;
    } else {
      endY = ty + halfH;
      endX = tx + halfH * slopeX;
    }
  }
  return new PIXI.Point(endX, endY);
};

export const drawLink = (
  linkGfx: PIXI.Graphics,
  sourceNode: GraphNode,
  targetNode: GraphNode,
  baseCurvature: number,
  graphCenter?: PIXI.Point
) => {
  linkGfx.clear();
  if (!sourceNode.x || !sourceNode.y || !targetNode.x || !targetNode.y) return;

  const startPoint = getRectEdgePoint(new PIXI.Point(targetNode.x, targetNode.y), sourceNode);
  const endPoint = getRectEdgePoint(new PIXI.Point(sourceNode.x, sourceNode.y), targetNode);

  let sx = startPoint.x;
  let sy = startPoint.y;
  let ex = endPoint.x;
  let ey = endPoint.y;

  const dx = ex - sx;
  const dy = ey - sy;
  const angle = Math.atan2(dy, dx);
  const padding = 3;

  sx += padding * Math.cos(angle);
  sy += padding * Math.sin(angle);
  ex -= padding * Math.cos(angle);
  ey -= padding * Math.sin(angle);

  let curvature = baseCurvature;
  if (graphCenter) {
    const midX = (sx + ex) / 2;
    const midY = (sy + ey) / 2;
    
    const normalAngle = angle - Math.PI / 2;
    const normalX = Math.cos(normalAngle);
    const normalY = Math.sin(normalAngle);

    const toMidpointX = midX - graphCenter.x;
    const toMidpointY = midY - graphCenter.y;

    const dotProduct = toMidpointX * normalX + toMidpointY * normalY;
    const direction = Math.sign(dotProduct) || 1;
    
    curvature = direction * Math.abs(baseCurvature);
  }

  if (curvature === 0) {
    linkGfx.moveTo(sx, sy);
    linkGfx.lineTo(ex, ey);
  } else {
    const midX = (sx + ex) / 2;
    const midY = (sy + ey) / 2;
    const normalAngle = angle - Math.PI / 2;
    const curveIntensity = Math.sqrt(dx * dx + dy * dy) * curvature;
    const ctrlX = midX + Math.cos(normalAngle) * curveIntensity;
    const ctrlY = midY + Math.sin(normalAngle) * curveIntensity;
    linkGfx.moveTo(sx, sy);
    linkGfx.quadraticCurveTo(ctrlX, ctrlY, ex, ey);
  }
  linkGfx.stroke({ width: 1.5, color: 0xabb8c3, alpha: 0.9 });

  const arrowSize = 8;
  const arrowAngle = Math.PI / 7;
  const p1x = ex - arrowSize * Math.cos(angle - arrowAngle);
  const p1y = ey - arrowSize * Math.sin(angle - arrowAngle);
  const p2x = ex - arrowSize * Math.cos(angle + arrowAngle);
  const p2y = ey - arrowSize * Math.sin(angle + arrowAngle);

  linkGfx.moveTo(ex, ey);
  linkGfx.lineTo(p1x, p1y);
  linkGfx.moveTo(ex, ey);
  linkGfx.lineTo(p2x, p2y);
  linkGfx.stroke({ width: 1.5, color: 0xabb8c3, alpha: 0.9 });
};

export const drawNode = (nodeData: GraphNode): PIXI.Container => {
    const nodeContainer = new PIXI.Container();
    nodeContainer.label = nodeData.id;

    const minWidth = 80, maxWidth = 180, padding = 16;
    const textStyle: PIXI.TextStyleOptions = { 
        fontFamily: `'Inter', sans-serif`, 
        fontSize: 14, 
        fill: 0x1a202c, 
        align: "center", 
        wordWrap: true, 
        wordWrapWidth: maxWidth - padding * 2, 
        lineHeight: 18 
    };

    const tempText = new PIXI.Text({ text: nodeData.label, style: textStyle });
    nodeData.width = Math.max(minWidth, tempText.width + padding * 2);
    nodeData.height = Math.max(40, tempText.height + padding * 2);
    tempText.destroy();

    const box = new PIXI.Graphics().roundRect(0, 0, nodeData.width, nodeData.height, 10).fill({color: 0xffffff, alpha: 0.9}).stroke({ width: 1, color: 0x000000, alpha: 0.1 });
    const text = new PIXI.Text({ text: nodeData.label, style: {...textStyle, wordWrapWidth: nodeData.width - 32}});
    text.resolution = 2;

    if (text.height > 18 * 3) {
        let truncatedText = nodeData.label;
        while(text.height > 18*3 && truncatedText.length > 0) {
            truncatedText = truncatedText.slice(0, -5) + "...";
            text.text = truncatedText;
        }
    }

    box.pivot.set(nodeData.width / 2, nodeData.height / 2);
    text.anchor.set(0.5);
    text.scale.set(1 / text.resolution);

    nodeContainer.addChild(box, text);
    nodeContainer.eventMode = "static";
    nodeContainer.cursor = "pointer";

    return nodeContainer;
}
