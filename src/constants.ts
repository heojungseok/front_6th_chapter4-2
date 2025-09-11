/// <reference types="vite/client" />

export const DAY_LABELS = ["월", "화", "수", "목", "금", "토"] as const;

export const CellSize = {
  WIDTH: 80,
  HEIGHT: 30,
};

export const 초 = 1000;
export const 분 = 60 * 초;

// API Base URL for GitHub Pages
export const API_BASE_URL = import.meta.env.MODE === 'production' ? '/front_6th_chapter4-2' : '';
