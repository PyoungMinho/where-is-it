export type Opening = {
  id: string;
  type: "door" | "window";
  wall: "n" | "s" | "e" | "w";
  position: number; // 0~1, 해당 벽 안쪽 길이 기준 시작 위치 비율
  width: number;    // 픽셀 단위 (문 ~40, 창문 ~30)
};

export type Room = {
  id: string;
  home_id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  created_at: string;
  openings: Opening[];
};
