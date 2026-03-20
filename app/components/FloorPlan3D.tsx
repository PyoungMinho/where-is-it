"use client";

import { useRef, useState, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Mesh } from "three";
import type { Room, Opening } from "@/types/room";
import type { Location } from "@/types/location";
import type { Item } from "@/types/item";

const SCALE = 60;
const WALL_HEIGHT = 2.6;
const WALL_THICKNESS = 0.08;
const FURNITURE_HEIGHT = 0.85;
const FLOOR_THICKNESS = 0.06;
const DOOR_H = 2.1;
const WIN_SILL = 0.85;
const WIN_TOP = 1.85;

function buildWallSegs(wallLen: number, gaps: { s: number; e: number }[]) {
  const sorted = [...gaps].sort((a, b) => a.s - b.s);
  const segs: { s: number; e: number }[] = [];
  let cur = -wallLen / 2;
  for (const g of sorted) {
    if (g.s > cur) segs.push({ s: cur, e: g.s });
    cur = Math.max(cur, g.e);
  }
  if (cur < wallLen / 2) segs.push({ s: cur, e: wallLen / 2 });
  return segs;
}

function computeGap(op: Opening, wallLen: number) {
  const opW = op.width / SCALE;
  const inner = wallLen - 2 * WALL_THICKNESS;
  const gs = -wallLen / 2 + WALL_THICKNESS + op.position * Math.max(inner - opW, 0);
  return { gs, ge: gs + opW, gc: gs + opW / 2, opW };
}

function DoorOpening3D({ wallType, gc, opW, axis, wallPos }: {
  wallType: Opening["wall"]; gc: number; opW: number; axis: "x" | "z"; wallPos: number;
}) {
  const wt = WALL_THICKNESS + 0.01;
  const fw = 0.035;
  const panelW = opW - fw * 2;
  const panelH = DOOR_H - fw;
  const isNS = axis === "x";

  const fp = (a: number, y: number): [number, number, number] =>
    isNS ? [a, y, wallPos] : [wallPos, y, a];
  const fs = (l: number, h: number): [number, number, number] =>
    isNS ? [l, h, wt] : [wt, h, l];

  const hingeA = gc - opW / 2 + fw;
  const grpPos: [number, number, number] = isNS ? [hingeA, 0, wallPos] : [wallPos, 0, hingeA];
  // N,E → negative rot (opens into room); S,W → positive
  const rotSign = wallType === "s" || wallType === "w" ? 1 : -1;
  const grpRot: [number, number, number] = [0, rotSign * 1.3, 0];
  const meshPos: [number, number, number] = isNS ? [panelW / 2, panelH / 2 + fw, 0] : [0, panelH / 2 + fw, panelW / 2];
  const meshSz: [number, number, number] = isNS ? [panelW, panelH, 0.04] : [0.04, panelH, panelW];

  return (
    <group>
      <mesh position={fp(gc - opW / 2 + fw / 2, DOOR_H / 2)}><boxGeometry args={fs(fw, DOOR_H)} /><meshStandardMaterial color="#4a2e10" roughness={0.6} /></mesh>
      <mesh position={fp(gc + opW / 2 - fw / 2, DOOR_H / 2)}><boxGeometry args={fs(fw, DOOR_H)} /><meshStandardMaterial color="#4a2e10" roughness={0.6} /></mesh>
      <mesh position={fp(gc, DOOR_H - fw / 2)}><boxGeometry args={fs(opW, fw)} /><meshStandardMaterial color="#4a2e10" roughness={0.6} /></mesh>
      <group position={grpPos} rotation={grpRot}>
        <mesh castShadow position={meshPos}><boxGeometry args={meshSz} /><meshStandardMaterial color="#7a5530" roughness={0.5} /></mesh>
        <mesh position={isNS ? [panelW * 0.85, panelH * 0.45 + fw, 0.025] : [0.025, panelH * 0.45 + fw, panelW * 0.85]}>
          <sphereGeometry args={[0.022, 8, 8]} /><meshStandardMaterial color="#c8a840" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>
    </group>
  );
}

