"use client";

import { Fragment, useEffect, useMemo, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Rnd } from "react-rnd";
import { supabase } from "@/lib/supabase";
import type { Room, Opening, RoomType } from "@/types/room";
import type { Location } from "@/types/location";
import type { Item } from "@/types/item";

import ToastContainer, { showToast } from "./components/Toast";
import Breadcrumb from "./components/Breadcrumb";
import EmptyState from "./components/EmptyState";
import SearchPanel from "./components/SearchPanel";
import OnboardingGuide from "./components/OnboardingGuide";
import ItemForm from "./components/ItemForm";

const FloorPlan3D = dynamic(() => import("./components/FloorPlan3D"), {
  ssr: false,
});

type Home = {
  id: string;
  name: string;
  created_at: string;
};

export default function HomePage() {
  /* ── state ── */
  const [homes, setHomes] = useState<Home[]>([]);
  const [selectedHomeId, setSelectedHomeId] = useState<string | null>(null);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomType, setNewRoomType] = useState<RoomType>("room");
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  const [locations, setLocations] = useState<Location[]>([]);
  const [newLocationName, setNewLocationName] = useState("");

  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [highlightLocationId, setHighlightLocationId] = useState<string | null>(null);

  const [items, setItems] = useState<Item[]>([]);
  const [allItems, setAllItems] = useState<Item[]>([]);

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

  const [has3DInitialized, setHas3DInitialized] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemName, setEditingItemName] = useState("");

  const [newHomeName, setNewHomeName] = useState("");
  const [editingHomeId, setEditingHomeId] = useState<string | null>(null);
  const [editingHomeName, setEditingHomeName] = useState("");

  /* ── derived ── */
  const selectedHome = homes.find((h) => h.id === selectedHomeId);
  const activeRoom = rooms.find((r) => r.id === activeRoomId);
  const selectedLocation = locations.find((l) => l.id === selectedLocationId);

  /* ── Cmd+K shortcut ── */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  /* ── data fetching ── */
  const fetchHomes = async () => {
    const { data, error } = await supabase
      .from("homes")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) { console.error("homes fetch error:", error); return; }
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
    if (error) { console.error("rooms fetch error:", error); return; }
    setRooms((data as Room[]) || []);
  };

  const refreshAllItems = async (targetLocations: Location[]) => {
    if (targetLocations.length === 0) { setAllItems([]); return; }
    const locationIds = targetLocations.map((l) => l.id);
    const { data, error } = await supabase
      .from("items")
      .select("*")
      .in("location_id", locationIds)
      .order("created_at", { ascending: true });
    if (error) { console.error("items fetch (all) error:", error); return; }
    setAllItems((data as Item[]) || []);
  };

  const fetchLocations = async (roomIds: string[]) => {
    if (roomIds.length === 0) { setLocations([]); setAllItems([]); return; }
    const { data, error } = await supabase
      .from("locations")
      .select("*")
      .in("room_id", roomIds)
      .order("created_at", { ascending: true });
    if (error) { console.error("locations fetch error:", error); return; }
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
    if (error) { console.error("items fetch error:", error); return; }
    setItems((data as Item[]) || []);
  };

  /* ── CRUD ── */
  const addHome = async () => {
    const name = newHomeName.trim() || "우리집";
    const { error } = await supabase.from("homes").insert([{ name }]);
    if (error) { console.error("home insert error:", error); return; }
    setNewHomeName("");
    await fetchHomes();
    showToast(`'${name}' 집이 추가되었어요`);
  };

  const renameHome = async (id: string, name: string) => {
    if (!name.trim()) return;
    const { error } = await supabase.from("homes").update({ name: name.trim() }).eq("id", id);
    if (error) { console.error("home rename error:", error); return; }
    setEditingHomeId(null);
    await fetchHomes();
  };

  const addRoom = async () => {
    if (!selectedHomeId) { showToast("먼저 집을 만들어야 해요"); return; }
    if (!newRoomName.trim()) { showToast("방 이름을 입력해주세요"); return; }
    const isHallway = newRoomType === "hallway";
    const { error } = await supabase.from("rooms").insert([{
      home_id: selectedHomeId,
      name: newRoomName,
      x: 20 + rooms.length * 20,
      y: 20 + rooms.length * 20,
      width: isHallway ? 80 : 180,
      height: isHallway ? 200 : 140,
      color: "#3b82f6",
      room_type: newRoomType,
    }]);
    if (error) { console.error("room insert error:", error); return; }
    setNewRoomName("");
    await fetchRooms(selectedHomeId);
    showToast(`'${newRoomName}' 방이 추가되었어요`);
  };

  const addLocation = async () => {
    if (rooms.length === 0) { showToast("먼저 방을 만들어야 해요"); return; }
    if (!activeRoomId) { showToast("수납공간을 배치할 방을 먼저 선택해주세요"); return; }
    if (!newLocationName.trim()) { showToast("수납공간 이름을 입력해주세요"); return; }
    const targetRoom = rooms.find((r) => r.id === activeRoomId);
    if (!targetRoom) { showToast("선택한 방을 찾을 수 없어요"); return; }
    const locationsInRoom = locations.filter((l) => l.room_id === targetRoom.id);
    const { error } = await supabase.from("locations").insert([{
      room_id: targetRoom.id,
      name: newLocationName,
      type: "storage",
      x: 10 + locationsInRoom.length * 10,
      y: 10 + locationsInRoom.length * 10,
      width: 90,
      height: 60,
      color: "#ffffff",
    }]);
    if (error) { console.error("location insert error:", error); return; }
    setNewLocationName("");
    await fetchLocations(rooms.map((r) => r.id));
    showToast(`'${newLocationName}' 수납공간이 추가되었어요`);
  };

  const addItem = async (data: { name: string; category: string; quantity: number; memo: string }) => {
    if (!selectedLocationId) { showToast("먼저 수납공간을 선택해주세요"); return; }
    const { error } = await supabase.from("items").insert([{
      location_id: selectedLocationId,
      name: data.name,
      category: data.category,
      memo: data.memo,
      quantity: data.quantity,
      color: "#f59e0b",
    }]);
    if (error) { console.error("item insert error:", error); return; }
    await fetchItems(selectedLocationId);
    await refreshAllItems(locations);
    showToast(`'${data.name}' 등록 완료!`);
  };

  const deleteItem = async (itemId: string) => {
    const { error } = await supabase.from("items").delete().eq("id", itemId);
    if (error) { console.error("item delete error:", error); return; }
    if (selectedLocationId) await fetchItems(selectedLocationId);
    await refreshAllItems(locations);
    showToast("물건이 삭제되었어요");
  };

  const updateItemName = async (itemId: string, name: string) => {
    if (!name.trim()) return;
    const { error } = await supabase.from("items").update({ name: name.trim() }).eq("id", itemId);
    if (error) { console.error("item update error:", error); return; }
    setEditingItemId(null);
    if (selectedLocationId) await fetchItems(selectedLocationId);
    await refreshAllItems(locations);
  };

  const updateRoomLayout = async (
    roomId: string,
    updates: { x: number; y: number; width: number; height: number },
  ) => {
    const { error } = await supabase.from("rooms").update(updates).eq("id", roomId);
    if (error) { console.error("room update error:", error); return; }
    if (selectedHomeId) await fetchRooms(selectedHomeId);
  };

  const updateRoomOpenings = async (roomId: string, openings: Opening[]) => {
    const { error } = await supabase.from("rooms").update({ openings }).eq("id", roomId);
    if (error) { console.error("openings update error:", error); return; }
    setRooms((prev) => prev.map((r) => (r.id === roomId ? { ...r, openings } : r)));
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
    void updateRoomOpenings(roomId, (room.openings ?? []).filter((o) => o.id !== openingId));
  };

  const changeOpeningWall = (roomId: string, openingId: string, wall: Opening["wall"]) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;
    void updateRoomOpenings(roomId, (room.openings ?? []).map((o) =>
      o.id === openingId ? { ...o, wall } : o,
    ));
  };

  const moveLocation = async (id: string, x: number, y: number) => {
    const { error } = await supabase.from("locations").update({ x, y }).eq("id", id);
    if (error) { console.error("location move error:", error); return; }
    await fetchLocations(rooms.map((r) => r.id));
  };

  const deleteSelectedLocation = async () => {
    if (!selectedLocationId) return;
    const confirmDelete = window.confirm("이 수납공간과 그 안의 물건들을 모두 삭제할까요?");
    if (!confirmDelete) return;
    const locationId = selectedLocationId;
    const { error: itemsError } = await supabase.from("items").delete().eq("location_id", locationId);
    if (itemsError) { console.error("items delete error:", itemsError); return; }
    const { error: locationError } = await supabase.from("locations").delete().eq("id", locationId);
    if (locationError) { console.error("location delete error:", locationError); return; }
    setSelectedLocationId(null);
    setItems([]);
    await fetchLocations(rooms.map((r) => r.id));
    showToast("수납공간이 삭제되었어요");
  };

  const deleteRoomWithContents = async (roomId: string) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;
    const confirmDelete = window.confirm(`"${room.name}" 방과 그 안의 수납공간/물건을 모두 삭제할까요?`);
    if (!confirmDelete) return;
    const roomLocations = locations.filter((l) => l.room_id === roomId);
    const locationIds = roomLocations.map((l) => l.id);
    if (locationIds.length > 0) {
      const { error: itemsError } = await supabase.from("items").delete().in("location_id", locationIds);
      if (itemsError) { console.error("items delete error:", itemsError); return; }
      const { error: locationsError } = await supabase.from("locations").delete().eq("room_id", roomId);
      if (locationsError) { console.error("locations delete error:", locationsError); return; }
    }
    const { error: roomError } = await supabase.from("rooms").delete().eq("id", roomId);
    if (roomError) { console.error("room delete error:", roomError); return; }
    if (selectedLocationId && locationIds.includes(selectedLocationId)) {
      setSelectedLocationId(null);
      setItems([]);
    }
    const remainingRooms = rooms.filter((r) => r.id !== roomId);
    setRooms(remainingRooms);
    const remainingRoomIds = remainingRooms.map((r) => r.id);
    await fetchLocations(remainingRoomIds);
    if (!remainingRooms.length) { setActiveRoomId(null); }
    else if (activeRoomId === roomId) { setActiveRoomId(remainingRooms[0].id); }
  };

  const getLocationsByRoomId = (roomId: string) => locations.filter((l) => l.room_id === roomId);

  /* ── search result handler ── */
  const handleSearchSelect = useCallback((item: Item, location: Location, room: Room) => {
    setSelectedHomeId(room.home_id);
    setActiveRoomId(room.id);
    setSelectedLocationId(location.id);
    setHighlightLocationId(location.id);
    setViewMode("3d");
    setHas3DInitialized(true);
    setTimeout(() => setHighlightLocationId(null), 3000);
  }, []);

  /* ── effects ── */
  useEffect(() => { fetchHomes(); }, []);

  useEffect(() => {
    if (!selectedHomeId) return;
    async function loadRoomsAndLocations() {
      const { data, error } = await supabase
        .from("rooms").select("*").eq("home_id", selectedHomeId)
        .order("created_at", { ascending: true });
      if (error) { console.error("rooms fetch error:", error); return; }
      const roomList = (data as Room[]) || [];
      setRooms(roomList);
      const roomIds = roomList.map((r) => r.id);
      await fetchLocations(roomIds);
      if (roomList.length > 0 && !activeRoomId) { setActiveRoomId(roomList[0].id); }
      else if (roomList.length === 0) { setActiveRoomId(null); }
    }
    loadRoomsAndLocations();
  }, [selectedHomeId]);

  useEffect(() => {
    if (!selectedLocationId) return;
    fetchItems(selectedLocationId);
  }, [selectedLocationId]);

  /* ── render ── */
  return (
    <main className="min-h-screen bg-[#F9FAFB] text-slate-900">
      {/* 온보딩 */}
      <OnboardingGuide show={homes.length === 0} onDismiss={() => {}} />

      {/* Cmd+K 검색 */}
      <SearchPanel
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        allItems={allItems}
        locations={locations}
        rooms={rooms}
        onSelect={handleSearchSelect}
      />

      {/* 토스트 */}
      <ToastContainer />

      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 sm:px-8 sm:py-8">
        {/* ── 헤더 ── */}
        <header className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* 모바일 햄버거 */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm md:hidden"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">어디있니?</h1>
              <p className="hidden text-xs text-slate-400 sm:block">
                집 안 물건을 정리하고 쉽게 찾아보세요
              </p>
            </div>
          </div>

          {/* 검색 버튼 */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-400 shadow-sm transition hover:border-slate-300 hover:shadow"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <span className="hidden sm:inline">물건 검색...</span>
            <kbd className="hidden rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 sm:inline">
              ⌘K
            </kbd>
          </button>
        </header>

        {/* ── 브레드크럼 ── */}
        <div className="mb-4">
          <Breadcrumb
            homeName={selectedHome?.name}
            roomName={activeRoom?.name}
            locationName={selectedLocation?.name}
            onClickHome={() => {
              setActiveRoomId(null);
              setSelectedLocationId(null);
              setItems([]);
            }}
            onClickRoom={() => {
              setSelectedLocationId(null);
              setItems([]);
            }}
            onClickLocation={() => {}}
          />
        </div>

        <div className="flex flex-1 flex-col gap-5 md:flex-row">
          {/* ── 사이드바 (통합) ── */}
          {/* 모바일 오버레이 */}
          {sidebarOpen && (
            <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={() => setSidebarOpen(false)} />
          )}
          <section
            className={`${
              sidebarOpen ? "translate-x-0" : "-translate-x-full"
            } fixed inset-y-0 left-0 z-50 w-80 overflow-y-auto bg-white shadow-xl transition-transform md:static md:z-auto md:w-80 md:translate-x-0 md:shadow-none md:overflow-visible`}
          >
            <div className="flex flex-col gap-4 p-4 md:p-0">
              {/* 모바일 닫기 */}
              <button
                onClick={() => setSidebarOpen(false)}
                className="self-end rounded-lg p-1 text-slate-400 hover:text-slate-600 md:hidden"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>

              {/* ── 1. 집 선택 ── */}
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  집
                </label>
                <div className="mt-1.5 flex items-center gap-2">
                  <select
                    value={selectedHomeId ?? ""}
                    onChange={(e) => {
                      setSelectedHomeId(e.target.value);
                      setEditingHomeId(null);
                      setActiveRoomId(null);
                      setSelectedLocationId(null);
                    }}
                    className="block w-full flex-1 appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">집을 선택하세요</option>
                    {homes.map((home) => (
                      <option key={home.id} value={home.id}>{home.name}</option>
                    ))}
                  </select>
                  {selectedHomeId && (
                    <button
                      onClick={() => {
                        const h = homes.find((h) => h.id === selectedHomeId);
                        if (h) { setEditingHomeId(h.id); setEditingHomeName(h.name); }
                      }}
                      className="shrink-0 rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-400 shadow-sm transition hover:border-slate-300 hover:text-slate-600"
                      title="집 이름 변경"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                  )}
                </div>
                {editingHomeId && (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      value={editingHomeName}
                      onChange={(e) => setEditingHomeName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); renameHome(editingHomeId, editingHomeName); }
                        if (e.key === "Escape") setEditingHomeId(null);
                      }}
                      autoFocus
                      className="flex-1 rounded-lg border border-indigo-500 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-2 ring-indigo-500/20"
                      placeholder="집 이름"
                    />
                    <button onClick={() => renameHome(editingHomeId, editingHomeName)} className="shrink-0 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white">저장</button>
                    <button onClick={() => setEditingHomeId(null)} className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-500">취소</button>
                  </div>
                )}
                <div className="mt-2 flex items-center gap-2">
                  <input
                    value={newHomeName}
                    onChange={(e) => setNewHomeName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addHome(); } }}
                    placeholder="새 집 이름"
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <button onClick={addHome} className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:border-slate-300">
                    + 집
                  </button>
                </div>
              </div>

              {/* ── 2. 방 목록 (항상 표시) ── */}
              {selectedHomeId && (
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      방
                    </label>
                    {viewMode === "2d" && (
                      <div className="flex rounded-md border border-slate-200 overflow-hidden text-[10px] font-medium">
                        <button
                          onClick={() => setNewRoomType("room")}
                          className={`px-2 py-1 transition ${newRoomType === "room" ? "bg-slate-800 text-white" : "bg-white text-slate-400"}`}
                        >방</button>
                        <button
                          onClick={() => setNewRoomType("hallway")}
                          className={`px-2 py-1 transition border-l border-slate-200 ${newRoomType === "hallway" ? "bg-slate-600 text-white" : "bg-white text-slate-400"}`}
                        >복도</button>
                      </div>
                    )}
                  </div>

                  {viewMode === "2d" && (
                    <div className="mb-3 flex items-center gap-2">
                      <input
                        value={newRoomName}
                        onChange={(e) => setNewRoomName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRoom(); } }}
                        placeholder={newRoomType === "hallway" ? "복도 이름" : "방 이름"}
                        className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                      />
                      <button
                        onClick={addRoom}
                        disabled={!selectedHomeId}
                        className="shrink-0 rounded-lg bg-indigo-600 px-3 py-2.5 text-xs font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
                      >
                        추가
                      </button>
                    </div>
                  )}

                  {rooms.length === 0 ? (
                    <EmptyState type="room" />
                  ) : (
                    <ul className="space-y-1">
                      {rooms.map((room) => {
                        const isActive = activeRoomId === room.id;
                        const locCount = locations.filter((l) => l.room_id === room.id).length;
                        return (
                          <li key={room.id}>
                            <button
                              onClick={() => {
                                setActiveRoomId(room.id);
                                setSelectedLocationId(null);
                                setItems([]);
                              }}
                              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs transition ${
                                isActive
                                  ? "bg-indigo-50 text-indigo-700 font-semibold"
                                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                              }`}
                            >
                              <span className="flex items-center gap-1.5">
                                {room.room_type === "hallway" ? (
                                  <span className="text-[10px] text-slate-400">〰️</span>
                                ) : (
                                  <span className={`h-2 w-2 rounded-full ${isActive ? "bg-indigo-500" : "bg-slate-300"}`} />
                                )}
                                {room.name}
                              </span>
                              <span className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-400">{locCount}개</span>
                                {viewMode === "2d" && (
                                  <span
                                    onClick={(e) => { e.stopPropagation(); deleteRoomWithContents(room.id); }}
                                    className="text-[10px] text-slate-300 hover:text-red-500 transition cursor-pointer"
                                  >
                                    삭제
                                  </span>
                                )}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {/* 2D: 문/창문 설정 */}
                  {viewMode === "2d" && activeRoomId && (() => {
                    const ar = rooms.find((r) => r.id === activeRoomId);
                    if (!ar) return null;
                    const openings = ar.openings ?? [];
                    return (
                      <div className="mt-3 border-t border-slate-100 pt-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[11px] font-semibold text-slate-500">{ar.name} 문/창문</p>
                          <div className="flex gap-1">
                            <button onClick={() => addOpening("door")} className="text-[10px] px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition">+ 문</button>
                            <button onClick={() => addOpening("window")} className="text-[10px] px-2 py-1 rounded bg-sky-50 hover:bg-sky-100 text-sky-600 transition">+ 창문</button>
                          </div>
                        </div>
                        {openings.length === 0 ? (
                          <p className="text-[10px] text-slate-400">아직 문이나 창문이 없어요.</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {openings.map((op) => (
                              <li key={op.id} className="flex items-center gap-1.5 text-[10px] bg-slate-50 rounded-lg px-2 py-1.5">
                                <span className="text-sm">{op.type === "door" ? "🚪" : "🪟"}</span>
                                <select
                                  value={op.wall}
                                  onChange={(e) => changeOpeningWall(ar.id, op.id, e.target.value as Opening["wall"])}
                                  className="flex-1 rounded border border-slate-200 px-1 py-0.5 text-[10px] outline-none"
                                >
                                  <option value="n">위 벽</option>
                                  <option value="s">아래 벽</option>
                                  <option value="e">오른쪽 벽</option>
                                  <option value="w">왼쪽 벽</option>
                                </select>
                                <button onClick={() => removeOpening(ar.id, op.id)} className="text-slate-300 hover:text-red-400 transition text-base leading-none">×</button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* ── 3. 수납공간 (3D 모드) ── */}
              {viewMode === "3d" && activeRoomId && !selectedLocationId && (
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    수납공간 — {activeRoom?.name}
                  </label>
                  <div className="mb-3 flex items-center gap-2">
                    <input
                      value={newLocationName}
                      onChange={(e) => setNewLocationName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLocation(); } }}
                      placeholder="예: 신발장, 서랍, 선반"
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <button
                      onClick={addLocation}
                      className="shrink-0 rounded-lg bg-slate-800 px-3 py-2.5 text-xs font-medium text-white shadow-sm transition hover:bg-black"
                    >
                      추가
                    </button>
                  </div>
                  {locations.filter((l) => l.room_id === activeRoomId).length === 0 ? (
                    <EmptyState type="location" />
                  ) : (
                    <ul className="space-y-1.5">
                      {locations.filter((l) => l.room_id === activeRoomId).map((loc) => {
                        const cnt = allItems.filter((i) => i.location_id === loc.id).length;
                        return (
                          <li key={loc.id}>
                            <button
                              onClick={() => setSelectedLocationId(loc.id)}
                              className="flex w-full items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-700 hover:bg-indigo-50 transition"
                            >
                              <span className="font-medium">{loc.name}</span>
                              <span className="text-[10px] text-slate-400">{cnt}개</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}

              {/* ── 4. 물건 관리 (3D 모드 + 수납공간 선택 시) ── */}
              {viewMode === "3d" && selectedLocationId && (
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <button
                        onClick={() => { setSelectedLocationId(null); setItems([]); }}
                        className="text-[11px] text-slate-400 hover:text-indigo-600 transition"
                      >
                        ← 뒤로
                      </button>
                      <p className="text-sm font-semibold text-slate-800 mt-0.5">{selectedLocation?.name}</p>
                      <p className="text-[10px] text-slate-400">{items.length}개 물건</p>
                    </div>
                    <button
                      onClick={deleteSelectedLocation}
                      className="text-[11px] font-semibold text-red-500 hover:text-red-700 transition"
                    >
                      삭제
                    </button>
                  </div>

                  <ItemForm onAdd={addItem} />

                  {items.length === 0 ? (
                    <div className="mt-3">
                      <EmptyState type="item" />
                    </div>
                  ) : (
                    <ul className="mt-3 space-y-1 text-xs">
                      {items.map((item) => (
                        <li
                          key={item.id}
                          className="group flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 transition hover:bg-indigo-50"
                        >
                          {editingItemId === item.id ? (
                            <input
                              value={editingItemName}
                              onChange={(e) => setEditingItemName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") { e.preventDefault(); updateItemName(item.id, editingItemName); }
                                if (e.key === "Escape") setEditingItemId(null);
                              }}
                              onBlur={() => updateItemName(item.id, editingItemName)}
                              autoFocus
                              className="flex-1 rounded border border-indigo-400 px-2 py-0.5 text-xs outline-none ring-1 ring-indigo-200"
                            />
                          ) : (
                            <span
                              onClick={() => { setEditingItemId(item.id); setEditingItemName(item.name); }}
                              className="truncate cursor-pointer text-slate-700"
                            >
                              {item.name}
                            </span>
                          )}
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span className="text-[10px] text-slate-400">x{item.quantity}</span>
                            <button
                              onClick={() => deleteItem(item.id)}
                              className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition text-sm"
                            >
                              ×
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* ── 3D 모드: 방 미선택 ── */}
              {viewMode === "3d" && !activeRoomId && rooms.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                    <p className="text-sm font-medium text-slate-600">3D 화면에서 방을 클릭하세요</p>
                    <p className="text-xs text-slate-400">수납공간과 물건을 관리할 수 있어요</p>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ── 캔버스 영역 ── */}
          <section className="flex-1 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {/* 캔버스 헤더 */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">집 구조</h2>
                <p className="text-[11px] text-slate-400">
                  {viewMode === "2d" ? "방을 배치하고 크기를 조정하세요" : "가구를 클릭해서 물건을 관리하세요"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-semibold">
                  <button
                    onClick={() => setViewMode("2d")}
                    className={`px-3 py-1.5 transition ${viewMode === "2d" ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-100"}`}
                  >2D</button>
                  <button
                    onClick={() => { setViewMode("3d"); setHas3DInitialized(true); }}
                    className={`px-3 py-1.5 transition ${viewMode === "3d" ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-100"}`}
                  >3D</button>
                </div>
              </div>
            </div>

            <div className="relative h-[520px] w-full" style={{ background: "#ffffff" }}>
              {/* 빈 상태 */}
              {!selectedHomeId && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <EmptyState type="home" action={addHome} actionLabel="첫 번째 집 만들기" />
                </div>
              )}
              {selectedHomeId && rooms.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <EmptyState type="room" />
                </div>
              )}

              {/* 3D 씬 */}
              {has3DInitialized && (
                <div
                  style={{
                    position: "absolute", inset: 0,
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
                    highlightLocationId={highlightLocationId}
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
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(rgba(0,0,0,0.04) 0 1px, transparent 1px 28px), repeating-linear-gradient(90deg, rgba(0,0,0,0.04) 0 1px, transparent 1px 28px)",
                      backgroundSize: "28px 28px",
                    }}
                  />
                  <div className="absolute right-3 top-3 z-20 flex flex-col items-end gap-2 text-[10px] text-slate-500">
                    <div className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 shadow-sm border border-slate-100">
                      <span className="text-[9px] text-slate-400">줌</span>
                      <button onClick={() => setZoom((z) => Math.max(0.5, parseFloat((z - 0.1).toFixed(2))))} className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white hover:bg-slate-50">-</button>
                      <span className="w-8 text-center tabular-nums">{(zoom * 100).toFixed(0)}%</span>
                      <button onClick={() => setZoom((z) => Math.min(2, parseFloat((z + 0.1).toFixed(2))))} className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white hover:bg-slate-50">+</button>
                    </div>
                    <div className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 shadow-sm border border-slate-100">
                      <span className="text-[9px] text-slate-400">이동</span>
                      <button onClick={() => setPan((p) => ({ ...p, y: p.y + 40 }))} className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white hover:bg-slate-50">↑</button>
                      <button onClick={() => setPan((p) => ({ ...p, x: p.x - 40 }))} className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white hover:bg-slate-50">←</button>
                      <button onClick={() => setPan((p) => ({ ...p, x: p.x + 40 }))} className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white hover:bg-slate-50">→</button>
                      <button onClick={() => setPan((p) => ({ ...p, y: p.y - 40 }))} className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white hover:bg-slate-50">↓</button>
                      <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="ml-1 flex h-5 items-center justify-center rounded-full border border-slate-200 bg-white px-2 hover:bg-slate-50">초기화</button>
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
                              void updateRoomLayout(room.id, { x: d.x, y: d.y, width: room.width, height: room.height });
                            }}
                            onResizeStop={async (_e, _direction, ref, _delta, position) => {
                              await updateRoomLayout(room.id, {
                                x: position.x, y: position.y,
                                width: parseInt(ref.style.width, 10),
                                height: parseInt(ref.style.height, 10),
                              });
                            }}
                            style={{ boxSizing: "border-box" }}
                          >
                            <div
                              onMouseDown={() => setActiveRoomId(room.id)}
                              style={{
                                width: "100%",
                                height: "100%",
                                background: room.room_type === "hallway"
                                  ? "repeating-linear-gradient(-45deg, #ddd6c8 0, #ddd6c8 1.5px, #ede8e0 1.5px, #ede8e0 8px)"
                                  : "#f5ead6",
                                border: `${room.room_type === "hallway" ? 6 : 10}px solid ${isActiveRoom ? "#4F46E5" : room.room_type === "hallway" ? "#6b7280" : "#2c2c2c"}`,
                                boxSizing: "border-box",
                                borderRadius: 2,
                                position: "relative",
                                boxShadow: isActiveRoom
                                  ? "0 0 0 2px rgba(79,70,229,0.5), 4px 6px 16px rgba(0,0,0,0.4)"
                                  : "2px 4px 10px rgba(0,0,0,0.3)",
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
                                    <svg
                                      style={{
                                        position: "absolute", top: -10, left: -10,
                                        width: room.width, height: room.height,
                                        overflow: "visible", pointerEvents: "none", zIndex: 20,
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
                                                  {[2, 5, 8].map((dy) => (<line key={dy} x1={gx + 2} y1={dy} x2={gx + ow - 2} y2={dy} />))}
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
                                                  {[2, 5, 8].map((dy) => (<line key={dy} x1={gx + 2} y1={gy + dy} x2={gx + ow - 2} y2={gy + dy} />))}
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
                                                  {[2, 5, 8].map((dx) => (<line key={dx} x1={gx + dx} y1={gy + 2} x2={gx + dx} y2={gy + ow - 2} />))}
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
                                                {[2, 5, 8].map((dx) => (<line key={dx} x1={dx} y1={gy + 2} x2={dx} y2={gy + ow - 2} />))}
                                              </g>
                                            )}
                                          </g>
                                        );
                                      })}
                                    </svg>

                                    {/* 드래그 핸들 */}
                                    {(room.openings ?? []).map((op) => {
                                      const ow = op.width;
                                      const isDraggingThis = opDrag?.openingId === op.id && opDrag?.roomId === room.id;
                                      const pos = isDraggingThis ? opDrag!.curPos : op.position;
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
                                              roomId: room.id, openingId: op.id, wall: op.wall,
                                              startPos: op.position, startClient: { x: e.clientX, y: e.clientY },
                                              roomW: room.width, roomH: room.height, opW: ow, curPos: op.position,
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
                                  color: "white", padding: "3px 8px", fontSize: "10px",
                                  fontWeight: 700, cursor: "move", display: "flex",
                                  justifyContent: "space-between", alignItems: "center",
                                  letterSpacing: "0.06em", textTransform: "uppercase",
                                  userSelect: "none", transition: "background 150ms",
                                }}
                              >
                                <span>{room.name}</span>
                                <button
                                  type="button"
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onClick={(e) => { e.stopPropagation(); deleteRoomWithContents(room.id); }}
                                  style={{ color: "rgba(255,255,255,0.55)", fontSize: "15px", lineHeight: 1, background: "none", border: "none", cursor: "pointer", padding: "0 2px" }}
                                >×</button>
                              </div>

                              {/* 바닥 영역 — 수납공간 박스 표시 */}
                              <div style={{ position: "relative", height: "calc(100% - 22px)", overflow: "hidden" }}>
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
                                        position: "absolute", left: loc.x, top: loc.y,
                                        width: loc.width, height: loc.height, zIndex: 30,
                                        background: isLocSelected ? "rgba(79,70,229,0.25)" : "rgba(255,255,255,0.55)",
                                        border: `1.5px solid ${isLocSelected ? "#4F46E5" : "rgba(0,0,0,0.25)"}`,
                                        borderRadius: 2, boxSizing: "border-box", cursor: "pointer",
                                        display: "flex", flexDirection: "column", alignItems: "center",
                                        justifyContent: "center", gap: 1, userSelect: "none",
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
