import Link from "next/link";
import SafeImage from "./safe-image";

export default function NotFound() {
  return <main className="not-found-page"><section className="not-found-card">
    <div className="lost-bear"><SafeImage src="/chubby-bear-transparent-v3.webp" alt="돌을 찾지 못해 슬픈 곰" eager /><span className="bear-tear">💧</span><span className="lost-pebble">?</span></div>
    <p className="eyebrow">404 · 길을 잃었어</p>
    <h1>곰이 여기서는 돌을 못 찾았어…</h1>
    <p>주소가 바뀌었거나 없는 페이지야. 우리 돌 친구들이 있는 곳으로 돌아가자.</p>
    <Link href="/">오늘의 돌 친구들에게 돌아가기</Link>
  </section></main>;
}
