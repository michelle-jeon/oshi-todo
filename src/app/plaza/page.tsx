import { ArrowLeft, DoorOpen } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { createPlazaRoom } from "@/app/plaza-actions";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type PlazaRoomRow = {
  id: string;
  name: string;
  visibility: "private" | "public";
  owner_id: string;
};

export default async function PlazaPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; message?: string }>;
}) {
  await requireUser();
  const supabase = await createClient();
  const { q, message } = await searchParams;
  const keyword = String(q ?? "").trim();
  let roomQuery = supabase
    .from("plaza_rooms")
    .select("id, name, visibility, owner_id")
    .order("created_at", { ascending: false })
    .limit(12);

  if (keyword.length >= 2) {
    roomQuery = roomQuery.ilike("name", `%${keyword}%`);
  }

  const { data: rooms } = await roomQuery.returns<PlazaRoomRow[]>();

  return (
    <main className="simple-shell">
      <header className="simple-header">
        <Link className="ghost-button" href={"/" as Route}>
          <ArrowLeft size={16} /> 홈
        </Link>
        <h1>광장</h1>
      </header>
      {message ? <p className="notice">{message}</p> : null}

      <div className="simple-grid">
        <section className="panel">
          <h2>광장 만들기</h2>
          <form className="stack-form" action={createPlazaRoom}>
            <label>
              광장 이름
              <input name="name" minLength={2} maxLength={40} required placeholder="예: 새벽 작업방" />
            </label>
            <label>
              공개 범위
              <select name="visibility" defaultValue="private">
                <option value="private">비밀방</option>
                <option value="public">공개방</option>
              </select>
            </label>
            <button className="primary-button" type="submit">
              <DoorOpen size={16} /> 입장
            </button>
          </form>
        </section>

        <section className="panel">
          <h2>광장 찾기</h2>
          <form className="form-row" action="/plaza">
            <input name="q" defaultValue={keyword} placeholder="광장 이름 검색" aria-label="광장 검색" />
            <button className="icon-button" type="submit" aria-label="검색">
              <DoorOpen size={17} />
            </button>
          </form>
          <div className="room-list">
            {(rooms ?? []).map((room) => (
              <Link className="room-row" href={`/plaza/${room.id}` as Route} key={room.id}>
                <strong>{room.name}</strong>
                <span>{room.visibility === "public" ? "공개" : "비밀"}</span>
              </Link>
            ))}
            {(rooms ?? []).length === 0 ? (
              <div className="empty-state">들어갈 수 있는 광장이 아직 없어요.</div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
