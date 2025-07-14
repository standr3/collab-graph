/**
 * Configuration constants for the graph visualization.
 */

// --- Simulation Settings ---
export const LINK_DISTANCE = 200;
export const CHARGE_STRENGTH = -1000;
export const CENTER_STRENGTH = 0.1;
export const SIMULATION_ALPHA = 0.3;
export const DRAG_ALPHA_TARGET = 0.3;

// --- Node Settings ---
export const NODE_MIN_WIDTH = 80;
export const NODE_MAX_WIDTH = 180;
export const NODE_PADDING = 16;
export const NODE_FONT_SIZE = 14;
export const NODE_LINE_HEIGHT = 18;
export const NODE_BORDER_RADIUS = 10;
export const NODE_STROKE_UNPINNED = { width: 1, color: 0x000000, alpha: 0.1 };
export const NODE_STROKE_PINNED = { width: 2, color: 0x1a202c, alpha: 0.8 };
export const NODE_FILL_COLOR = { color: 0xffffff, alpha: 0.9 };
export const NODE_TEXT_COLOR = 0x1a202c;
export const NODE_FONT_FAMILY = `'Inter', sans-serif`;

// --- Link Settings ---
export const LINK_STROKE = { width: 1.5, color: 0xabb8c3, alpha: 0.9 };
export const LINK_ARROW_PADDING = 3;
export const ARROW_SIZE = 8;
export const ARROW_ANGLE = Math.PI / 7;
export const LINK_BASE_CURVATURE = 0.15;
export const LINK_CURVATURE_STEP = 0.25;
export const LINK_CURVATURE_STANDARD_DISTANCE = 300;

// --- Pin Button Settings ---
export const PIN_BUTTON_PADDING = 5;
export const PIN_BUTTON_SIZE = 16;
export const PIN_BUTTON_COLOR_PINNED = 0x1a202c;
export const PIN_BUTTON_COLOR_UNPINNED = 0xaaaaaa;
