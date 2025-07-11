import * as PIXI from 'pixi.js';
import { type Node as GraphNode } from './store';
import pinIconUrl from '../assets/pin.svg';

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
  let controlPointBase = { x: (sx + ex) / 2, y: (sy + ey) / 2 };

  if (graphCenter) {
    const v_se_x = ex - sx;
    const v_se_y = ey - sy;
    const len_se = Math.sqrt(v_se_x * v_se_x + v_se_y * v_se_y);

    if (len_se > 1e-6) {
      const v_sc_x = graphCenter.x - sx;
      const v_sc_y = graphCenter.y - sy;
      const len_sc = Math.sqrt(v_sc_x * v_sc_x + v_sc_y * v_sc_y);

      let cos_theta = 0;
      if (len_sc > 1e-6) {
        const dot_se_sc = v_se_x * v_sc_x + v_se_y * v_sc_y;
        cos_theta = dot_se_sc / (len_se * len_sc);
      }

      // 1. Calculate combined curvature magnitude
      const sin_theta = Math.sqrt(1 - Math.max(0, Math.min(1, cos_theta * cos_theta)));
      
      const standardDistance = 300;
      const distanceFactor = Math.min(len_se / standardDistance, 1.0);
      
      let magnitude = (Math.abs(baseCurvature) + 0.15) * sin_theta * distanceFactor;

      // 2. Determine outward direction
      const midX = (sx + ex) / 2;
        const midY = (sy + ey) / 2;
        const normalAngle = angle - Math.PI / 2;
        const normalX = Math.cos(normalAngle);
        const normalY = Math.sin(normalAngle);
        const toMidpointX = midX - graphCenter.x;
        const toMidpointY = midY - graphCenter.y;
        const dotProduct = toMidpointX * normalX + toMidpointY * normalY;
        const direction = Math.sign(dotProduct) || 1;
        
        curvature = direction * magnitude;
    }
  }

  let arrowheadAngle = angle;
  if (curvature === 0) {
    linkGfx.moveTo(sx, sy);
    linkGfx.lineTo(ex, ey);
  } else {
    const normalAngle = angle - Math.PI / 2;
    const curveIntensity = Math.sqrt(dx * dx + dy * dy) * curvature;
    const ctrlX = controlPointBase.x + Math.cos(normalAngle) * curveIntensity;
    const ctrlY = controlPointBase.y + Math.sin(normalAngle) * curveIntensity;
    linkGfx.moveTo(sx, sy);
    linkGfx.quadraticCurveTo(ctrlX, ctrlY, ex, ey);
    arrowheadAngle = Math.atan2(ey - ctrlY, ex - ctrlX);
  }
  linkGfx.stroke({ width: 1.5, color: 0xabb8c3, alpha: 0.9 });

  const arrowSize = 8;
  const arrowAngle = Math.PI / 7;
  const p1x = ex - arrowSize * Math.cos(arrowheadAngle - arrowAngle);
  const p1y = ey - arrowSize * Math.sin(arrowheadAngle - arrowAngle);
  const p2x = ex - arrowSize * Math.cos(arrowheadAngle + arrowAngle);
  const p2y = ey - arrowSize * Math.sin(arrowheadAngle + arrowAngle);

  linkGfx.moveTo(ex, ey);
  linkGfx.lineTo(p1x, p1y);
  linkGfx.moveTo(ex, ey);
  linkGfx.lineTo(p2x, p2y);
  linkGfx.stroke({ width: 1.5, color: 0xabb8c3, alpha: 0.9 });
};

export const drawNode = (
  nodeData: GraphNode,
  onPinToggle: (nodeId: string) => void,
  pinSvgData: PIXI.GraphicsContext
): PIXI.Container => {
    const nodeContainer = new PIXI.Container();
    nodeContainer.name = nodeData.id;

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

    const box = new PIXI.Graphics();
    const text = new PIXI.Text({ text: nodeData.label, style: {...textStyle, wordWrapWidth: nodeData.width - 32}});
    text.resolution = 2;

    const pinnedStyle = { width: 2, color: 0x1a202c, alpha: 0.8 };
    const unpinnedStyle = { width: 1, color: 0x000000, alpha: 0.1 };

    const redrawBox = (isPinned: boolean) => {
        box.clear();
        const style = isPinned ? pinnedStyle : unpinnedStyle;
        box.roundRect(0, 0, nodeData.width, nodeData.height, 10)
           .fill({ color: 0xffffff, alpha: 0.9 })
           .stroke(style);
    };

    redrawBox(!!nodeData.pinned);

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

    // Pin button
    const pinButton = new PIXI.Graphics(pinSvgData);
    
    const scale = 16 / Math.max(pinButton.width, pinButton.height);
    pinButton.scale.set(scale);
    
    // Set the pivot to the center of the graphics bounds
    const bounds = pinButton.getBounds();
    pinButton.pivot.set(bounds.width / 2 / scale, bounds.height / 2 / scale);

    const pinPadding = 5;
    const pinX = nodeData.width / 2 - pinPadding;
    const pinY = -nodeData.height / 2 + pinPadding;

    const setPinButtonState = (isPinned: boolean) => {
        pinButton.tint = isPinned ? 0x1a202c : 0xaaaaaa;
    };

    setPinButtonState(!!nodeData.pinned);
    pinButton.position.set(pinX, pinY);
    pinButton.eventMode = 'static';
    pinButton.cursor = 'pointer';
    
    pinButton.on('pointerdown', (e) => {
        if (e.button === 0) {
            e.stopPropagation();
            onPinToggle(nodeData.id);
        }
    });

    nodeContainer.addChild(pinButton);
    
    // Update pin visual state when node data changes
    (nodeContainer as any).updatePin = (isPinned: boolean) => {
        setPinButtonState(isPinned);
        redrawBox(isPinned);
    };

    nodeContainer.eventMode = "static";
    nodeContainer.cursor = "pointer";

    return nodeContainer;
}