function WindowOpening3D({ gc, opW, axis, wallPos }: {
  wallType: Opening["wall"]; gc: number; opW: number; axis: "x" | "z"; wallPos: number;
}) {
  const wt = WALL_THICKNESS + 0.01;
  const fw = 0.025;
  const winH = WIN_TOP - WIN_SILL;
  const isNS = axis === "x";

  const fp = (a: number, y: number): [number, number, number] =>
    isNS ? [a, y, wallPos] : [wallPos, y, a];
  const fs = (l: number, h: number): [number, number, number] =>
    isNS ? [l, h, wt] : [wt, h, l];
  const glassPos: [number, number, number] = isNS ? [gc, WIN_SILL + winH / 2, wallPos] : [wallPos, WIN_SILL + winH / 2, gc];
  const glassSz: [number, number, number] = isNS ? [opW - fw * 2, winH - fw * 2, 0.008] : [0.008, winH - fw * 2, opW - fw * 2];

  return (
    <group>
      <mesh position={fp(gc, WIN_SILL + fw / 2)}><boxGeometry args={fs(opW, fw)} /><meshStandardMaterial color="#e0e0e0" roughness={0.4} /></mesh>
      <mesh position={fp(gc, WIN_TOP - fw / 2)}><boxGeometry args={fs(opW, fw)} /><meshStandardMaterial color="#e0e0e0" roughness={0.4} /></mesh>
      <mesh position={fp(gc - opW / 2 + fw / 2, WIN_SILL + winH / 2)}><boxGeometry args={fs(fw, winH)} /><meshStandardMaterial color="#e0e0e0" roughness={0.4} /></mesh>
      <mesh position={fp(gc + opW / 2 - fw / 2, WIN_SILL + winH / 2)}><boxGeometry args={fs(fw, winH)} /><meshStandardMaterial color="#e0e0e0" roughness={0.4} /></mesh>
      <mesh position={fp(gc, WIN_SILL + winH / 2)}><boxGeometry args={fs(fw * 0.6, winH)} /><meshStandardMaterial color="#e0e0e0" roughness={0.4} /></mesh>
      <mesh position={glassPos}><boxGeometry args={glassSz} /><meshStandardMaterial color="#8cc8f0" transparent opacity={0.4} roughness={0.05} metalness={0.1} /></mesh>
    </group>
  );
}

// 벽면 타입 판별
function getWallType(type: string): "floor" | "wall_n" | "wall_s" | "wall_e" | "wall_w" {
  if (type === "wall_n" || type === "wall_s" || type === "wall_e" || type === "wall_w") return type;
  return "floor";
}

function toX(px: number, w: number) { return (px + w / 2) / SCALE; }
function toZ(py: number, h: number) { return (py + h / 2) / SCALE; }
function toW(px: number) { return px / SCALE; }
function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

type Props = {
  rooms: Room[];
  locations: Location[];
  allItems: Item[];
  activeRoomId: string | null;
  selectedLocationId: string | null;
  onSelectRoom: (id: string) => void;
  onSelectLocation: (id: string) => void;
  onMoveLocation?: (id: string, x: number, y: number) => void;
  orbitRef?: React.RefObject<OrbitControlsImpl | null>;
};

