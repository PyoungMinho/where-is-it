"use client";

import { Fragment, useEffect, useMemo, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { Rnd } from "react-rnd";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import type { Room, Opening, RoomType } from "@/types/room";
import type { Location } from "@/types/location";
import type { Item } from "@/types/item";

import ToastContainer, { showToast } from "./components/Toast";
import Breadcrumb from "./components/Breadcrumb";
import EmptyState from "./components/EmptyState";
import SearchPanel from "./components/SearchPanel";
import OnboardingGuide from "./components/OnboardingGuide";
import ItemForm from "./components/ItemForm";
import LanguageSwitcher from "./components/LanguageSwitcher";
import ThemeToggle from "./components/ThemeToggle";
import Dashboard from "./components/Dashboard";
import MoveItemModal from "./components/MoveItemModal";
import BatchAddForm from "./components/BatchAddForm";
import TemplateSelector from "./components/TemplateSelector";

const FloorPlan3D = dynamic(() => import("./components/FloorPlan3D"), {
  ssr: false,
});

type Home = {
  id: string;
  name: string;
  created_at: string;
};

/* ── Undo/Redo system ── */
type UndoAction = {
  label: string;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
};

export default function HomePage() {
  const { t } = useI18n();

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

  // Location drag state for 2D mode
  const [locDrag, setLocDrag] = useState<{
    locId: string;
    roomId: string;
    startX: number;
    startY: number;
    startClientX: number;
    startClientY: number;
  } | null>(null);

  // New feature state
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [moveItem, setMoveItem] = useState<Item | null>(null);
  const [batchAddOpen, setBatchAddOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "date" | "quantity" | "category">("date");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  // Undo/Redo
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const [redoStack, setRedoStack] = useState<UndoAction[]>([]);

  const mainContentRef = useRef<HTMLDivElement>(null);

  /* ── derived ── */
  const selectedHome = homes.find((h) => h.id === selectedHomeId);
  const activeRoom = rooms.find((r) => r.id === activeRoomId);
  const selectedLocation = locations.find((l) => l.id === selectedLocationId);

  // Sorted items
  const sortedItems = useMemo(() => {
    const sorted = [...items];
    switch (sortBy) {
      case "name":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "quantity":
        sorted.sort((a, b) => b.quantity - a.quantity);
        break;
      case "category":
        sorted.sort((a, b) => a.category.localeCompare(b.category));
        break;
      case "date":
      default:
        sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }
    return sorted;
  }, [items, sortBy]);

  /* ── Cmd+K shortcut + Undo/Redo ── */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === "y" || (e.shiftKey && e.key === "z"))) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [undoStack, redoStack]);

  /* ── Undo/Redo handlers ── */
  const pushUndo = (action: UndoAction) => {
    setUndoStack((prev) => [...prev.slice(-19), action]);
    setRedoStack([]);
  };

  const handleUndo = async () => {
    const action = undoStack[undoStack.length - 1];
    if (!action) return;
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, action]);
    await action.undo();
    showToast(t.undoAction(action.label));
  };

  const handleRedo = async () => {
    const action = redoStack[redoStack.length - 1];
    if (!action) return;
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, action]);
    await action.redo();
    showToast(t.redoAction(action.label));
  };

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
    const name = newHomeName.trim() || t.defaultHomeName;
    const { error } = await supabase.from("homes").insert([{ name }]);
    if (error) { console.error("home insert error:", error); return; }
    setNewHomeName("");
    await fetchHomes();
    showToast(t.homeAdded(name));
  };

  const renameHome = async (id: string, name: string) => {
    if (!name.trim()) return;
    const { error } = await supabase.from("homes").update({ name: name.trim() }).eq("id", id);
    if (error) { console.error("home rename error:", error); return; }
    setEditingHomeId(null);
    await fetchHomes();
  };

  const addRoom = async () => {
    if (!selectedHomeId) { showToast(t.needHomeFirst); return; }
    if (!newRoomName.trim()) { showToast(t.enterRoomName); return; }
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
    showToast(t.roomAdded(newRoomName));
  };

  const addLocation = async () => {
    if (rooms.length === 0) { showToast(t.needRoomFirst); return; }
    if (!activeRoomId) { showToast(t.selectRoomFirst); return; }
    if (!newLocationName.trim()) { showToast(t.enterLocationName); return; }
    const targetRoom = rooms.find((r) => r.id === activeRoomId);
    if (!targetRoom) { showToast(t.roomNotFound); return; }
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
    showToast(t.locationAdded(newLocationName));
  };

  const addItem = async (data: { name: string; category: string; quantity: number; memo: string }) => {
    if (!selectedLocationId) { showToast(t.selectLocationFirst); return; }
    const { error, data: inserted } = await supabase.from("items").insert([{
      location_id: selectedLocationId,
      name: data.name,
      category: data.category,
      memo: data.memo,
      quantity: data.quantity,
      color: "#f59e0b",
    }]).select();
    if (error) { console.error("item insert error:", error); return; }
    await fetchItems(selectedLocationId);
    await refreshAllItems(locations);
    showToast(t.itemRegistered(data.name));

    // Push undo action
    if (inserted && inserted[0]) {
      const itemId = inserted[0].id;
      const locId = selectedLocationId;
      pushUndo({
        label: data.name,
        undo: async () => {
          await supabase.from("items").delete().eq("id", itemId);
          if (locId) await fetchItems(locId);
          await refreshAllItems(locations);
        },
        redo: async () => {
          await supabase.from("items").insert([{
            location_id: locId,
            name: data.name,
            category: data.category,
            memo: data.memo,
            quantity: data.quantity,
            color: "#f59e0b",
          }]);
          if (locId) await fetchItems(locId);
          await refreshAllItems(locations);
        },
      });
    }
  };

  const deleteItem = async (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    const { error } = await supabase.from("items").delete().eq("id", itemId);
    if (error) { console.error("item delete error:", error); return; }
    if (selectedLocationId) await fetchItems(selectedLocationId);
    await refreshAllItems(locations);
    showToast(t.itemDeleted);

    // Push undo action
    if (item) {
      const locId = selectedLocationId;
      pushUndo({
        label: item.name,
        undo: async () => {
          await supabase.from("items").insert([{
            location_id: item.location_id,
            name: item.name,
            category: item.category,
            memo: item.memo,
            quantity: item.quantity,
            color: item.color,
          }]);
          if (locId) await fetchItems(locId);
          await refreshAllItems(locations);
        },
        redo: async () => {
          // Can't redo exact delete since ID changed, just delete by name+location
          const { data } = await supabase.from("items").select("id").eq("location_id", item.location_id).eq("name", item.name).limit(1);
          if (data && data[0]) {
            await supabase.from("items").delete().eq("id", data[0].id);
          }
          if (locId) await fetchItems(locId);
          await refreshAllItems(locations);
        },
      });
    }
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
    if (locDrag) {
      const dx = (e.clientX - locDrag.startClientX) / zoom;
      const dy = (e.clientY - locDrag.startClientY) / zoom;
      const newX = Math.max(0, locDrag.startX + dx);
      const newY = Math.max(0, locDrag.startY + dy);
      setLocations((prev) =>
        prev.map((l) => (l.id === locDrag.locId ? { ...l, x: newX, y: newY } : l))
      );
      return;
    }
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
    if (locDrag) {
      const loc = locations.find((l) => l.id === locDrag.locId);
      if (loc) {
        void moveLocation(locDrag.locId, loc.x, loc.y);
      }
      setLocDrag(null);
      return;
    }
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
    const confirmDelete = window.confirm(t.confirmDeleteLocation);
    if (!confirmDelete) return;
    const locationId = selectedLocationId;
    const { error: itemsError } = await supabase.from("items").delete().eq("location_id", locationId);
    if (itemsError) { console.error("items delete error:", itemsError); return; }
    const { error: locationError } = await supabase.from("locations").delete().eq("id", locationId);
    if (locationError) { console.error("location delete error:", locationError); return; }
    setSelectedLocationId(null);
    setItems([]);
    await fetchLocations(rooms.map((r) => r.id));
    showToast(t.locationDeleted);
  };

  const deleteRoomWithContents = async (roomId: string) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;
    const confirmDelete = window.confirm(t.confirmDeleteRoom(room.name));
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

  /* ── Move item handler ── */
  const handleMoveItem = async (itemId: string, newLocationId: string) => {
    const { error } = await supabase.from("items").update({ location_id: newLocationId }).eq("id", itemId);
    if (error) { console.error("move item error:", error); return; }
    const destLoc = locations.find((l) => l.id === newLocationId);
    const item = items.find((i) => i.id === itemId);
    if (selectedLocationId) await fetchItems(selectedLocationId);
    await refreshAllItems(locations);
    if (item && destLoc) {
      showToast(t.itemMoved(item.name, destLoc.name));
    }
  };

  /* ── Batch add handler ── */
  const handleBatchAdd = async (batchItems: { name: string; category: string; quantity: number; memo: string }[]) => {
    if (!selectedLocationId) return;
    const inserts = batchItems.map((item) => ({
      location_id: selectedLocationId,
      name: item.name,
      category: item.category,
      memo: item.memo,
      quantity: item.quantity,
      color: "#f59e0b",
    }));
    const { error } = await supabase.from("items").insert(inserts);
    if (error) { console.error("batch insert error:", error); return; }
    await fetchItems(selectedLocationId);
    await refreshAllItems(locations);
    showToast(t.batchAddComplete(batchItems.length));
  };

  /* ── Template apply handler ── */
  const handleApplyTemplate = async (templateRooms: { name: string; type: "room" | "hallway"; width: number; height: number; x: number; y: number }[]) => {
    if (!selectedHomeId) return;
    const inserts = templateRooms.map((r) => ({
      home_id: selectedHomeId,
      name: r.name,
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height,
      color: "#3b82f6",
      room_type: r.type,
    }));
    const { error } = await supabase.from("rooms").insert(inserts);
    if (error) { console.error("template apply error:", error); return; }
    await fetchRooms(selectedHomeId);
  };

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

  /* ── category labels ── */
  const catLabels: Record<string, string> = {
    electronics: t.catElectronics,
    documents: t.catDocumentsShort,
    daily: t.catDaily,
    clothes: t.catClothes,
    kitchen: t.catKitchenShort,
    tools: t.catTools,
    etc: t.catEtc,
  };

  /* ── render ── */
  return (
    <main className="min-h-screen" style={{ background: "var(--surface-secondary)", color: "var(--text-primary)" }}>
      {/* Skip link for accessibility */}
      <a href="#main-content" className="skip-link" tabIndex={0}>{t.skipToContent}</a>

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

      {/* Modals */}
      {dashboardOpen && (
        <Dashboard rooms={rooms} locations={locations} allItems={allItems} onClose={() => setDashboardOpen(false)} />
      )}
      {moveItem && (
        <MoveItemModal
          item={moveItem}
          rooms={rooms}
          locations={locations}
          currentLocationId={moveItem.location_id}
          onMove={handleMoveItem}
          onClose={() => setMoveItem(null)}
        />
      )}
      {batchAddOpen && (
        <BatchAddForm onBatchAdd={handleBatchAdd} onClose={() => setBatchAddOpen(false)} />
      )}
      {templateOpen && (
        <TemplateSelector onApply={handleApplyTemplate} onClose={() => setTemplateOpen(false)} />
      )}

      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-8 sm:py-8">
        {/* ── 헤더 ── */}
        <header className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* 모바일 햄버거 */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-lg shadow-sm md:hidden"
              style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
              aria-label={t.openMenu}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: "var(--text-primary)" }}>{t.appTitle}</h1>
              <p className="hidden text-xs sm:block" style={{ color: "var(--text-tertiary)" }}>
                {t.appDesc}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Dashboard */}
            <button
              onClick={() => setDashboardOpen(true)}
              className="hidden sm:flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition"
              style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-secondary)" }}
              title={t.showDashboard}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
              </svg>
              <span className="hidden lg:inline">{t.dashboard}</span>
            </button>

            {/* Undo/Redo */}
            <div className="hidden sm:flex items-center rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              <button
                onClick={handleUndo}
                disabled={undoStack.length === 0}
                className="flex h-8 w-8 items-center justify-center transition disabled:opacity-30"
                style={{ background: "var(--surface)", color: "var(--text-secondary)" }}
                title={`${t.undo} (⌘Z)`}
                aria-label={t.undo}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                </svg>
              </button>
              <button
                onClick={handleRedo}
                disabled={redoStack.length === 0}
                className="flex h-8 w-8 items-center justify-center transition disabled:opacity-30"
                style={{ background: "var(--surface)", color: "var(--text-secondary)", borderLeft: "1px solid var(--border)" }}
                title={`${t.redo} (⌘⇧Z)`}
                aria-label={t.redo}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" />
                </svg>
              </button>
            </div>

            <ThemeToggle />
            <LanguageSwitcher />

            {/* 검색 버튼 */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 rounded-full px-4 py-2 text-sm shadow-sm transition"
              style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-tertiary)" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <span className="hidden sm:inline">{t.searchPlaceholder}</span>
              <kbd className="hidden rounded px-1.5 py-0.5 text-[10px] font-mono sm:inline" style={{ border: "1px solid var(--border)", background: "var(--surface-secondary)", color: "var(--text-tertiary)" }}>
                ⌘K
              </kbd>
            </button>
          </div>
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

        <div id="main-content" ref={mainContentRef} className="flex flex-1 flex-col gap-5 md:flex-row">
          {/* ── 사이드바 (통합) ── */}
          {/* 모바일 오버레이 */}
          {sidebarOpen && (
            <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={() => setSidebarOpen(false)} />
          )}
          <section
            className={`${
              sidebarOpen ? "translate-x-0" : "-translate-x-full"
            } fixed inset-y-0 left-0 z-50 w-80 overflow-y-auto shadow-xl transition-transform md:static md:z-auto md:w-72 md:translate-x-0 md:shadow-none md:overflow-visible md:shrink-0`}
            style={{ background: "var(--sidebar-bg)" }}
            role="navigation"
            aria-label="Sidebar"
          >
            <div className="flex flex-col gap-4 p-4 md:p-0">
              {/* 모바일 닫기 */}
              <button
                onClick={() => setSidebarOpen(false)}
                className="self-end rounded-lg p-1 transition md:hidden"
                style={{ color: "var(--text-tertiary)" }}
                aria-label={t.closeMenu}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>

              {/* ── 1. 집 선택 ── */}
              <div className="rounded-xl px-4 py-3 shadow-sm" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
                <label className="block text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                  {t.home}
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
                    className="block w-full flex-1 appearance-none rounded-lg px-3 py-2.5 text-sm outline-none transition"
                    style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)" }}
                    aria-label={t.selectHome}
                  >
                    <option value="">{t.selectHome}</option>
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
                      className="shrink-0 rounded-lg p-2.5 text-xs shadow-sm transition"
                      style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-tertiary)" }}
                      title={t.editHomeName}
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
                      className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                      style={{ border: "1px solid var(--accent)", background: "var(--surface)", color: "var(--text-primary)" }}
                      placeholder={t.homePlaceholder}
                    />
                    <button onClick={() => renameHome(editingHomeId, editingHomeName)} className="shrink-0 rounded-lg px-3 py-2 text-xs font-medium text-white" style={{ background: "var(--accent)" }}>{t.save}</button>
                    <button onClick={() => setEditingHomeId(null)} className="shrink-0 rounded-lg px-3 py-2 text-xs" style={{ border: "1px solid var(--border)", color: "var(--text-tertiary)" }}>{t.cancel}</button>
                  </div>
                )}
                <div className="mt-2 flex items-center gap-2">
                  <input
                    value={newHomeName}
                    onChange={(e) => setNewHomeName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addHome(); } }}
                    placeholder={t.newHomeName}
                    className="flex-1 rounded-lg px-3 py-2 text-sm outline-none transition"
                    style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)" }}
                  />
                  <button onClick={addHome} className="shrink-0 rounded-lg px-3 py-2 text-xs font-medium shadow-sm transition" style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-secondary)" }}>
                    {t.addHome}
                  </button>
                </div>

                {/* Template button */}
                {selectedHomeId && rooms.length === 0 && (
                  <button
                    onClick={() => setTemplateOpen(true)}
                    className="mt-2 w-full rounded-lg px-3 py-2.5 text-xs font-medium text-white transition"
                    style={{ background: "var(--accent)" }}
                  >
                    {t.template}
                  </button>
                )}
              </div>

              {/* ── 2. 방 목록 (항상 표시) ── */}
              {selectedHomeId && (
                <div className="rounded-xl px-4 py-3 shadow-sm" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                      {t.room}
                    </label>
                    {viewMode === "2d" && (
                      <div className="flex rounded-md overflow-hidden text-[10px] font-medium" style={{ border: "1px solid var(--border)" }}>
                        <button
                          onClick={() => setNewRoomType("room")}
                          className="px-2 py-1 transition"
                          style={{
                            background: newRoomType === "room" ? "var(--text-primary)" : "var(--surface)",
                            color: newRoomType === "room" ? "var(--surface)" : "var(--text-tertiary)",
                          }}
                        >{t.room}</button>
                        <button
                          onClick={() => setNewRoomType("hallway")}
                          className="px-2 py-1 transition"
                          style={{
                            background: newRoomType === "hallway" ? "var(--text-secondary)" : "var(--surface)",
                            color: newRoomType === "hallway" ? "white" : "var(--text-tertiary)",
                            borderLeft: "1px solid var(--border)",
                          }}
                        >{t.hallway}</button>
                      </div>
                    )}
                  </div>

                  {viewMode === "2d" && (
                    <div className="mb-3 flex items-center gap-2">
                      <input
                        value={newRoomName}
                        onChange={(e) => setNewRoomName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRoom(); } }}
                        placeholder={newRoomType === "hallway" ? t.hallwayNamePlaceholder : t.roomNamePlaceholder}
                        className="flex-1 rounded-lg px-3 py-2.5 text-sm outline-none transition"
                        style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)" }}
                      />
                      <button
                        onClick={addRoom}
                        disabled={!selectedHomeId}
                        className="shrink-0 rounded-lg px-3 py-2.5 text-xs font-medium text-white shadow-sm transition disabled:opacity-50"
                        style={{ background: "var(--accent)" }}
                      >
                        {t.add}
                      </button>
                    </div>
                  )}

                  {rooms.length === 0 ? (
                    <EmptyState type="room" />
                  ) : (
                    <ul className="space-y-1" role="list">
                      {rooms.map((room) => {
                        const isActive = activeRoomId === room.id;
                        const locCount = locations.filter((l) => l.room_id === room.id).length;
                        return (
                          <li key={room.id} role="listitem">
                            <button
                              onClick={() => {
                                setActiveRoomId(room.id);
                                setSelectedLocationId(null);
                                setItems([]);
                              }}
                              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs transition"
                              style={{
                                background: isActive ? "var(--accent-light)" : "var(--surface-secondary)",
                                color: isActive ? "var(--accent)" : "var(--text-secondary)",
                                fontWeight: isActive ? 600 : 400,
                              }}
                              aria-current={isActive ? "true" : undefined}
                            >
                              <span className="flex items-center gap-1.5">
                                {room.room_type === "hallway" ? (
                                  <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>〰️</span>
                                ) : (
                                  <span className="h-2 w-2 rounded-full" style={{ background: isActive ? "var(--accent)" : "var(--text-quaternary)" }} />
                                )}
                                {room.name}
                              </span>
                              <span className="flex items-center gap-2">
                                <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{t.count(locCount)}</span>
                                {viewMode === "2d" && (
                                  <span
                                    onClick={(e) => { e.stopPropagation(); deleteRoomWithContents(room.id); }}
                                    className="text-[10px] transition cursor-pointer"
                                    style={{ color: "var(--text-quaternary)" }}
                                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--danger)")}
                                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-quaternary)")}
                                  >
                                    {t.delete}
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
                      <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--border-light)" }}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[11px] font-semibold" style={{ color: "var(--text-tertiary)" }}>{t.doorWindow(ar.name)}</p>
                          <div className="flex gap-1">
                            <button onClick={() => addOpening("door")} className="text-[10px] px-2 py-1 rounded transition" style={{ background: "var(--surface-secondary)", color: "var(--text-secondary)" }}>{t.addDoor}</button>
                            <button onClick={() => addOpening("window")} className="text-[10px] px-2 py-1 rounded transition" style={{ background: "var(--accent-lighter)", color: "var(--accent)" }}>{t.addWindow}</button>
                          </div>
                        </div>
                        {openings.length === 0 ? (
                          <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{t.noDoorWindow}</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {openings.map((op) => (
                              <li key={op.id} className="flex items-center gap-1.5 text-[10px] rounded-lg px-2 py-1.5" style={{ background: "var(--surface-secondary)" }}>
                                <span className="text-sm">{op.type === "door" ? "🚪" : "🪟"}</span>
                                <select
                                  value={op.wall}
                                  onChange={(e) => changeOpeningWall(ar.id, op.id, e.target.value as Opening["wall"])}
                                  className="flex-1 rounded px-1 py-0.5 text-[10px] outline-none"
                                  style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-secondary)" }}
                                >
                                  <option value="n">{t.wallN}</option>
                                  <option value="s">{t.wallS}</option>
                                  <option value="e">{t.wallE}</option>
                                  <option value="w">{t.wallW}</option>
                                </select>
                                <button onClick={() => removeOpening(ar.id, op.id)} className="transition text-base leading-none" style={{ color: "var(--text-quaternary)" }} onMouseEnter={(e) => (e.currentTarget.style.color = "var(--danger)")} onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-quaternary)")}>×</button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })()}

                  {/* 2D: 수납공간 추가 */}
                  {viewMode === "2d" && activeRoomId && (
                    <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--border-light)" }}>
                      <p className="text-[11px] font-semibold mb-2" style={{ color: "var(--text-tertiary)" }}>{t.storageOf(activeRoom?.name ?? "")}</p>
                      <div className="flex items-center gap-2">
                        <input
                          value={newLocationName}
                          onChange={(e) => setNewLocationName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLocation(); } }}
                          placeholder={t.storagePlaceholder}
                          className="flex-1 rounded-lg px-3 py-2 text-xs outline-none transition"
                          style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)" }}
                        />
                        <button
                          onClick={addLocation}
                          className="shrink-0 rounded-lg px-3 py-2 text-xs font-medium text-white shadow-sm transition"
                          style={{ background: "var(--text-primary)" }}
                        >
                          {t.add}
                        </button>
                      </div>
                      {locations.filter((l) => l.room_id === activeRoomId).length > 0 && (
                        <p className="mt-2 text-[10px] italic" style={{ color: "var(--text-tertiary)" }}>{t.dragToMove}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── 3. 수납공간 (3D 모드) ── */}
              {viewMode === "3d" && activeRoomId && !selectedLocationId && (
                <div className="rounded-xl px-4 py-3 shadow-sm" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>
                    {t.storageOf(activeRoom?.name ?? "")}
                  </label>
                  <div className="mb-3 flex items-center gap-2">
                    <input
                      value={newLocationName}
                      onChange={(e) => setNewLocationName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLocation(); } }}
                      placeholder={t.storagePlaceholder}
                      className="flex-1 rounded-lg px-3 py-2.5 text-sm outline-none transition"
                      style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)" }}
                    />
                    <button
                      onClick={addLocation}
                      className="shrink-0 rounded-lg px-3 py-2.5 text-xs font-medium text-white shadow-sm transition"
                      style={{ background: "var(--text-primary)" }}
                    >
                      {t.add}
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
                              className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-xs transition"
                              style={{ background: "var(--surface-secondary)", color: "var(--text-secondary)" }}
                            >
                              <span className="font-medium">{loc.name}</span>
                              <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{t.count(cnt)}</span>
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
                <div className="rounded-xl px-4 py-3 shadow-sm" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <button
                        onClick={() => { setSelectedLocationId(null); setItems([]); }}
                        className="text-[11px] transition"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {t.back}
                      </button>
                      <p className="text-sm font-semibold mt-0.5" style={{ color: "var(--text-primary)" }}>{selectedLocation?.name}</p>
                      <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{t.itemCount(items.length)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setBatchAddOpen(true)}
                        className="text-[11px] font-medium transition rounded-md px-2 py-1"
                        style={{ background: "var(--accent-lighter)", color: "var(--accent)" }}
                        title={t.batchAdd}
                      >
                        {t.batchAdd}
                      </button>
                      <button
                        onClick={deleteSelectedLocation}
                        className="text-[11px] font-semibold transition"
                        style={{ color: "var(--danger)" }}
                      >
                        {t.delete}
                      </button>
                    </div>
                  </div>

                  <ItemForm onAdd={addItem} />

                  {/* Sort controls */}
                  {items.length > 1 && (
                    <div className="mt-3 flex items-center justify-between">
                      <div className="relative">
                        <button
                          onClick={() => setSortMenuOpen(!sortMenuOpen)}
                          className="flex items-center gap-1 text-[10px] font-medium rounded-md px-2 py-1 transition"
                          style={{ background: "var(--surface-secondary)", color: "var(--text-tertiary)", border: "1px solid var(--border-light)" }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="14" y2="15" /><line x1="4" y1="3" x2="8" y2="3" /><line x1="4" y1="21" x2="10" y2="21" />
                          </svg>
                          {t.sortBy}
                        </button>
                        {sortMenuOpen && (
                          <div
                            className="absolute top-full left-0 mt-1 rounded-lg py-1 shadow-lg z-10"
                            style={{ background: "var(--surface)", border: "1px solid var(--border)", minWidth: "100px" }}
                          >
                            {(["name", "date", "quantity", "category"] as const).map((key) => {
                              const labels = { name: t.sortName, date: t.sortDate, quantity: t.sortQuantity, category: t.sortCategory };
                              return (
                                <button
                                  key={key}
                                  onClick={() => { setSortBy(key); setSortMenuOpen(false); }}
                                  className="block w-full text-left px-3 py-1.5 text-[11px] transition"
                                  style={{
                                    color: sortBy === key ? "var(--accent)" : "var(--text-secondary)",
                                    fontWeight: sortBy === key ? 600 : 400,
                                    background: sortBy === key ? "var(--accent-lighter)" : "transparent",
                                  }}
                                >
                                  {labels[key]}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px]" style={{ color: "var(--text-quaternary)" }}>
                        {t.count(items.length)}
                      </span>
                    </div>
                  )}

                  {items.length === 0 ? (
                    <div className="mt-3">
                      <EmptyState type="item" />
                    </div>
                  ) : (
                    <ul className="mt-3 space-y-1 text-xs" role="list">
                      {sortedItems.map((item) => (
                        <li
                          key={item.id}
                          className="group flex items-center justify-between rounded-lg px-3 py-2 transition"
                          style={{ background: "var(--surface-secondary)" }}
                          role="listitem"
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
                              className="flex-1 rounded px-2 py-0.5 text-xs outline-none"
                              style={{ border: "1px solid var(--accent)", background: "var(--surface)", color: "var(--text-primary)" }}
                            />
                          ) : (
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span
                                onClick={() => { setEditingItemId(item.id); setEditingItemName(item.name); }}
                                className="truncate cursor-pointer"
                                style={{ color: "var(--text-secondary)" }}
                              >
                                {item.name}
                              </span>
                              <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium"
                                style={{ background: "var(--accent-lighter)", color: "var(--accent)" }}>
                                {catLabels[item.category] || item.category}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>x{item.quantity}</span>
                            {/* Move button */}
                            <button
                              onClick={() => setMoveItem(item)}
                              className="opacity-0 group-hover:opacity-100 transition text-[10px] font-medium rounded px-1"
                              style={{ color: "var(--accent)" }}
                              title={t.moveItem}
                            >
                              {t.moveItem}
                            </button>
                            <button
                              onClick={() => deleteItem(item.id)}
                              className="opacity-0 group-hover:opacity-100 transition text-sm"
                              style={{ color: "var(--text-quaternary)" }}
                              aria-label={`${t.delete} ${item.name}`}
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
                <div className="rounded-xl px-4 py-3 shadow-sm" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
                  <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                    <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{t.clickRoomIn3D}</p>
                    <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{t.manageStorageItems}</p>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ── 캔버스 영역 ── */}
          <section className="flex-1 rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--surface)" }} role="main">
            {/* 캔버스 헤더 */}
            <div className="flex items-center justify-between gap-2 px-5 py-3" style={{ borderBottom: "1px solid var(--border-light)" }}>
              <div>
                <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{t.floorPlan}</h2>
                <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                  {viewMode === "2d" ? t.viewDesignDesc : t.viewExploreDesc}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="inline-flex overflow-hidden rounded-lg text-[11px] font-semibold" style={{ border: "1px solid var(--border)", background: "var(--surface-secondary)" }}>
                  <button
                    onClick={() => setViewMode("2d")}
                    className="px-3 py-1.5 transition flex items-center gap-1"
                    style={{
                      background: viewMode === "2d" ? "var(--text-primary)" : "transparent",
                      color: viewMode === "2d" ? "var(--surface)" : "var(--text-tertiary)",
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <line x1="3" y1="12" x2="21" y2="12" />
                      <line x1="12" y1="3" x2="12" y2="21" />
                    </svg>
                    {t.viewDesign}
                  </button>
                  <button
                    onClick={() => { setViewMode("3d"); setHas3DInitialized(true); }}
                    className="px-3 py-1.5 transition flex items-center gap-1"
                    style={{
                      background: viewMode === "3d" ? "var(--accent)" : "transparent",
                      color: viewMode === "3d" ? "white" : "var(--text-tertiary)",
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                    </svg>
                    {t.viewExplore}
                  </button>
                </div>
              </div>
            </div>

            <div className="relative h-[calc(100vh-220px)] min-h-[500px] w-full" style={{ background: "var(--canvas-bg)" }}>
              {/* 빈 상태 */}
              {!selectedHomeId && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <EmptyState type="home" action={addHome} actionLabel={t.emptyHomeAction} />
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
                        `repeating-linear-gradient(var(--canvas-grid) 0 1px, transparent 1px 28px), repeating-linear-gradient(90deg, var(--canvas-grid) 0 1px, transparent 1px 28px)`,
                      backgroundSize: "28px 28px",
                    }}
                  />
                  <div className="absolute right-3 top-3 z-20 flex flex-col items-end gap-2 text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                    <div className="inline-flex items-center gap-1 rounded-full px-2 py-1 shadow-sm" style={{ background: "var(--surface)", border: "1px solid var(--border-light)" }}>
                      <span className="text-[9px]" style={{ color: "var(--text-tertiary)" }}>{t.zoom}</span>
                      <button onClick={() => setZoom((z) => Math.max(0.5, parseFloat((z - 0.1).toFixed(2))))} className="flex h-5 w-5 items-center justify-center rounded-full" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>-</button>
                      <span className="w-8 text-center tabular-nums">{(zoom * 100).toFixed(0)}%</span>
                      <button onClick={() => setZoom((z) => Math.min(2, parseFloat((z + 0.1).toFixed(2))))} className="flex h-5 w-5 items-center justify-center rounded-full" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>+</button>
                    </div>
                    <div className="inline-flex items-center gap-1 rounded-full px-2 py-1 shadow-sm" style={{ background: "var(--surface)", border: "1px solid var(--border-light)" }}>
                      <span className="text-[9px]" style={{ color: "var(--text-tertiary)" }}>{t.pan}</span>
                      <button onClick={() => setPan((p) => ({ ...p, y: p.y + 40 }))} className="flex h-5 w-5 items-center justify-center rounded-full" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>↑</button>
                      <button onClick={() => setPan((p) => ({ ...p, x: p.x - 40 }))} className="flex h-5 w-5 items-center justify-center rounded-full" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>←</button>
                      <button onClick={() => setPan((p) => ({ ...p, x: p.x + 40 }))} className="flex h-5 w-5 items-center justify-center rounded-full" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>→</button>
                      <button onClick={() => setPan((p) => ({ ...p, y: p.y - 40 }))} className="flex h-5 w-5 items-center justify-center rounded-full" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>↓</button>
                      <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="ml-1 flex h-5 items-center justify-center rounded-full px-2" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>{t.reset}</button>
                    </div>
                  </div>
                  <div
                    className="relative h-full w-full"
                    onMouseMove={handleOpDragMove}
                    onMouseUp={handleOpDragEnd}
                    onMouseLeave={handleOpDragEnd}
                    style={{ cursor: opDrag || locDrag ? "grabbing" : undefined }}
                  >
                    <div
                      className="relative h-full w-full origin-center"
                      style={{
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                        transition: opDrag || locDrag ? "none" : "transform 150ms ease-out",
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
                                border: `${room.room_type === "hallway" ? 6 : 10}px solid ${isActiveRoom ? "var(--accent)" : room.room_type === "hallway" ? "#6b7280" : "#2c2c2c"}`,
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
                                const wallColor = isActiveRoom ? "var(--accent)" : "#2c2c2c";
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
                                  background: isActiveRoom ? "var(--accent)" : "#2c2c2c",
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

                              {/* 바닥 영역 — 수납공간 박스 표시 (드래그 가능) */}
                              <div style={{ position: "relative", height: "calc(100% - 22px)", overflow: "hidden" }}>
                                {getLocationsByRoomId(room.id).map((loc) => {
                                  const isLocSelected = selectedLocationId === loc.id;
                                  const isDraggingLoc = locDrag?.locId === loc.id;
                                  const itemCnt = allItems.filter((i) => i.location_id === loc.id).length;
                                  return (
                                    <div
                                      key={loc.id}
                                      onMouseDown={(e) => {
                                        e.stopPropagation();
                                        setActiveRoomId(room.id);
                                        setSelectedLocationId(loc.id);
                                        fetchItems(loc.id);
                                        setLocDrag({
                                          locId: loc.id,
                                          roomId: room.id,
                                          startX: loc.x,
                                          startY: loc.y,
                                          startClientX: e.clientX,
                                          startClientY: e.clientY,
                                        });
                                      }}
                                      style={{
                                        position: "absolute", left: loc.x, top: loc.y,
                                        width: loc.width, height: loc.height, zIndex: 30,
                                        background: isLocSelected ? "rgba(79,70,229,0.25)" : "rgba(255,255,255,0.55)",
                                        border: `1.5px ${isDraggingLoc ? "dashed" : "solid"} ${isLocSelected ? "var(--accent)" : "rgba(0,0,0,0.25)"}`,
                                        borderRadius: 2, boxSizing: "border-box",
                                        cursor: isDraggingLoc ? "grabbing" : "grab",
                                        display: "flex", flexDirection: "column", alignItems: "center",
                                        justifyContent: "center", gap: 1, userSelect: "none",
                                        transition: isDraggingLoc ? "none" : "border-color 120ms, background 120ms",
                                      }}
                                    >
                                      <span style={{ fontSize: "9px", fontWeight: 700, color: isLocSelected ? "var(--accent)" : "rgba(0,0,0,0.6)", lineHeight: 1.2, textAlign: "center", padding: "0 2px" }}>
                                        {loc.name}
                                      </span>
                                      {itemCnt > 0 && (
                                        <span style={{ fontSize: "8px", color: isLocSelected ? "#6d60f0" : "rgba(0,0,0,0.35)" }}>
                                          {t.count(itemCnt)}
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
