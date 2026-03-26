const ko = {
  // App
  appTitle: "어디있니?",
  appDesc: "집 안 물건을 정리하고 쉽게 찾아보세요",
  metaTitle: "어디있니? — 집 안 물건 찾기",
  metaDesc: "집 안에 잘 두고도 잃어버리는 물건을 쉽게 찾기 위한 3D 홈 인벤토리 앱",

  // Header
  searchPlaceholder: "물건 검색...",

  // Home
  home: "집",
  selectHome: "집을 선택하세요",
  newHomeName: "새 집 이름",
  addHome: "+ 집",
  editHomeName: "집 이름 변경",
  homePlaceholder: "집 이름",
  save: "저장",
  cancel: "취소",
  defaultHomeName: "우리집",
  homeAdded: (name: string) => `'${name}' 집이 추가되었어요`,

  // Room
  room: "방",
  hallway: "복도",
  roomNamePlaceholder: "방 이름",
  hallwayNamePlaceholder: "복도 이름",
  add: "추가",
  delete: "삭제",
  roomAdded: (name: string) => `'${name}' 방이 추가되었어요`,
  needHomeFirst: "먼저 집을 만들어야 해요",
  enterRoomName: "방 이름을 입력해주세요",
  confirmDeleteRoom: (name: string) => `"${name}" 방과 그 안의 수납공간/물건을 모두 삭제할까요?`,
  count: (n: number) => `${n}개`,

  // Door/Window
  doorWindow: (name: string) => `${name} 문/창문`,
  addDoor: "+ 문",
  addWindow: "+ 창문",
  noDoorWindow: "아직 문이나 창문이 없어요.",
  wallN: "위 벽",
  wallS: "아래 벽",
  wallE: "오른쪽 벽",
  wallW: "왼쪽 벽",

  // Canvas
  floorPlan: "집 구조",
  canvasDesc2D: "방을 배치하고 크기를 조정하세요",
  canvasDesc3D: "가구를 클릭해서 물건을 관리하세요",
  zoom: "줌",
  pan: "이동",
  reset: "초기화",

  // View modes (renamed)
  viewDesign: "설계",
  viewExplore: "탐색",
  viewDesignDesc: "방을 추가하고 배치를 설정하세요",
  viewExploreDesc: "가구를 클릭해 물건을 관리하세요",

  // 3D mode
  clickRoomIn3D: "3D 화면에서 방을 클릭하세요",
  manageStorageItems: "수납공간과 물건을 관리할 수 있어요",

  // Location/Storage
  storage: "수납공간",
  storageOf: (name: string) => `수납공간 — ${name}`,
  storagePlaceholder: "예: 신발장, 서랍, 선반",
  locationAdded: (name: string) => `'${name}' 수납공간이 추가되었어요`,
  needRoomFirst: "먼저 방을 만들어야 해요",
  selectRoomFirst: "수납공간을 배치할 방을 먼저 선택해주세요",
  enterLocationName: "수납공간 이름을 입력해주세요",
  roomNotFound: "선택한 방을 찾을 수 없어요",
  confirmDeleteLocation: "이 수납공간과 그 안의 물건들을 모두 삭제할까요?",
  locationDeleted: "수납공간이 삭제되었어요",
  back: "← 뒤로",
  itemCount: (n: number) => `${n}개 물건`,

  // Item
  selectLocationFirst: "먼저 수납공간을 선택해주세요",
  itemRegistered: (name: string) => `'${name}' 등록 완료!`,
  itemDeleted: "물건이 삭제되었어요",
  itemName: "물건 이름 (예: 건전지, 여권, 리모컨)",
  addMemo: "+ 메모 추가",
  memoPlaceholder: "메모 (선택사항)",
  submitting: "등록 중...",
  addItem: "물건 추가하기",

  // Categories
  catAll: "전체",
  catElectronics: "전자기기",
  catDocuments: "서류/문서",
  catDocumentsShort: "서류",
  catDaily: "생활용품",
  catClothes: "의류",
  catKitchen: "주방용품",
  catKitchenShort: "주방",
  catTools: "공구",
  catEtc: "기타",

  // Search
  searchTitle: "어디에 뒀더라? 물건 이름을 검색하세요",
  recentSearch: "최근 검색",
  noResults: (q: string) => `"${q}"에 대한 결과가 없어요`,
  tryOtherName: "다른 이름으로 검색해보세요",
  resultCount: (n: number) => `${n}개 결과`,
  searchByName: "물건 이름으로 검색",
  select: "선택",
  close: "닫기",

  // Empty states
  emptyHomeTitle: "첫 번째 집을 추가해보세요!",
  emptyHomeDesc: "집을 만들면 방과 수납공간을 배치할 수 있어요.",
  emptyHomeAction: "첫 번째 집 만들기",
  emptyRoomTitle: "방을 추가해보세요",
  emptyRoomDesc: "방을 만들고 2D 캔버스에서 배치하세요.",
  emptyLocationTitle: "수납공간을 추가하세요",
  emptyLocationDesc: "가구나 서랍을 배치하고 물건을 정리해보세요.",
  emptyItemTitle: "물건을 등록해보세요",
  emptyItemDesc: "이곳에 보관된 물건을 추가하면 나중에 쉽게 찾을 수 있어요.",

  // Empty state tips
  emptyHomeTip: "💡 TIP: '우리집', '회사' 등 장소별로 관리할 수 있어요",
  emptyRoomTip: "💡 TIP: 거실, 주방, 침실 등 실제 방 이름을 사용하세요",
  emptyLocationTip: "💡 TIP: 옷장, 서랍, 선반 등 가구 이름을 사용하세요",
  emptyItemTip: "💡 TIP: 물건을 등록하면 검색으로 바로 찾을 수 있어요",

  // Onboarding
  onboardingDesc: "집 안의 물건을 쉽게 정리하고 찾아보세요",
  step1Title: "집 만들기",
  step1Desc: "먼저 관리할 집을 추가해주세요. 여러 집을 등록할 수 있어요.",
  step2Title: "방 배치 (설계)",
  step2Desc: "설계 모드에서 방을 추가하고 캔버스에서 크기와 위치를 조정하세요.",
  step3Title: "가구 배치 (탐색)",
  step3Desc: "탐색 모드에서 수납공간(가구)을 방 안에 배치하세요.",
  step4Title: "물건 등록",
  step4Desc: "수납공간을 클릭하고 물건을 등록하면 끝! 검색으로 바로 찾으세요.",
  start: "시작하기",
  dontShowAgain: "다시 보지 않기",

  // UX hints
  dragToMove: "드래그하여 이동",
  dragToResize: "모서리를 드래그하여 크기 조정",
  clickToSelect: "클릭하여 선택",

  // Language
  language: "언어",

  // Dark mode
  darkMode: "다크 모드",
  lightMode: "라이트 모드",
  systemMode: "시스템 설정",

  // Dashboard
  dashboard: "대시보드",
  totalItems: "전체 물건",
  totalRooms: "전체 방",
  totalStorage: "전체 수납공간",
  recentItems: "최근 등록",
  categoryBreakdown: "카테고리별",
  mostItems: "물건이 가장 많은 곳",
  noData: "아직 데이터가 없어요",
  showDashboard: "대시보드 보기",
  hideDashboard: "대시보드 숨기기",

  // Tags
  tags: "태그",
  addTag: "태그 추가",
  tagPlaceholder: "태그 입력 후 Enter",
  tagAdded: (tag: string) => `'${tag}' 태그가 추가되었어요`,

  // Sort & Filter
  sortBy: "정렬",
  sortName: "이름순",
  sortDate: "등록일순",
  sortQuantity: "수량순",
  sortCategory: "카테고리순",
  filterByTag: "태그로 필터",
  clearFilter: "필터 초기화",

  // Move item
  moveItem: "이동",
  moveItemTo: "물건 이동",
  moveItemDesc: "이동할 수납공간을 선택하세요",
  selectRoom: "방 선택",
  selectStorage: "수납공간 선택",
  itemMoved: (name: string, dest: string) => `'${name}'이(가) '${dest}'(으)로 이동되었어요`,
  moveCancel: "취소",
  moveConfirm: "이동하기",

  // Batch add
  batchAdd: "일괄 등록",
  batchAddDesc: "물건 이름을 줄바꿈으로 구분해서 입력하세요",
  batchAddPlaceholder: "건전지\n여권\n리모컨\n...",
  batchAddCount: (n: number) => `${n}개 물건을 등록합니다`,
  batchAddComplete: (n: number) => `${n}개 물건이 등록되었어요!`,
  batchAddButton: "일괄 등록하기",

  // Template
  template: "템플릿으로 시작",
  templateDesc: "미리 만들어진 방 구성으로 빠르게 시작하세요",
  templateStudio: "원룸",
  templateStudioDesc: "원룸 기본 구성 (주방, 욕실, 거실겸 침실)",
  templateApt: "아파트",
  templateAptDesc: "아파트 기본 구성 (거실, 주방, 침실, 욕실, 현관)",
  templateHouse: "단독주택",
  templateHouseDesc: "넓은 집 구성 (거실, 주방, 침실2, 욕실2, 서재, 현관, 다용도실)",
  templateOffice: "사무실",
  templateOfficeDesc: "사무실 구성 (메인 사무실, 회의실, 탕비실, 창고)",
  templateApply: "적용하기",

  // Undo/Redo
  undo: "실행취소",
  redo: "다시실행",
  undoAction: (action: string) => `'${action}' 실행 취소됨`,
  redoAction: (action: string) => `'${action}' 다시 실행됨`,

  // Accessibility
  skipToContent: "메인 콘텐츠로 건너뛰기",
  openMenu: "메뉴 열기",
  closeMenu: "메뉴 닫기",
  expandSection: "섹션 펼치기",
  collapseSection: "섹션 접기",
};

export default ko;
export type Translations = {
  [K in keyof typeof ko]: (typeof ko)[K] extends (...args: infer A) => infer R
    ? (...args: A) => R
    : string;
};
