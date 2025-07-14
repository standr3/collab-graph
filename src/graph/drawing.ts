import * as PIXI from 'pixi.js';
import { type Node as GraphNode } from './store';
import {
  LINK_ARROW_PADDING,
  ARROW_SIZE,
  ARROW_ANGLE,
  LINK_STROKE,
  LINK_CURVATURE_STANDARD_DISTANCE,
  NODE_MIN_WIDTH,
  NODE_MAX_WIDTH,
  NODE_PADDING,
  NODE_FONT_FAMILY,
  NODE_FONT_SIZE,
  NODE_TEXT_COLOR,
  NODE_LINE_HEIGHT,
  NODE_BORDER_RADIUS,
  NODE_FILL_COLOR,
  NODE_STROKE_PINNED,
  NODE_STROKE_UNPINNED,
  PIN_BUTTON_PADDING,
  PIN_BUTTON_SIZE,
  PIN_BUTTON_COLOR_PINNED,
  PIN_BUTTON_COLOR_UNPINNED,
} from './config';

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

  sx += LINK_ARROW_PADDING * Math.cos(angle);
  sy += LINK_ARROW_PADDING * Math.sin(angle);
  ex -= LINK_ARROW_PADDING * Math.cos(angle);
  ey -= LINK_ARROW_PADDING * Math.sin(angle);

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
      
      const distanceFactor = Math.min(len_se / LINK_CURVATURE_STANDARD_DISTANCE, 1.0);
      
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
  linkGfx.stroke(LINK_STROKE);

  const p1x = ex - ARROW_SIZE * Math.cos(arrowheadAngle - ARROW_ANGLE);
  const p1y = ey - ARROW_SIZE * Math.sin(arrowheadAngle - ARROW_ANGLE);
  const p2x = ex - ARROW_SIZE * Math.cos(arrowheadAngle + ARROW_ANGLE);
  const p2y = ey - ARROW_SIZE * Math.sin(arrowheadAngle + ARROW_ANGLE);

  linkGfx.moveTo(ex, ey);
  linkGfx.lineTo(p1x, p1y);
  linkGfx.moveTo(ex, ey);
  linkGfx.lineTo(p2x, p2y);
  linkGfx.stroke(LINK_STROKE);
};

export const drawNode = (
  nodeData: GraphNode,
  onPinToggle: (nodeId: string) => void,
  pinSvgData: PIXI.GraphicsContext
): PIXI.Container => {
    const nodeContainer = new PIXI.Container();
    nodeContainer.label = nodeData.id;

    const textStyle: PIXI.TextStyleOptions = { 
        fontFamily: NODE_FONT_FAMILY, 
        fontSize: NODE_FONT_SIZE, 
        fill: NODE_TEXT_COLOR, 
        align: "center", 
        wordWrap: true, 
        wordWrapWidth: NODE_MAX_WIDTH - NODE_PADDING * 2, 
        lineHeight: NODE_LINE_HEIGHT 
    };

    const tempText = new PIXI.Text({ text: nodeData.label, style: textStyle });
    nodeData.width = Math.max(NODE_MIN_WIDTH, tempText.width + NODE_PADDING * 2);
    nodeData.height = Math.max(40, tempText.height + NODE_PADDING * 2);
    tempText.destroy();

    const box = new PIXI.Graphics();
    const text = new PIXI.Text({ text: nodeData.label, style: {...textStyle, wordWrapWidth: nodeData.width - 32}});
    text.resolution = 2;

    const redrawBox = (isPinned: boolean) => {
        box.clear();
        const style = isPinned ? NODE_STROKE_PINNED : NODE_STROKE_UNPINNED;
        box.roundRect(0, 0, nodeData.width, nodeData.height, NODE_BORDER_RADIUS)
           .fill(NODE_FILL_COLOR)
           .stroke(style);
    };

    redrawBox(!!nodeData.pinned);

    if (text.height > NODE_LINE_HEIGHT * 3) {
        let truncatedText = nodeData.label;
        while(text.height > NODE_LINE_HEIGHT*3 && truncatedText.length > 0) {
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
    
    const scale = PIN_BUTTON_SIZE / Math.max(pinButton.width, pinButton.height);
    pinButton.scale.set(scale);
    
    // Set the pivot to the center of the graphics bounds
    const bounds = pinButton.getBounds();
    pinButton.pivot.set(bounds.width / 2 / scale, bounds.height / 2 / scale);

    const pinX = nodeData.width / 2 - PIN_BUTTON_PADDING;
    const pinY = -nodeData.height / 2 + PIN_BUTTON_PADDING;

    const setPinButtonState = (isPinned: boolean) => {
        pinButton.tint = isPinned ? PIN_BUTTON_COLOR_PINNED : PIN_BUTTON_COLOR_UNPINNED;
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