// ── 벽면 설치 가구 ─────────────────────────────────────────────
function WallFurniture3D({
  loc, rw, rd, isSelected, itemCount, onClick,
}: {
  loc: Location; rw: number; rd: number;
  isSelected: boolean; itemCount: number; onClick: () => void;
}) {
  const wallType = getWallType(loc.type);
  const fw = toW(loc.width);
  const depth = 0.3; // wall cabinet depth
  const h = FURNITURE_HEIGHT;
  const mountHeight = loc.y / SCALE; // height from floor (y field reused)
  const posAlong = toX(loc.x, loc.width) - rw / 2; // horizontal position along wall

  // 벽 위치에 따라 박스 위치/색상 결정
  let posX = 0, posZ = 0;
  if (wallType === "wall_n") { posX = posAlong; posZ = -rd / 2 + WALL_THICKNESS + depth / 2; }
  else if (wallType === "wall_s") { posX = posAlong; posZ = rd / 2 - WALL_THICKNESS - depth / 2; }
  else if (wallType === "wall_e") { posX = rw / 2 - WALL_THICKNESS - depth / 2; posZ = posAlong; }
  else if (wallType === "wall_w") { posX = -rw / 2 + WALL_THICKNESS + depth / 2; posZ = posAlong; }

  const bodyColor = isSelected ? "#4F46E5" : "#7a5c3a";
  const topColor = isSelected ? "#6d60f0" : "#a07c52";

  return (
    <group position={[posX, mountHeight, posZ]}>
      {/* 본체 */}
      <mesh
        castShadow
        position={[0, h / 2, 0]}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
      >
        <boxGeometry args={[fw * 0.92, h, depth]} />
        <meshStandardMaterial color={bodyColor} roughness={0.6} metalness={0.05} />
      </mesh>
      {/* 윗면 */}
      <mesh position={[0, h + 0.005, 0]}>
        <boxGeometry args={[fw * 0.92, 0.01, depth]} />
        <meshStandardMaterial color={topColor} roughness={0.5} />
      </mesh>
      {/* 선반 */}
      {[0.3, 0.65].map((r, i) => (
        <mesh key={i} position={[0, h * r, 0]}>
          <boxGeometry args={[fw * 0.88, 0.012, depth * 0.9]} />
          <meshStandardMaterial color={isSelected ? "#312e81" : "#4a2e10"} roughness={0.8} />
        </mesh>
      ))}
      {/* 이름 */}
      <Text
        position={[0, h + 0.2, depth / 2 + 0.01]}
        fontSize={0.13}
        color={isSelected ? "#c7d2fe" : "#fff8f0"}
        anchorX="center" anchorY="middle"
        outlineWidth={0.008} outlineColor="#000"
      >
        {loc.name}
      </Text>
      {itemCount > 0 && (
        <Text
          position={[fw * 0.46 + 0.05, h + 0.1, depth / 2 + 0.01]}
          fontSize={0.12}
          color="#fff"
          anchorX="center" anchorY="middle"
          outlineWidth={0.01} outlineColor="#ef4444"
        >
          {`${itemCount}`}
        </Text>
      )}
      {/* 브래킷 */}
      {[-fw * 0.35, fw * 0.35].map((bx, i) => (
        <mesh key={i} position={[bx, h * 0.5, -depth / 2]}>
          <boxGeometry args={[0.03, h * 0.5, 0.04]} />
          <meshStandardMaterial color="#888" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

// ── 바닥 가구 (드래그 가능) ─────────────────────────────────────
function FloorFurniture3D({
  x, z, w, d, name, isSelected, itemCount, onClick, onDragStart, isDraggingThis,
  onMove, onUp,
}: {
  x: number; z: number; w: number; d: number; name: string;
  isSelected: boolean; itemCount: number; isDraggingThis: boolean;
  onClick: () => void;
  onDragStart: (grabX: number, grabZ: number) => void;
  onMove?: (x: number, z: number) => void;
  onUp?: () => void;
}) {
  const meshRef = useRef<Mesh>(null);
  const h = Math.max(FURNITURE_HEIGHT, Math.min(w, d) * 0.8);

  useFrame(() => {
    if (meshRef.current) {
      const target = isSelected ? 1.1 : 1.0;
      meshRef.current.scale.y += (target - meshRef.current.scale.y) * 0.1;
    }
  });

  return (
    <group position={[x, 0, z]}>
      <mesh
        ref={meshRef}
        castShadow receiveShadow
        position={[0, h / 2 + FLOOR_THICKNESS, 0]}
        onPointerDown={(e) => {
          e.stopPropagation();
          if (isSelected) {
            onDragStart(e.point.x, e.point.z);
          } else {
            onClick();
          }
        }}
        onPointerMove={(e) => {
          if (isDraggingThis) {
            e.stopPropagation();
            onMove?.(e.point.x, e.point.z);
          }
        }}
        onPointerUp={(e) => {
          if (isDraggingThis) {
            e.stopPropagation();
            onUp?.();
          }
        }}
      >
        <boxGeometry args={[w * 0.92, h, d * 0.92]} />
        <meshStandardMaterial
          color={isDraggingThis ? "#7c6fef" : isSelected ? "#4F46E5" : "#9b7a52"}
          roughness={0.6} metalness={0.05}
        />
      </mesh>
      <mesh position={[0, h + FLOOR_THICKNESS + 0.005, 0]}>
        <boxGeometry args={[w * 0.92, 0.01, d * 0.92]} />
        <meshStandardMaterial color={isSelected ? "#6d60f0" : "#c4956a"} roughness={0.5} />
      </mesh>
      {[0.3, 0.6].map((ratio, i) => (
        <mesh key={i} position={[0, h * ratio + FLOOR_THICKNESS, 0]}>
          <boxGeometry args={[w * 0.88, 0.015, d * 0.88]} />
          <meshStandardMaterial color={isSelected ? "#312e81" : "#5a3e20"} roughness={0.8} />
        </mesh>
      ))}
      <Text
        position={[0, h + FLOOR_THICKNESS + 0.22, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.14}
        color={isSelected ? "#c7d2fe" : "#fff8f0"}
        anchorX="center" anchorY="middle"
        outlineWidth={0.008} outlineColor="#000"
      >
        {name}
      </Text>
      {itemCount > 0 && (
        <Text
          position={[w * 0.46 + 0.05, h + FLOOR_THICKNESS + 0.12, -d * 0.46 - 0.05]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.13} color="#fff"
          anchorX="center" anchorY="middle"
          outlineWidth={0.01} outlineColor="#ef4444"
        >
          {`${itemCount}`}
        </Text>
      )}
    </group>
  );
}

// ── 방 ────────────────────────────────────────────────────────
function Room3D({
  room, isActive, locations, allItems, selectedLocationId,
  onSelectRoom, onSelectLocation, onMoveLocation, orbitRef,
}: {
  room: Room; isActive: boolean;
  locations: Location[]; allItems: Item[];
  selectedLocationId: string | null;
  onSelectRoom: (id: string) => void;
  onSelectLocation: (id: string) => void;
  onMoveLocation?: (id: string, x: number, y: number) => void;
  orbitRef?: React.RefObject<OrbitControlsImpl | null>;
}) {
  const rx = toX(room.x, room.width);
  const rz = toZ(room.y, room.height);
  const rw = toW(room.width);
  const rd = toW(room.height);

  const [draggingLocId, setDraggingLocId] = useState<string | null>(null);
  // 드래그 중 임시 위치 — useState로 관리 (렌더 중 접근 가능)
  const [tempPos, setTempPos] = useState<{ x: number; z: number } | null>(null);
  const dragOffset = useRef<{ x: number; z: number }>({ x: 0, z: 0 });

  const startDrag = useCallback((locId: string, grabX: number, grabZ: number, currentLx: number, currentLz: number) => {
    setDraggingLocId(locId);
    setTempPos({ x: currentLx, z: currentLz });
    dragOffset.current = { x: grabX - rx - currentLx, z: grabZ - rz - currentLz };
    if (orbitRef?.current) orbitRef.current.enabled = false;
  }, [rx, rz, orbitRef]);

  const handleFloorMove = useCallback((px: number, pz: number) => {
    if (!draggingLocId) return;
    const loc = locations.find(l => l.id === draggingLocId);
    if (!loc) return;
    const fw = toW(loc.width) * 0.92 / 2;
    const fd = toW(loc.height) * 0.92 / 2;
    const newLx = clamp(px - rx - dragOffset.current.x, -rw / 2 + fw, rw / 2 - fw);
    const newLz = clamp(pz - rz - dragOffset.current.z, -rd / 2 + fd, rd / 2 - fd);
    setTempPos({ x: newLx, z: newLz });
  }, [draggingLocId, locations, rx, rz, rw, rd]);

  const handleFloorUp = useCallback(() => {
    if (!draggingLocId || !tempPos) return;
    const loc = locations.find(l => l.id === draggingLocId);
    if (loc) {
      const newX = Math.round((tempPos.x + rw / 2) * SCALE - loc.width / 2);
      const newY = Math.round((tempPos.z + rd / 2) * SCALE - loc.height / 2);
      onMoveLocation?.(loc.id, newX, newY);
    }
    setDraggingLocId(null);
    setTempPos(null);
    if (orbitRef?.current) orbitRef.current.enabled = true;
  }, [draggingLocId, tempPos, locations, rw, rd, onMoveLocation, orbitRef]);

  const wallColor = isActive ? "#3d3d3d" : "#2c2c2c";
  const floorColor = isActive ? "#fff5e8" : "#f0e3c8";
  const accentColor = isActive ? "#4F46E5" : "#2c2c2c";

  return (
    <group position={[rx, 0, rz]}>
      {/* 바닥 (드래그 추적용 큰 hitbox 포함) */}
      <mesh receiveShadow position={[0, 0, 0]}
        onPointerMove={(e) => handleFloorMove(e.point.x, e.point.z)}
        onPointerUp={handleFloorUp}
        onPointerLeave={handleFloorUp}
        onClick={(e) => { if (!draggingLocId) { e.stopPropagation(); onSelectRoom(room.id); } }}
      >
        <boxGeometry args={[rw, FLOOR_THICKNESS, rd]} />
        <meshStandardMaterial color={floorColor} roughness={0.85} />
      </mesh>
      <mesh receiveShadow position={[0, FLOOR_THICKNESS / 2 + 0.001, 0]}
        onPointerMove={(e) => handleFloorMove(e.point.x, e.point.z)}
        onPointerUp={handleFloorUp}
        onClick={(e) => { if (!draggingLocId) { e.stopPropagation(); onSelectRoom(room.id); } }}
      >
        <boxGeometry args={[rw - WALL_THICKNESS * 2, 0.001, rd - WALL_THICKNESS * 2]} />
        <meshStandardMaterial color={isActive ? "#f5e8d0" : "#e8d5b0"} roughness={0.9} />
      </mesh>

      {isActive && (
        <mesh position={[0, FLOOR_THICKNESS + 0.005, 0]}>
          <boxGeometry args={[rw, 0.01, rd]} />
          <meshStandardMaterial color="#4F46E5" transparent opacity={0.15} />
        </mesh>
      )}

      {/* 4면 벽 (문/창문 갭 포함) */}
      {(["n", "s", "w", "e"] as const).map((wt) => {
        const isNS = wt === "n" || wt === "s";
        const len = isNS ? rw : rd;
        const wallPos = wt === "n" ? -rd / 2 + WALL_THICKNESS / 2
          : wt === "s" ? rd / 2 - WALL_THICKNESS / 2
          : wt === "w" ? -rw / 2 + WALL_THICKNESS / 2
          : rw / 2 - WALL_THICKNESS / 2;
        const axis = isNS ? "x" as const : "z" as const;

        const wallOps = (room.openings ?? []).filter(op => op.wall === wt);
        const gaps = wallOps.map(op => {
          const g = computeGap(op, len);
          return { ...g, op };
        });
        const segs = buildWallSegs(len, gaps.map(g => ({ s: g.gs, e: g.ge })));

        const sp = (a: number, y: number): [number, number, number] =>
          isNS ? [a, y, wallPos] : [wallPos, y, a];
        const ss = (l: number, hh: number): [number, number, number] =>
          isNS ? [l, hh, WALL_THICKNESS] : [WALL_THICKNESS, hh, l];

        return (
          <group key={wt}>
            {segs.map((seg, i) => {
              const sl = seg.e - seg.s;
              const sc = (seg.s + seg.e) / 2;
              return (
                <mesh key={i} castShadow receiveShadow position={sp(sc, WALL_HEIGHT / 2)}
                  onClick={(e) => { e.stopPropagation(); onSelectRoom(room.id); }}
                >
                  <boxGeometry args={ss(sl, WALL_HEIGHT)} />
                  <meshStandardMaterial color={wallColor} roughness={0.7} />
                </mesh>
              );
            })}

            {gaps.map(({ op, gc, opW }) => (
              <group key={op.id}>
                {op.type === "door" ? (
                  <>
                    {/* 문 위 인방 */}
                    <mesh castShadow receiveShadow position={sp(gc, DOOR_H + (WALL_HEIGHT - DOOR_H) / 2)}
                      onClick={(e) => { e.stopPropagation(); onSelectRoom(room.id); }}
                    >
                      <boxGeometry args={ss(opW, WALL_HEIGHT - DOOR_H)} />
                      <meshStandardMaterial color={wallColor} roughness={0.7} />
                    </mesh>
                    <DoorOpening3D wallType={op.wall} gc={gc} opW={opW} axis={axis} wallPos={wallPos} />
                  </>
                ) : (
                  <>
                    {/* 창문 아래 벽 */}
                    <mesh castShadow receiveShadow position={sp(gc, WIN_SILL / 2)}
                      onClick={(e) => { e.stopPropagation(); onSelectRoom(room.id); }}
                    >
                      <boxGeometry args={ss(opW, WIN_SILL)} />
                      <meshStandardMaterial color={wallColor} roughness={0.7} />
                    </mesh>
                    {/* 창문 위 벽 */}
                    <mesh castShadow receiveShadow position={sp(gc, WIN_TOP + (WALL_HEIGHT - WIN_TOP) / 2)}
                      onClick={(e) => { e.stopPropagation(); onSelectRoom(room.id); }}
                    >
                      <boxGeometry args={ss(opW, WALL_HEIGHT - WIN_TOP)} />
                      <meshStandardMaterial color={wallColor} roughness={0.7} />
                    </mesh>
                    <WindowOpening3D wallType={op.wall} gc={gc} opW={opW} axis={axis} wallPos={wallPos} />
                  </>
                )}
              </group>
            ))}

            {isActive && (
              <mesh position={sp(0, WALL_HEIGHT + 0.01)}>
                <boxGeometry args={isNS ? [len, 0.025, WALL_THICKNESS] : [WALL_THICKNESS, 0.025, len]} />
                <meshStandardMaterial color={accentColor} />
              </mesh>
            )}
          </group>
        );
      })}

      <Text
        position={[0, WALL_HEIGHT + 0.2, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.22}
        color={isActive ? "#c7d2fe" : "#ffffff"}
        anchorX="center" anchorY="middle"
        outlineWidth={0.015} outlineColor="#000"
      >
        {room.name}
      </Text>

      {/* 수납공간 */}
      {locations.filter(l => l.room_id === room.id).map(loc => {
        const wallType = getWallType(loc.type);
        const isSelected = selectedLocationId === loc.id;
        const itemCount = allItems.filter(i => i.location_id === loc.id).length;

        if (wallType !== "floor") {
          return (
            <WallFurniture3D
              key={loc.id}
              loc={loc}
              rw={rw}
              rd={rd}
              isSelected={isSelected}
              itemCount={itemCount}
              onClick={() => onSelectLocation(loc.id)}
            />
          );
        }

        const isDraggingThis = draggingLocId === loc.id;
        const lx = isDraggingThis && tempPos ? tempPos.x : toX(loc.x, loc.width) - rw / 2;
        const lz = isDraggingThis && tempPos ? tempPos.z : toZ(loc.y, loc.height) - rd / 2;
        const lw = toW(loc.width);
        const ld = toW(loc.height);

        return (
          <FloorFurniture3D
            key={loc.id}
            x={lx} z={lz} w={lw} d={ld}
            name={loc.name}
            isSelected={isSelected}
            itemCount={itemCount}
            isDraggingThis={isDraggingThis}
            onClick={() => onSelectLocation(loc.id)}
            onDragStart={(grabX, grabZ) => startDrag(loc.id, grabX, grabZ, lx, lz)}
            onMove={(px, pz) => handleFloorMove(px, pz)}
            onUp={handleFloorUp}
          />
        );
      })}
    </group>
  );
}

function Ground() {
  return (
    <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
      <planeGeometry args={[40, 40]} />
      <meshStandardMaterial color="#f0f0f0" roughness={0.9} />
    </mesh>
  );
}

// ── 메인 씬 ───────────────────────────────────────────────────
export default function FloorPlan3D({
  rooms, locations, allItems,
  activeRoomId, selectedLocationId,
  onSelectRoom, onSelectLocation, onMoveLocation,
}: Props) {
  const orbitRef = useRef<OrbitControlsImpl | null>(null);

  const cx = rooms.length > 0
    ? rooms.reduce((s, r) => s + toX(r.x, r.width), 0) / rooms.length : 0;
  const cz = rooms.length > 0
    ? rooms.reduce((s, r) => s + toZ(r.y, r.height), 0) / rooms.length : 0;

  return (
    <Canvas
      shadows
      frameloop="demand"
      camera={{ position: [cx + 8, 10, cz + 8], fov: 45 }}
      style={{ width: "100%", height: "100%", background: "transparent" }}
      gl={{ antialias: true, powerPreference: "default" }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener("webglcontextlost", (e) => { e.preventDefault(); }, false);
      }}
    >
      <ambientLight intensity={0.45} />
      <directionalLight
        castShadow
        position={[cx + 6, 12, cz - 4]}
        intensity={1.4}
        shadow-mapSize={[512, 512]}
        shadow-camera-near={0.5}
        shadow-camera-far={50}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
        shadow-bias={-0.001}
      />
      <directionalLight position={[cx - 4, 6, cz + 8]} intensity={0.35} color="#b8d4ff" />
      <hemisphereLight args={["#e8f0ff", "#d0c8b8", 0.5]} />
      <Ground />

      {rooms.map(room => (
        <Room3D
          key={room.id}
          room={room}
          isActive={activeRoomId === room.id}
          locations={locations}
          allItems={allItems}
          selectedLocationId={selectedLocationId}
          onSelectRoom={onSelectRoom}
          onSelectLocation={onSelectLocation}
          onMoveLocation={onMoveLocation}
          orbitRef={orbitRef}
        />
      ))}

      <OrbitControls
        ref={orbitRef}
        target={[cx, 0, cz]}
        enablePan enableZoom enableRotate
        minDistance={3} maxDistance={30}
        maxPolarAngle={Math.PI / 2.1}
      />
    </Canvas>
  );
}
