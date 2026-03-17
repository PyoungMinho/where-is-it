"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Room } from "@/types/room";

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
        width: 140,
        height: 100,
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

  useEffect(() => {
    async function loadHomes() {
      await fetchHomes();
    }
    loadHomes();
  }, []);

  useEffect(() => {
    if (!selectedHomeId) return;

    async function loadRooms() {
      await fetchRooms(selectedHomeId);
    }
    loadRooms();
  }, [selectedHomeId]);

  return (
    <main
      style={{
        padding: "24px",
        color: "white",
        background: "black",
        minHeight: "100vh",
      }}
    >
      <h1
        style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "24px" }}
      >
        어디있니?
      </h1>

      <div style={{ display: "flex", gap: "24px" }}>
        <div style={{ width: "280px" }}>
          <h2 style={{ fontSize: "20px", marginBottom: "12px" }}>
            집 / 방 관리
          </h2>

          <button
            onClick={addHome}
            style={{
              padding: "10px 14px",
              border: "1px solid white",
              marginBottom: "16px",
              cursor: "pointer",
            }}
          >
            집 추가하기
          </button>

          <div style={{ marginBottom: "16px" }}>
            <div style={{ marginBottom: "8px" }}>집 선택</div>
            <select
              value={selectedHomeId ?? ""}
              onChange={(e) => setSelectedHomeId(e.target.value)}
              style={{ width: "100%", padding: "8px", color: "black" }}
            >
              <option value="">집을 선택하세요</option>
              {homes.map((home) => (
                <option key={home.id} value={home.id}>
                  {home.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: "8px" }}>방 이름</div>
          <input
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            placeholder="예: 거실, 주방, 안방"
            style={{
              width: "100%",
              padding: "10px",
              marginBottom: "12px",
              color: "black",
            }}
          />

          <button
            onClick={addRoom}
            style={{
              width: "100%",
              padding: "10px 14px",
              border: "1px solid white",
              cursor: "pointer",
            }}
          >
            방 추가하기
          </button>

          <div style={{ marginTop: "24px" }}>
            <h3 style={{ fontSize: "18px", marginBottom: "8px" }}>방 목록</h3>
            <ul style={{ paddingLeft: "18px" }}>
              {rooms.map((room) => (
                <li key={room.id}>
                  {room.name} ({room.x}, {room.y})
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <h2 style={{ fontSize: "20px", marginBottom: "12px" }}>집 구조</h2>

          <div
            style={{
              position: "relative",
              width: "800px",
              height: "500px",
              border: "2px solid white",
              background: "#111",
            }}
          >
            {rooms.map((room) => (
              <div
                key={room.id}
                style={{
                  position: "absolute",
                  left: room.x,
                  top: room.y,
                  width: room.width,
                  height: room.height,
                  background: room.color,
                  border: "2px solid white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                }}
              >
                {room.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
