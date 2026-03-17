"use client";

import { useEffect, useMemo, useState } from "react";
import { Rnd } from "react-rnd";
import { supabase } from "@/lib/supabase";
import type { Room } from "@/types/room";
import type { Location } from "@/types/location";
import type { Item } from "@/types/item";

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

  const addHome = async () => {
    const { error } = await supabase.from("homes").insert([{ name: "우리집" }]);

    if (error) {
      console.error("home insert error:", error);
      return;
    }

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

  const updateLocationLayout = async (
    locationId: string,
    updates: { x: number; y: number; width: number; height: number },
  ) => {
    const { error } = await supabase
      .from("locations")
      .update(updates)
      .eq("id", locationId);

    if (error) {
      console.error("location update error:", error);
      return;
    }

    await fetchLocations(rooms.map((room) => room.id));
  };

  const getLocationsByRoomId = (roomId: string) => {
    return locations.filter((location) => location.room_id === roomId);
  };

  const getItemsCountByLocationId = (locationId: string) => {
    return allItems.filter((item) => item.location_id === locationId).length;
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
    if (!selectedLocationId) {
      setItems([]);
      return;
    }

    async function loadItems() {
      await fetchItems(selectedLocationId);
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
          <section className="flex w-full flex-col gap-6 md:w-80">
            {/* 집 / 방 / 수납공간 생성 */}
            <div className="rounded-xl border border-[#E5E7EB] bg-white px-5 py-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">
                구조 설정
              </h2>
              <p className="mt-2 text-xs text-slate-500">
                집, 방, 수납공간을 먼저 만들어 두고 오른쪽에서 배치하세요.
              </p>

              <div className="mt-5 space-y-4">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-600">
                    집
                  </label>
                  <div className="flex items-center gap-3">
                    <select
                      value={selectedHomeId ?? ""}
                      onChange={(e) => setSelectedHomeId(e.target.value)}
                      className="block w-full flex-1 appearance-none rounded-lg border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
                    >
                      <option value="">집을 선택하세요</option>
                      {homes.map((home) => (
                        <option key={home.id} value={home.id}>
                          {home.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={addHome}
                      className="inline-flex items-center justify-center rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:border-slate-300"
                    >
                      + 집
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-600">
                    방 이름
                  </label>
                  <input
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="예: 거실, 주방, 안방"
                    className="w-full rounded-lg border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
                  />
                  <button
                    onClick={addRoom}
                    className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-[#4F46E5] px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#4338CA] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!selectedHomeId}
                  >
                    방 추가하기
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-600">
                    수납공간 이름 (Location)
                  </label>
                  <input
                    value={newLocationName}
                    onChange={(e) => setNewLocationName(e.target.value)}
                    placeholder="예: 신발장, 서랍, 상부장"
                    className="w-full rounded-lg border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
                  />
                  <button
                    onClick={addLocation}
                    className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={rooms.length === 0}
                  >
                    수납공간 추가하기
                  </button>
                  <p className="mt-1.5 text-[11px] text-slate-400">
                    현재는 첫 번째 방에 수납공간이 추가돼요.
                  </p>
                </div>
              </div>
            </div>

            {/* 선택된 수납공간의 물건 */}
            <div className="flex-1 rounded-xl border border-[#E5E7EB] bg-white px-5 py-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  선택된 수납공간
                </h3>
                <span className="text-[11px] text-slate-400">
                  {selectedLocationId ? "물건 관리" : "수납공간을 클릭하세요"}
                </span>
              </div>

              <div className="mt-2">
                {selectedLocationId ? (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-[#E5E7EB] bg-slate-50 px-4 py-3 text-xs text-slate-700">
                    <div className="flex flex-1 flex-col">
                      <span className="font-medium">
                        {
                          locations.find((loc) => loc.id === selectedLocationId)
                            ?.name
                        }
                      </span>
                      <span className="mt-0.5 text-[11px] text-slate-500">
                        이 수납공간 안에 {items.length}개의 물건이 있어요.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={deleteSelectedLocation}
                      className="inline-flex items-center rounded-md border border-[#E5E7EB] bg-white px-3 py-1.5 text-[11px] font-semibold text-red-600 shadow-sm transition hover:border-red-200 hover:bg-red-50"
                    >
                      삭제
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400">
                    오른쪽 구조에서 수납공간 카드를 클릭하면 여기서 내용을
                    관리할 수 있어요.
                  </p>
                )}
              </div>

              <div className="mt-3 space-y-3">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-600">
                    물건 이름 (Item)
                  </label>
                  <input
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="예: 건전지, 스페어키, 여권"
                    className="w-full rounded-lg border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
                  />
                  <button
                    onClick={addItem}
                    className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-[#4F46E5] px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#4338CA] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!selectedLocationId}
                  >
                    물건 추가하기
                  </button>
                </div>

                <div className="mt-2 border-t border-[#E5E7EB] pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-700">
                      이 수납공간 안의 물건
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {items.length}개
                    </span>
                  </div>
                  {items.length === 0 ? (
                    <p className="mt-2 text-xs text-slate-400">
                      아직 등록된 물건이 없어요. 위에 물건 이름을 입력하고
                      추가해보세요.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-1.5 text-xs text-slate-700">
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
                </div>
              </div>
            </div>
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
              {selectedHomeId && (
                <div className="hidden items-center gap-1 rounded-full border border-[#E5E7EB] bg-slate-50 px-4 py-1.5 text-[11px] text-slate-600 sm:inline-flex">
                  <span className="h-2 w-2 rounded-full bg-[#4F46E5]" />
                  현재 집:{" "}
                  {homes.find((h) => h.id === selectedHomeId)?.name ??
                    "선택된 집"}
                </div>
              )}
            </div>

            <div className="relative h-[520px] w-full overflow-hidden rounded-xl border border-dashed border-[#E5E7EB] bg-slate-50">
              {!selectedHomeId ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                  <p className="text-sm font-medium text-slate-200">
                    먼저 집을 추가하고 선택해주세요.
                  </p>
                  <p className="max-w-xs text-xs text-slate-500">
                    왼쪽에서{" "}
                    <span className="font-medium text-slate-300">
                      집을 추가
                    </span>{" "}
                    한 뒤, 선택하면 방과 수납공간을 배치할 수 있어요.
                  </p>
                </div>
              ) : rooms.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                  <p className="text-sm font-medium text-slate-200">
                    선택한 집에 아직 방이 없어요.
                  </p>
                  <p className="max-w-xs text-xs text-slate-500">
                    방 이름을 입력하고{" "}
                    <span className="font-medium text-slate-700">
                      방 추가하기
                    </span>{" "}
                    버튼을 눌러 방을 만든 뒤, 해당 방 안에 수납공간을 배치할 수 있어요.
                  </p>
                </div>
              ) : (
                <>
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,#E5E7EB_1px,transparent_0)] opacity-60 [background-size:28px_28px]" />
                  <div className="relative h-full w-full">
                    {rooms.map((room) => (
                      <Rnd
                        key={room.id}
                        size={{ width: room.width, height: room.height }}
                        position={{ x: room.x, y: room.y }}
                        bounds="parent"
                        dragHandleClassName="room-drag-handle"
                        onDragStop={async (_e, d) => {
                          await updateRoomLayout(room.id, {
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
                        className="group"
                        style={{
                          borderRadius: 12,
                          boxSizing: "border-box",
                          padding: 10,
                        }}
                      >
                        <div
                          className={[
                            "flex h-full w-full flex-col rounded-xl border px-4 py-3 text-slate-900 shadow-sm transition group-hover:-translate-y-0.5 group-hover:shadow-md",
                            activeRoomId === room.id
                              ? "border-[#4F46E5]"
                              : "border-[#E5E7EB]",
                          ].join(" ")}
                          onMouseDown={() => {
                            setActiveRoomId(room.id);
                          }}
                        >
                          <div className="room-drag-handle mb-2 flex cursor-move items-center justify-between gap-2">
                            <span className="truncate text-xs font-semibold text-slate-900">
                              {room.name}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                                방
                              </span>
                              <button
                                type="button"
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteRoomWithContents(room.id);
                                }}
                                className="rounded-md border border-transparent px-1.5 py-0.5 text-[10px] text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                              >
                                삭제
                              </button>
                            </div>
                          </div>
                          <div className="relative flex-1 overflow-hidden rounded-lg bg-slate-50">
                            {getLocationsByRoomId(room.id).map((location) => (
                              <Rnd
                                key={location.id}
                                size={{
                                  width: location.width,
                                  height: location.height,
                                }}
                                position={{ x: location.x, y: location.y }}
                                bounds="parent"
                                onClick={() =>
                                  setSelectedLocationId(location.id)
                                }
                                onDragStop={async (_e, d) => {
                                  await updateLocationLayout(location.id, {
                                    x: d.x,
                                    y: d.y,
                                    width: location.width,
                                    height: location.height,
                                  });
                                }}
                                onResizeStop={async (
                                  _e,
                                  _direction,
                                  ref,
                                  _delta,
                                  position,
                                ) => {
                                  await updateLocationLayout(location.id, {
                                    x: position.x,
                                    y: position.y,
                                    width: parseInt(ref.style.width, 10),
                                    height: parseInt(ref.style.height, 10),
                                  });
                                }}
                                className="group/location"
                                style={{
                                  borderRadius: 10,
                                  boxSizing: "border-box",
                                }}
                              >
                                <div
                                  className={[
                                    "flex h-full w-full flex-col items-stretch justify-center rounded-lg border px-3 text-[11px] font-medium text-slate-900 shadow-sm transition",
                                    selectedLocationId === location.id
                                      ? "border-[#4F46E5] bg-white shadow-md"
                                      : "border-[#E5E7EB] bg-white",
                                  ].join(" ")}
                                >
                                  <span className="truncate text-center text-slate-900">
                                    {location.name}
                                  </span>
                                </div>
                              </Rnd>
                            ))}
                          </div>
                        </div>
                      </Rnd>
                    ))}
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
