export const ARM_VIEWBOX = {w: 220, h: 320};
export const ARM_PIVOT = {x: 180, y: 28};
const ARM_TIP = {x: 13, y: 313};

export interface StageLayout {
  width: number;
  height: number;
  vinyl: number;
  vinylLeft: number;
  vinylTop: number;
  armWidth: number;
  armHeight: number;
  armLeft: number;
  armTop: number;
  pivotInArmX: number;
  pivotInArmY: number;
  restDeg: number;
  startDeg: number;
  endDeg: number;
}

const deg = (rad: number) => (rad * 180) / Math.PI;

export function computeStageLayout(
  screenWidth: number,
  screenHeight: number,
): StageLayout {
  const vinyl = Math.max(
    180,
    Math.min(screenWidth - 64, 300, screenHeight - 440),
  );
  const cx = screenWidth / 2;
  const cy = 52 + vinyl / 2;
  const pivotX = screenWidth - 42;
  const pivotY = 20;

  const d = Math.hypot(pivotX - cx, pivotY - cy);
  const ux = ARM_TIP.x - ARM_PIVOT.x;
  const uy = ARM_TIP.y - ARM_PIVOT.y;
  const armLen = Math.hypot(ux, uy);

  const reach = d + vinyl * 0.21;
  const scale = reach / armLen;
  const rOut = vinyl * 0.45;

  const endDeg =
    deg(Math.atan2(cy - pivotY, cx - pivotX)) - deg(Math.atan2(uy, ux));
  const cosSweep = (reach * reach + d * d - rOut * rOut) / (2 * reach * d);
  const sweep = deg(Math.acos(Math.min(1, Math.max(-1, cosSweep))));

  const armWidth = ARM_VIEWBOX.w * scale;
  const armHeight = ARM_VIEWBOX.h * scale;
  const pivotInArmX = ARM_PIVOT.x * scale;
  const pivotInArmY = ARM_PIVOT.y * scale;

  return {
    width: screenWidth,
    height: vinyl + 90,
    vinyl,
    vinylLeft: cx - vinyl / 2,
    vinylTop: 52,
    armWidth,
    armHeight,
    armLeft: pivotX - pivotInArmX,
    armTop: pivotY - pivotInArmY,
    pivotInArmX,
    pivotInArmY,
    restDeg: endDeg - sweep - 12,
    startDeg: endDeg - sweep,
    endDeg,
  };
}
