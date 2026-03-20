"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Rnd } from "react-rnd";
import { supabase } from "@/lib/supabase";
import type { Room, Opening } from "@/types/room";
import type { Location } from "@/types/location";
import type { Item } from "@/types/item";

const FloorPlan3D = dynamic(() => import("./components/FloorPlan3D"), {
  ssr: false,
});

type Home = {
  id: string;
  name: string;
  created_at: string;
};

export default function HomePage() {
  const [homes, setHomes] = useState<Home[]>([]);
  const [selectedHomeId, setSelectedHomeId] = useState<string | null>(null);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [newRoomName, setNewRoomName] = useState("");
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  const [locations, setLocations] = useState<Location[]>([]);
  const [newLocationName, setNewLocationName] = useState("");

  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    null,
  );

  const [items, setItems] = useState<Item[]>([]);
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [newItemName, setNewItemName] = useState("");

  const [itemSearchQuery, setItemSearchQuery] = useState("");

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");

  const [opDrag, setOpDrag] = useState<{
    roomId: string;
    openingId: string;
    wall: Opening["wall"];
    startPos: number;
    startClient: { x: number; y: number };
    roomW: number;
    roomH: number;
    opW: number;
    curPos: number;
  } | null>(null);
  // 3D Canvas는 처음 3D 모드 진입 시 한 번만 마운트 (hidden 상태 초기 마운트 방지)
  const [has3DInitialized, setHas3DInitialized] = useState(false);

  const fetchHomes = async () => {
    const { data, error } = await supabase
      .from("homes")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("homes fetch error:", error);
      return;
    }

    const homeList = (data as Home[]) || [];
    setHomes(homeList);

    if (homeList.length > 0 && !selectedHomeId) {
      setSelectedHomeId(homeList[0].id);
    }
  };

  const fetchRooms = async (homeId: string) => {
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("home_id", homeId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("rooms fetch error:", error);
      return;
    }

    setRooms((data as Room[]) || []);
  };

  const refreshAllItems = async (targetLocations: Location[]) => {
    if (targetLocations.length === 0) {
      setAllItems([]);
      return;
    }

    const locationIds = targetLocations.map((location) => location.id);

    const { data, error } = await supabase
      .from("items")
      .select("*")
      .in("location_id", locationIds)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("items fetch (all) error:", error);
      return;
    }

    setAllItems((data as Item[]) || []);
  };

  const fetchLocations = async (roomIds: string[]) => {
    if (roomIds.length === 0) {
      setLocations([]);
      setAllItems([]);
      return;
    }

    const { data, error } = await supabase
      .from("locations")
      .select("*")
      .in("room_id", roomIds)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("locations fetch error:", error);
      return;
    }

    const locationList = (data as Location[]) || [];
    setLocations(locationList);
    await refreshAllItems(locationList);
  };

  const fetchItems = async (locationId: string) => {
    const { data, error } = await supabase
      .from("items")
      .select("*")
      .eq("location_id", locationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("items fetch error:", error);
      return;
    }

    setItems((data as Item[]) || []);
  };

  const [newHomeName, setNewHomeName] = useState("");
  const [editingHomeId, setEditingHomeId] = useState<string | null>(null);
  const [editingHomeName, setEditingHomeName] = useState("");

  const addHome = async () => {
    const name = newHomeName.trim() || "우리집";
    const { error } = await supabase.from("homes").insert([{ name }]);

    if (error) {
      console.error("home insert error:", error);
      return;
    }

    setNewHomeName("");
    await fetchHomes();
  };

  const renameHome = async (id: string, name: string) => {
    if (!name.trim()) return;
    const { error } = await supabase.from("homes").update({ name: name.trim() }).eq("id", id);
    if (error) { console.error("home rename error:", error); return; }
    setEditingHomeId(null);
    await fetchHomes();
  };

  const addRoom = async () => {
    if (!selectedHomeId) {
      alert("먼저 집을 만들어야 해");
      return;
    }

    if (!newRoomName.trim()) {
      alert("방 이름을 입력해줘");
      return;
    }

    const { error } = await supabase.from("rooms").insert([
      {
        home_id: selectedHomeId,
        name: newRoomName,
        x: 20 + rooms.length * 20,
        y: 20 + rooms.length * 20,
        width: 180,
        height: 140,
        color: "#3b82f6",
      },
    ]);

    if (error) {
      console.error("room insert error:", error);
      return;
    }

    setNewRoomName("");
    await fetchRooms(selectedHomeId);
  };

  const addLocation = async () => {
    if (rooms.length === 0) {
      alert("먼저 방을 만들어야 해");
      return;
    }

    if (!activeRoomId) {
      alert("수납공간을 배치할 방을 먼저 선택해줘");
      return;
    }

    if (!newLocationName.trim()) {
      alert("수납공간 이름을 입력해줘");
      return;
    }

    const targetRoom = rooms.find((room) => room.id === activeRoomId);

    if (!targetRoom) {
      alert("선택한 방을 찾을 수 없어요. 다시 시도해줘");
      return;
    }

    const locationsInRoom = locations.filter(
      (l) => l.room_id === targetRoom.id,
    );

    const { error } = await supabase.from("locations").insert([
      {
        room_id: targetRoom.id,
        name: newLocationName,
        type: "storage",
        x: 10 + locationsInRoom.length * 10,
        y: 10 + locationsInRoom.length * 10,
        width: 90,
        height: 60,
        color: "#ffffff",
      },
    ]);

    if (error) {
      console.error("location insert error:", error);
      return;
    }

    setNewLocationName("");
    await fetchLocations(rooms.map((room) => room.id));
  };

  const addItem = async () => {
    if (!selectedLocationId) {
      alert("먼저 수납공간을 선택해줘");
      return;
    }

    if (!newItemName.trim()) {
      alert("물건 이름을 입력해줘");
      return;
    }

    const { error } = await supabase.from("items").insert([
      {
        location_id: selectedLocationId,
        name: newItemName,
        category: "etc",
        memo: "",
        quantity: 1,
        color: "#f59e0b",
      },
    ]);

    if (error) {
      console.error("item insert error:", error);
      return;
    }

    setNewItemName("");
    await fetchItems(selectedLocationId);
    await refreshAllItems(locations);
  };

  const updateRoomLayout = async (
    roomId: string,
    updates: { x: number; y: number; width: number; height: number },
  ) => {
    const { error } = await supabase
      .from("rooms")
      .update(updates)
      .eq("id", roomId);

    if (error) {
      console.error("room update error:", error);
      return;
    }

    if (selectedHomeId) {
      await fetchRooms(selectedHomeId);
    }
  };

  const updateRoomOpenings = async (roomId: string, openings: Opening[]) => {
    const { error } = await supabase
      .from("rooms")
      .update({ openings })
      .eq("id", roomId);

    if (error) {
      console.error("openings update error:", error);
      return;
    }

    setRooms((prev) =>
      prev.map((r) => (r.id === roomId ? { ...r, openings } : r)),
    );
  };

  const handleOpDragMove = (e: React.MouseEvent) => {
    if (!opDrag) return;
    const isNS = opDrag.wall === "n" || opDrag.wall === "s";
    const innerLen = isNS ? opDrag.roomW - 20 : opDrag.roomH - 20;
    const maxTravel = Math.max(innerLen - opDrag.opW, 1);
    const rawDelta = isNS
      ? (e.clientX - opDrag.startClient.x) / zoom
      : (e.clientY - opDrag.startClient.y) / zoom;
    const newPos = Math.max(0, Math.min(1, opDrag.startPos + rawDelta / maxTravel));
    setOpDrag((prev) => (prev ? { ...prev, curPos: newPos } : null));
  };

  const handleOpDragEnd = () => {
    if (!opDrag) return;
    const room = rooms.find((r) => r.id === opDrag.roomId);
    if (room) {
      const newOpenings = (room.openings ?? []).map((o) =>
        o.id === opDrag.openingId ? { ...o, position: opDrag.curPos } : o,
      );
      void updateRoomOpenings(opDrag.roomId, newOpenings);
    }
    setOpDrag(null);
  };

  const addOpening = (type: Opening["type"]) => {
    if (!activeRoomId) return;
    const room = rooms.find((r) => r.id === activeRoomId);
    if (!room) return;
    const existing = room.openings ?? [];
    const newOpening: Opening = {
      id: crypto.randomUUID(),
      type,
      wall: "n",
      position: Math.min(0.2 + existing.length * 0.15, 0.7),
      width: type === "door" ? 40 : 30,
    };
    void updateRoomOpenings(activeRoomId, [...existing, newOpening]);
  };

  const removeOpening = (roomId: string, openingId: string) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;
    void updateRoomOpenings(
      roomId,
      (room.openings ?? []).filter((o) => o.id !== openingId),
    );
  };

  const changeOpeningWall = (
    roomId: string,
    openingId: string,
    wall: Opening["wall"],
  ) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;
    void updateRoomOpenings(
      roomId,
      (room.openings ?? []).map((o) =>
        o.id === openingId ? { ...o, wall } : o,
      ),
    );
  };

  const moveLocation = async (id: string, x: number, y: number) => {
    const { error } = await supabase
      .from("locations")
      .update({ x, y })
      .eq("id", id);

    if (error) {
      console.error("location move error:", error);
      return;
    }

    await fetchLocations(rooms.map((room) => room.id));
  };

  const getLocationsByRoomId = (roomId: string) => {
    return locations.filter((location) => location.room_id === roomId);
  };

  const searchedItems = useMemo(() => {
    const query = itemSearchQuery.trim().toLowerCase();
    if (!query) return [];

    return allItems
      .filter((item) => item.name.toLowerCase().includes(query))
      .map((item) => {
        const location = locations.find(
          (location) => location.id === item.location_id,
        );
        const room = location
          ? rooms.find((room) => room.id === location.room_id)
          : undefined;

        return {
          item,
          location,
          room,
        };
      })
      .filter((result) => result.location && result.room);
  }, [itemSearchQuery, allItems, locations, rooms]);

  const deleteSelectedLocation = async () => {
    if (!selectedLocationId) {
      alert("삭제할 수납공간이 선택되지 않았어요.");
      return;
    }

    const confirmDelete = window.confirm(
      "이 수납공간과 그 안의 물건들을 모두 삭제할까요?",
    );

    if (!confirmDelete) {
      return;
    }

    const locationId = selectedLocationId;

    const { error: itemsError } = await supabase
      .from("items")
      .delete()
      .eq("location_id", locationId);

    if (itemsError) {
      console.error("items delete error:", itemsError);
      return;
    }

    const { error: locationError } = await supabase
      .from("locations")
      .delete()
      .eq("id", locationId);

    if (locationError) {
      console.error("location delete error:", locationError);
      return;
    }

    setSelectedLocationId(null);
    setItems([]);
    await fetchLocations(rooms.map((room) => room.id));
  };

  const deleteRoomWithContents = async (roomId: string) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;

    const confirmDelete = window.confirm(
      `"${room.name}" 방과 그 안의 수납공간/물건을 모두 삭제할까요?`,
    );

    if (!confirmDelete) {
      return;
    }

    const roomLocations = locations.filter((l) => l.room_id === roomId);
    const locationIds = roomLocations.map((l) => l.id);

    if (locationIds.length > 0) {
      const { error: itemsError } = await supabase
        .from("items")
        .delete()
        .in("location_id", locationIds);

      if (itemsError) {
        console.error("items delete error:", itemsError);
        return;
      }

      const { error: locationsError } = await supabase
        .from("locations")
        .delete()
        .eq("room_id", roomId);

      if (locationsError) {
        console.error("locations delete error:", locationsError);
        return;
      }
    }

    const { error: roomError } = await supabase
      .from("rooms")
      .delete()
      .eq("id", roomId);

    if (roomError) {
      console.error("room delete error:", roomError);
      return;
    }

    if (selectedLocationId && locationIds.includes(selectedLocationId)) {
      setSelectedLocationId(null);
      setItems([]);
    }

    const remainingRooms = rooms.filter((r) => r.id !== roomId);
    setRooms(remainingRooms);
    const remainingRoomIds = remainingRooms.map((r) => r.id);
    await fetchLocations(remainingRoomIds);

    if (!remainingRooms.length) {
      setActiveRoomId(null);
    } else if (activeRoomId === roomId) {
      setActiveRoomId(remainingRooms[0].id);
    }
  };

  useEffect(() => {
    async function loadHomes() {
      await fetchHomes();
    }
    loadHomes();
  }, []);

  useEffect(() => {
    if (!selectedHomeId) return;

    async function loadRoomsAndLocations() {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("home_id", selectedHomeId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("rooms fetch error:", error);
        return;
      }

      const roomList = (data as Room[]) || [];
      setRooms(roomList);

      const roomIds = roomList.map((room) => room.id);
      await fetchLocations(roomIds);

      if (roomList.length > 0 && !activeRoomId) {
        setActiveRoomId(roomList[0].id);
      } else if (roomList.length === 0) {
        setActiveRoomId(null);
      }
    }

    loadRoomsAndLocations();
  }, [selectedHomeId]);

  useEffect(() => {
    if (!selectedLocationId) return;

    async function loadItems() {
      await fetchItems(selectedLocationId!);
    }

    loadItems();
  }, [selectedLocationId]);

  return (
    <main className="min-h-screen bg-[#F9FAFB] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-8 py-8">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-[32px]">
              어디있니?
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              집 → 방 → 수납공간(location) → 물건(item) 구조로, “어디에 뭐가
              있는지”를 한 번에 정리해요.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:w-80">
            <span className="hidden items-center justify-between rounded-full border border-[#E5E7EB] bg-white px-4 py-1.5 text-xs font-medium text-slate-600 shadow-sm sm:inline-flex">
              <span>구조 편집 모드</span>
            </span>
            <div className="relative">
              <input
                value={itemSearchQuery}
                onChange={(e) => setItemSearchQuery(e.target.value)}
                placeholder="물건 이름으로 검색해 위치 찾기"
                className="w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2.5 pr-10 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">
                ⌘K
              </span>
            </div>
            {itemSearchQuery.trim() && (
              <div className="mt-1 max-h-56 overflow-y-auto rounded-xl border border-[#E5E7EB] bg-white p-2 text-xs shadow-lg">
                {searchedItems.length === 0 ? (
                  <p className="px-1 py-1.5 text-[11px] text-slate-400">
                    검색 결과가 없어요.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {searchedItems.map(({ item, location, room }) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => {
                            if (!location || !room) return;
                            setSelectedHomeId(room.home_id);
                            setActiveRoomId(room.id);
                            setSelectedLocationId(location.id);
                            setItemSearchQuery("");
                          }}
                          className="flex w-full flex-col rounded-lg px-2 py-1.5 text-left text-[11px] hover:bg-slate-50"
                        >
                          <span className="font-medium text-slate-900">
                            {item.name}
                          </span>
                          <span className="mt-0.5 text-[10px] text-slate-500">
                            {room?.name} / {location?.name}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-6 md:flex-row">
          {/* 왼쪽: 구조/데이터 패널 */}
          <section className="flex w-full flex-col gap-4 md:w-80">

            {/* ── 집 선택 (공통) ── */}
            <div className="rounded-xl border border-[#E5E7EB] bg-white px-5 py-4 shadow-sm">
              <label className="block text-xs font-medium text-slate-600">집</label>
              <div className="mt-1.5 flex items-center gap-2">
                <select
                  value={selectedHomeId ?? ""}
                  onChange={(e) => { setSelectedHomeId(e.target.value); setEditingHomeId(null); }}
                  className="block w-full flex-1 appearance-none rounded-lg border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
                >
                  <option value="">집을 선택하세요</option>
                  {homes.map((home) => (
                    <option key={home.id} value={home.id}>
                      {home.name}
                    </option>
                  ))}
                </select>
                {selectedHomeId && (
                  <button
                    onClick={() => {
                      const h = homes.find(h => h.id === selectedHomeId);
                      if (h) { setEditingHomeId(h.id); setEditingHomeName(h.name); }
                    }}
                    className="shrink-0 inline-flex items-center justify-center rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-2.5 text-xs text-slate-500 shadow-sm transition hover:border-slate-300"
                    title="집 이름 변경"
                  >
                    ✏️
                  </button>
                )}
              </div>
              {editingHomeId && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    value={editingHomeName}
                    onChange={(e) => setEditingHomeName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); renameHome(editingHomeId, editingHomeName); } if (e.key === "Escape") setEditingHomeId(null); }}
                    autoFocus
                    className="flex-1 rounded-lg border border-[#4F46E5] bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-2 ring-[#4F46E5]/20"
                    placeholder="집 이름"
                  />
                  <button onClick={() => renameHome(editingHomeId, editingHomeName)} className="shrink-0 rounded-lg bg-[#4F46E5] px-3 py-2 text-xs font-medium text-white">저장</button>
                  <button onClick={() => setEditingHomeId(null)} className="shrink-0 rounded-lg border border-[#E5E7EB] px-3 py-2 text-xs text-slate-500">취소</button>
                </div>
              )}
              <div className="mt-2 flex items-center gap-2">
                <input
                  value={newHomeName}
                  onChange={(e) => setNewHomeName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                  placeholder="새 집 이름 (비워두면 '우리집')"
                  className="flex-1 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
                />
                <button
                  onClick={addHome}
                  className="shrink-0 inline-flex items-center justify-center rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:border-slate-300"
                >
                  + 집
                </button>
              </div>
            </div>

            {/* ── 2D 모드: 방 관리 ── */}
            {viewMode === "2d" && (
              <div className="flex-1 rounded-xl border border-[#E5E7EB] bg-white px-5 py-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-[#1c1c1e] text-[10px] text-white font-bold">2D</span>
                  <h2 className="text-sm font-semibold text-slate-900">방 배치</h2>
                </div>
                <p className="text-xs text-slate-400 mb-4">방을 만들고 오른쪽 캔버스에서 위치와 크기를 조정하세요.</p>
                <div className="space-y-2">
                  <input
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                    placeholder="예: 거실, 주방, 안방"
                    className="w-full rounded-lg border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
                  />
                  <button
                    onClick={addRoom}
                    className="inline-flex w-full items-center justify-center rounded-lg bg-[#4F46E5] px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#4338CA] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!selectedHomeId}
                  >
                    방 추가하기
                  </button>
                </div>

                {rooms.length > 0 && (
                  <ul className="mt-4 space-y-1.5">
                    {rooms.map((room) => (
                      <li
                        key={room.id}
                        className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700"
                      >
                        <span className="font-medium">{room.name}</span>
                        <button
                          type="button"
                          onClick={() => deleteRoomWithContents(room.id)}
                          className="text-[11px] text-slate-400 hover:text-red-500 transition"
                        >
                          삭제
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {/* 선택된 방의 문/창문 설정 */}
                {activeRoomId && (() => {
                  const activeRoom = rooms.find((r) => r.id === activeRoomId);
                  if (!activeRoom) return null;
                  const openings = activeRoom.openings ?? [];
                  return (
                    <div className="mt-4 border-t border-[#E5E7EB] pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[11px] font-semibold text-slate-700">
                          {activeRoom.name} 문/창문
                        </p>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => addOpening("door")}
                            className="text-[10px] px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                          >
                            + 문
                          </button>
                          <button
                            type="button"
                            onClick={() => addOpening("window")}
                            className="text-[10px] px-2 py-1 rounded bg-sky-50 hover:bg-sky-100 text-sky-600 transition"
                          >
                            + 창문
                          </button>
                        </div>
                      </div>
                      {openings.length === 0 ? (
                        <p className="text-[10px] text-slate-400">아직 문이나 창문이 없어요.</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {openings.map((op) => (
                            <li
                              key={op.id}
                              className="flex items-center gap-1.5 text-[10px] bg-slate-50 rounded-lg px-2 py-1.5"
                            >
                              <span className="text-sm">{op.type === "door" ? "🚪" : "🪟"}</span>
                              <select
                                value={op.wall}
                                onChange={(e) =>
                                  changeOpeningWall(
                                    activeRoom.id,
                                    op.id,
                                    e.target.value as Opening["wall"],
                                  )
                                }
                                className="flex-1 rounded border border-[#E5E7EB] px-1 py-0.5 text-[10px] outline-none"
                              >
                                <option value="n">위 벽</option>
                                <option value="s">아래 벽</option>
                                <option value="e">오른쪽 벽</option>
                                <option value="w">왼쪽 벽</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => removeOpening(activeRoom.id, op.id)}
                                className="text-slate-300 hover:text-red-400 transition text-base leading-none"
                              >
                                ×
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ── 3D 모드: 드릴다운 패널 ── */}
            {viewMode === "3d" && (
              <div className="flex-1 rounded-xl border border-[#E5E7EB] bg-white px-5 py-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-[#4F46E5] text-[10px] text-white font-bold">3D</span>
                  <h2 className="text-sm font-semibold text-slate-900">
                    {selectedLocationId
                      ? "물건 관리"
                      : activeRoomId
                        ? "수납공간 설정"
                        : "방 선택"}
                  </h2>
                  {/* 뒤로가기 */}
                  {selectedLocationId && (
                    <button
                      type="button"
                      onClick={() => { setSelectedLocationId(null); setItems([]); }}
                      className="ml-auto text-[11px] text-slate-400 hover:text-slate-700 transition"
                    >
                      ← 뒤로
                    </button>
                  )}
                </div>

                {/* Step 1: 방을 선택하세요 */}
                {!activeRoomId && (
                  <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
                    <div className="text-2xl">🏠</div>
                    <p className="text-sm font-medium text-slate-700">방을 클릭하세요</p>
                    <p className="text-xs text-slate-400">3D 화면에서 방을 클릭하면<br/>수납공간을 추가할 수 있어요.</p>
                  </div>
                )}

                {/* Step 2: 수납공간 추가 */}
                {activeRoomId && !selectedLocationId && (
                  <>
                    <div className="mb-3 rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2">
                      <p className="text-[11px] font-semibold text-indigo-700">
                        {rooms.find((r) => r.id === activeRoomId)?.name}
                      </p>
                      <p className="text-[10px] text-indigo-400 mt-0.5">
                        수납공간 {locations.filter((l) => l.room_id === activeRoomId).length}개
                      </p>
                    </div>
                    <div className="space-y-2">
                      <input
                        value={newLocationName}
                        onChange={(e) => setNewLocationName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                        placeholder="예: 신발장, 서랍, 상부장"
                        className="w-full rounded-lg border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
                      />
                      <button
                        onClick={addLocation}
                        className="inline-flex w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-black"
                      >
                        수납공간 추가하기
                      </button>
                    </div>

                    {/* 이 방의 수납공간 목록 */}
                    {locations.filter((l) => l.room_id === activeRoomId).length > 0 && (
                      <ul className="mt-4 space-y-1.5">
                        {locations
                          .filter((l) => l.room_id === activeRoomId)
                          .map((loc) => {
                            const cnt = allItems.filter((i) => i.location_id === loc.id).length;
                            return (
                              <li key={loc.id}>
                                <button
                                  type="button"
                                  onClick={() => setSelectedLocationId(loc.id)}
                                  className="flex w-full items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700 hover:bg-indigo-50 transition"
                                >
                                  <span className="font-medium">{loc.name}</span>
                                  <span className="text-[10px] text-slate-400">{cnt}개</span>
                                </button>
                              </li>
                            );
                          })}
                      </ul>
                    )}
                  </>
                )}

                {/* Step 3: 물건 추가 */}
                {selectedLocationId && (
                  <>
                    <div className="mb-3 rounded-lg bg-slate-50 border border-[#E5E7EB] px-3 py-2 flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-semibold text-slate-700">
                          {locations.find((l) => l.id === selectedLocationId)?.name}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          물건 {items.length}개
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={deleteSelectedLocation}
                        className="text-[11px] font-semibold text-red-500 hover:text-red-700 transition"
                      >
                        삭제
                      </button>
                    </div>

                    <div className="space-y-2">
                      <input
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        placeholder="예: 건전지, 스페어키, 여권"
                        className="w-full rounded-lg border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
                      />
                      <button
                        onClick={addItem}
                        className="inline-flex w-full items-center justify-center rounded-lg bg-[#4F46E5] px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#4338CA]"
                      >
                        물건 추가하기
                      </button>
                    </div>

                    {items.length === 0 ? (
                      <p className="mt-4 text-xs text-slate-400">아직 등록된 물건이 없어요.</p>
                    ) : (
                      <ul className="mt-4 space-y-1.5 text-xs text-slate-700">
                        {items.map((item) => (
                          <li
                            key={item.id}
                            className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2"
                          >
                            <span className="truncate">{item.name}</span>
                            <span className="ml-2 shrink-0 text-[11px] text-slate-400">
                              x{item.quantity}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            )}
          </section>

          {/* 오른쪽: 구조 캔버스 */}
          <section className="flex-1 rounded-xl border border-[#E5E7EB] bg-white px-6 py-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  집 구조
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  방(큰 상자) 안에 수납공간(location)을 배치하고, 각 수납공간을
                  클릭해서 물건(item)을 관리하세요.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* 2D / 3D 뷰 토글 */}
                <div className="inline-flex overflow-hidden rounded-lg border border-[#E5E7EB] bg-slate-50 text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setViewMode("2d")}
                    className={`px-3 py-1.5 transition ${
                      viewMode === "2d"
                        ? "bg-[#1c1c1e] text-white"
                        : "text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    2D
                  </button>
                  <button
                    type="button"
                    onClick={() => { setViewMode("3d"); setHas3DInitialized(true); }}
                    className={`px-3 py-1.5 transition ${
                      viewMode === "3d"
                        ? "bg-[#4F46E5] text-white"
                        : "text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    3D
                  </button>
                </div>
                {selectedHomeId && (
                  <div className="hidden items-center gap-1 rounded-full border border-[#E5E7EB] bg-slate-50 px-4 py-1.5 text-[11px] text-slate-600 sm:inline-flex">
                    <span className="h-2 w-2 rounded-full bg-[#4F46E5]" />
                    현재 집:{" "}
                    {homes.find((h) => h.id === selectedHomeId)?.name ??
                      "선택된 집"}
                  </div>
                )}
              </div>
            </div>

            <div
              className="relative h-[520px] w-full overflow-hidden rounded-xl border"
              style={{
                background: "#ffffff",
                borderColor: "#e5e7eb",
              }}
            >
              {/* 빈 상태 */}
              {!selectedHomeId && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
                  <p className="text-sm font-medium text-slate-500">먼저 집을 추가하고 선택해주세요.</p>
                  <p className="max-w-xs text-xs text-slate-400">왼쪽에서 <span className="font-medium text-slate-500">집을 추가</span> 한 뒤 선택하세요.</p>
                </div>
              )}
              {selectedHomeId && rooms.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
                  <p className="text-sm font-medium text-slate-500">선택한 집에 아직 방이 없어요.</p>
                  <p className="max-w-xs text-xs text-slate-400">왼쪽에서 방을 추가해보세요.</p>
                </div>
              )}

              {/* 3D 씬 — 처음 3D 모드 진입 시 한 번만 마운트, 이후 visibility로 토글 */}
              {has3DInitialized && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    visibility: viewMode === "3d" && !!selectedHomeId && rooms.length > 0 ? "visible" : "hidden",
                    pointerEvents: viewMode === "3d" && !!selectedHomeId && rooms.length > 0 ? "auto" : "none",
                  }}
                >
                  <FloorPlan3D
                    rooms={rooms}
                    locations={locations}
                    allItems={allItems}
                    activeRoomId={activeRoomId}
                    selectedLocationId={selectedLocationId}
                    onSelectRoom={(id) => {
                      setActiveRoomId(id);
                      setSelectedLocationId(null);
                      setItems([]);
                    }}
                    onSelectLocation={(id) => setSelectedLocationId(id)}
                    onMoveLocation={moveLocation}
                  />
                </div>
              )}

              {/* 2D 뷰 */}
              {selectedHomeId && rooms.length > 0 && viewMode === "2d" && (
                <Fragment>
                  <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: "repeating-linear-gradient(rgba(0,0,0,0.05) 0 1px, transparent 1px 28px), repeating-linear-gradient(90deg, rgba(0,0,0,0.05) 0 1px, transparent 1px 28px)", backgroundSize: "28px 28px" }} />
                  <div className="absolute right-4 top-4 z-20 flex flex-col items-end gap-2 text-[10px] text-slate-500">
                    <div className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 shadow-sm">
                      <span className="text-[9px] text-slate-400">줌</span>
                      <button
                        type="button"
                        onClick={() =>
                          setZoom((z) => Math.max(0.5, parseFloat((z - 0.1).toFixed(2))))
                        }
                        className="flex h-5 w-5 items-center justify-center rounded-full border border-[#E5E7EB] bg-white hover:bg-slate-50"
                      >
                        -
                      </button>
                      <span className="w-8 text-center tabular-nums">
                        {(zoom * 100).toFixed(0)}%
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setZoom((z) => Math.min(2, parseFloat((z + 0.1).toFixed(2))))
                        }
                        className="flex h-5 w-5 items-center justify-center rounded-full border border-[#E5E7EB] bg-white hover:bg-slate-50"
                      >
                        +
                      </button>
                    </div>
                    <div className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 shadow-sm">
                      <span className="text-[9px] text-slate-400">이동</span>
                      <button
                        type="button"
                        onClick={() => setPan((p) => ({ ...p, y: p.y + 40 }))}
                        className="flex h-5 w-5 items-center justify-center rounded-full border border-[#E5E7EB] bg-white hover:bg-slate-50"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => setPan((p) => ({ ...p, x: p.x - 40 }))}
                        className="flex h-5 w-5 items-center justify-center rounded-full border border-[#E5E7EB] bg-white hover:bg-slate-50"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        onClick={() => setPan((p) => ({ ...p, x: p.x + 40 }))}
                        className="flex h-5 w-5 items-center justify-center rounded-full border border-[#E5E7EB] bg-white hover:bg-slate-50"
                      >
                        →
                      </button>
                      <button
                        type="button"
                        onClick={() => setPan((p) => ({ ...p, y: p.y - 40 }))}
                        className="flex h-5 w-5 items-center justify-center rounded-full border border-[#E5E7EB] bg-white hover:bg-slate-50"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setZoom(1);
                          setPan({ x: 0, y: 0 });
                        }}
                        className="ml-1 flex h-5 items-center justify-center rounded-full border border-[#E5E7EB] bg-white px-2 hover:bg-slate-50"
                      >
                        초기화
                      </button>
                    </div>
                  </div>
                  <div
                    className="relative h-full w-full"
                    onMouseMove={handleOpDragMove}
                    onMouseUp={handleOpDragEnd}
                    onMouseLeave={handleOpDragEnd}
                    style={{ cursor: opDrag ? "grabbing" : undefined }}
                  >
                    <div
                      className="relative h-full w-full origin-center"
                      style={{
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                        transition: "transform 150ms ease-out",
                      }}
                    >
                    {rooms.map((room) => {
                      const isActiveRoom = activeRoomId === room.id;
                      return (
                        <Rnd
                          key={room.id}
                          size={{ width: room.width, height: room.height }}
                          position={{ x: room.x, y: room.y }}
                          bounds="parent"
                          dragHandleClassName="room-drag-handle"
                          onDragStop={(_e, d) => {
                            void updateRoomLayout(room.id, {
                              x: d.x,
                              y: d.y,
                              width: room.width,
                              height: room.height,
                            });
                          }}
                          onResizeStop={async (
                            _e,
                            _direction,
                            ref,
                            _delta,
                            position,
                          ) => {
                            await updateRoomLayout(room.id, {
                              x: position.x,
                              y: position.y,
                              width: parseInt(ref.style.width, 10),
                              height: parseInt(ref.style.height, 10),
                            });
                          }}
                          style={{ boxSizing: "border-box" }}
                        >
                          {/* 방: 도면 스타일 — 두꺼운 벽 + 따뜻한 바닥 */}
                          <div
                            onMouseDown={() => setActiveRoomId(room.id)}
                            style={{
                              width: "100%",
                              height: "100%",
                              background: "#f5ead6",
                              border: `10px solid ${isActiveRoom ? "#4F46E5" : "#2c2c2c"}`,
                              boxSizing: "border-box",
                              borderRadius: 2,
                              position: "relative",
                              boxShadow: isActiveRoom
                                ? "0 0 0 2px rgba(79,70,229,0.5), 4px 6px 16px rgba(0,0,0,0.6)"
                                : "4px 6px 16px rgba(0,0,0,0.5)",
                              transition: "border-color 150ms, box-shadow 150ms",
                            }}
                          >
                            {/* 문/창문 SVG 오버레이 + 드래그 핸들 */}
                          {(room.openings ?? []).length > 0 && (() => {
                            const wallColor = isActiveRoom ? "#4F46E5" : "#2c2c2c";
                            const floorColor = "#f5ead6";
                            const iw = room.width - 20;
                            const ih = room.height - 20;
                            return (
                              <>
                                {/* SVG: 시각적 렌더링만 (pointerEvents none) */}
                                <svg
                                  style={{
                                    position: "absolute",
                                    top: -10,
                                    left: -10,
                                    width: room.width,
                                    height: room.height,
                                    overflow: "visible",
                                    pointerEvents: "none",
                                    zIndex: 20,
                                  }}
                                  viewBox={`0 0 ${room.width} ${room.height}`}
                                >
                                  {(room.openings ?? []).map((op) => {
                                    const ow = op.width;
                                    const isDraggingThis = opDrag?.openingId === op.id && opDrag?.roomId === room.id;
                                    const pos = isDraggingThis ? opDrag!.curPos : op.position;
                                    if (op.wall === "n") {
                                      const gx = 10 + pos * Math.max(iw - ow, 0);
                                      return (
                                        <g key={op.id}>
                                          <rect x={gx} y={0} width={ow} height={10} fill={floorColor} />
                                          {op.type === "door" ? (
                                            <g stroke={wallColor} strokeWidth="0.9" fill="none">
                                              <line x1={gx} y1={10} x2={gx} y2={10 + ow} />
                                              <path d={`M ${gx + ow},10 A ${ow},${ow} 0 0,0 ${gx},${10 + ow}`} />
                                            </g>
                                          ) : (
                                            <g stroke={wallColor} strokeWidth="1.2">
                                              {[2, 5, 8].map((dy) => (
                                                <line key={dy} x1={gx + 2} y1={dy} x2={gx + ow - 2} y2={dy} />
                                              ))}
                                            </g>
                                          )}
                                        </g>
                                      );
                                    }
                                    if (op.wall === "s") {
                                      const gx = 10 + pos * Math.max(iw - ow, 0);
                                      const gy = room.height - 10;
                                      return (
                                        <g key={op.id}>
                                          <rect x={gx} y={gy} width={ow} height={10} fill={floorColor} />
                                          {op.type === "door" ? (
                                            <g stroke={wallColor} strokeWidth="0.9" fill="none">
                                              <line x1={gx} y1={gy} x2={gx} y2={gy - ow} />
                                              <path d={`M ${gx + ow},${gy} A ${ow},${ow} 0 0,1 ${gx},${gy - ow}`} />
                                            </g>
                                          ) : (
                                            <g stroke={wallColor} strokeWidth="1.2">
                                              {[2, 5, 8].map((dy) => (
                                                <line key={dy} x1={gx + 2} y1={gy + dy} x2={gx + ow - 2} y2={gy + dy} />
                                              ))}
                                            </g>
                                          )}
                                        </g>
                                      );
                                    }
                                    if (op.wall === "e") {
                                      const gx = room.width - 10;
                                      const gy = 10 + pos * Math.max(ih - ow, 0);
                                      return (
                                        <g key={op.id}>
                                          <rect x={gx} y={gy} width={10} height={ow} fill={floorColor} />
                                          {op.type === "door" ? (
                                            <g stroke={wallColor} strokeWidth="0.9" fill="none">
                                              <line x1={gx} y1={gy} x2={gx - ow} y2={gy} />
                                              <path d={`M ${gx},${gy + ow} A ${ow},${ow} 0 0,0 ${gx - ow},${gy}`} />
                                            </g>
                                          ) : (
                                            <g stroke={wallColor} strokeWidth="1.2">
                                              {[2, 5, 8].map((dx) => (
                                                <line key={dx} x1={gx + dx} y1={gy + 2} x2={gx + dx} y2={gy + ow - 2} />
                                              ))}
                                            </g>
                                          )}
                                        </g>
                                      );
                                    }
                                    // wall === "w"
                                    const gy = 10 + pos * Math.max(ih - ow, 0);
                                    return (
                                      <g key={op.id}>
                                        <rect x={0} y={gy} width={10} height={ow} fill={floorColor} />
                                        {op.type === "door" ? (
                                          <g stroke={wallColor} strokeWidth="0.9" fill="none">
                                            <line x1={10} y1={gy} x2={10 + ow} y2={gy} />
                                            <path d={`M ${10},${gy + ow} A ${ow},${ow} 0 0,1 ${10 + ow},${gy}`} />
                                          </g>
                                        ) : (
                                          <g stroke={wallColor} strokeWidth="1.2">
                                            {[2, 5, 8].map((dx) => (
                                              <line key={dx} x1={dx} y1={gy + 2} x2={dx} y2={gy + ow - 2} />
                                            ))}
                                          </g>
                                        )}
                                      </g>
                                    );
                                  })}
                                </svg>

                                {/* 드래그 핸들: 벽 위에 올려진 투명 div들 */}
                                {(room.openings ?? []).map((op) => {
                                  const ow = op.width;
                                  const isDraggingThis = opDrag?.openingId === op.id && opDrag?.roomId === room.id;
                                  const pos = isDraggingThis ? opDrag!.curPos : op.position;
                                  // 핸들은 CSS border 영역(벽 두께 10px)에만 위치 — 방 내부로 침범 금지
                                  let handleStyle: React.CSSProperties;
                                  if (op.wall === "n") {
                                    handleStyle = { position: "absolute", left: pos * Math.max(iw - ow, 0), top: -10, width: ow, height: 10, zIndex: 25, cursor: isDraggingThis ? "grabbing" : "grab" };
                                  } else if (op.wall === "s") {
                                    handleStyle = { position: "absolute", left: pos * Math.max(iw - ow, 0), top: ih, width: ow, height: 10, zIndex: 25, cursor: isDraggingThis ? "grabbing" : "grab" };
                                  } else if (op.wall === "e") {
                                    handleStyle = { position: "absolute", left: iw, top: pos * Math.max(ih - ow, 0), width: 10, height: ow, zIndex: 25, cursor: isDraggingThis ? "grabbing" : "grab" };
                                  } else {
                                    handleStyle = { position: "absolute", left: -10, top: pos * Math.max(ih - ow, 0), width: 10, height: ow, zIndex: 25, cursor: isDraggingThis ? "grabbing" : "grab" };
                                  }
                                  return (
                                    <div
                                      key={`handle-${op.id}`}
                                      style={handleStyle}
                                      onMouseDown={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        setOpDrag({
                                          roomId: room.id,
                                          openingId: op.id,
                                          wall: op.wall,
                                          startPos: op.position,
                                          startClient: { x: e.clientX, y: e.clientY },
                                          roomW: room.width,
                                          roomH: room.height,
                                          opW: ow,
                                          curPos: op.position,
                                        });
                                      }}
                                    />
                                  );
                                })}
                              </>
                            );
                          })()}

                          {/* 방 이름 바 (드래그 핸들) */}
                            <div
                              className="room-drag-handle"
                              style={{
                                background: isActiveRoom ? "#4F46E5" : "#2c2c2c",
                                color: "white",
                                padding: "3px 8px",
                                fontSize: "10px",
                                fontWeight: 700,
                                cursor: "move",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                letterSpacing: "0.06em",
                                textTransform: "uppercase",
                                userSelect: "none",
                                transition: "background 150ms",
                              }}
                            >
                              <span>{room.name}</span>
                              <button
                                type="button"
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteRoomWithContents(room.id);
                                }}
                                style={{
                                  color: "rgba(255,255,255,0.55)",
                                  fontSize: "15px",
                                  lineHeight: 1,
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  padding: "0 2px",
                                }}
                              >
                                ×
                              </button>
                            </div>

                            {/* 바닥 영역 — 수납공간 박스 표시 */}
                            <div
                              style={{
                                position: "relative",
                                height: "calc(100% - 22px)",
                                overflow: "hidden",
                              }}
                            >
                              {getLocationsByRoomId(room.id).map((loc) => {
                                const isLocSelected = selectedLocationId === loc.id;
                                const itemCnt = allItems.filter((i) => i.location_id === loc.id).length;
                                return (
                                  <div
                                    key={loc.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveRoomId(room.id);
                                      setSelectedLocationId(loc.id);
                                      fetchItems(loc.id);
                                    }}
                                    style={{
                                      position: "absolute",
                                      left: loc.x,
                                      top: loc.y,
                                      width: loc.width,
                                      height: loc.height,
                                      zIndex: 30,
                                      background: isLocSelected ? "rgba(79,70,229,0.25)" : "rgba(255,255,255,0.55)",
                                      border: `1.5px solid ${isLocSelected ? "#4F46E5" : "rgba(0,0,0,0.25)"}`,
                                      borderRadius: 2,
                                      boxSizing: "border-box",
                                      cursor: "pointer",
                                      display: "flex",
                                      flexDirection: "column",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      gap: 1,
                                      userSelect: "none",
                                      transition: "border-color 120ms, background 120ms",
                                    }}
                                  >
                                    <span style={{ fontSize: "9px", fontWeight: 700, color: isLocSelected ? "#4F46E5" : "rgba(0,0,0,0.6)", lineHeight: 1.2, textAlign: "center", padding: "0 2px" }}>
                                      {loc.name}
                                    </span>
                                    {itemCnt > 0 && (
                                      <span style={{ fontSize: "8px", color: isLocSelected ? "#6d60f0" : "rgba(0,0,0,0.35)" }}>
                                        {itemCnt}개
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </Rnd>
                      );
                    })}
                  </div>
                  </div>
                </Fragment>
              )}
            </div>

          </section>
        </div>
      </div>
    </main>
  );
}
