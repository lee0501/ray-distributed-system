// ─── 共用設計 token（RideApp.jsx 與 RayAdminApp.jsx 共用）───
// 顏色值集中在這裡，改一處兩邊同步。狀態 pill 的文字（中／英）各元件自行定義。
export const TOKEN = {
  black: "#0a0a0a", white: "#ffffff",
  gray50: "#f8f8f6", gray100: "#f0efe9", gray200: "#dddcd6",
  gray300: "#B4B2A9", gray400: "#9c9a92", gray500: "#73726b",
  gray600: "#5c5b56", gray800: "#2a2a28",
  green: "#1db954", greenLight: "#e8f5ee",
  amber: "#f59e0b", amberLight: "#fffbeb",
  red: "#ef4444", redLight: "#fee2e2",
  blue: "#3b82f6", blueLight: "#dbeafe",
  purple: "#7c3aed", purpleLight: "#ede9fe",
  // pill / 進度條用色
  teal200: "#5DCAA5", amber200: "#EF9F27", red200: "#F09595",
  blue200: "#85B7EB", purple200: "#AFA9EC",
}
