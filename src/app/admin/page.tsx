/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import type { Route } from "next";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Edit3,
  List,
  PackagePlus,
  ShieldCheck,
  Users
} from "lucide-react";
import {
  moveCatalogItem,
  saveCatalogItem,
  toggleCatalogItem
} from "@/app/admin/actions";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { CharacterSpecies } from "@/lib/character-assets";
import type { ShopItemVariant } from "@/lib/shop-catalog";
import {
  BASIC_CATALOG_SCHEMA_MESSAGE,
  isMissingBasicCatalogSchema
} from "@/lib/shop-schema";
import { AdminDeleteButton } from "@/components/admin-delete-button";

type AdminPageProps = {
  searchParams: Promise<{
    message?: string;
    view?: string;
    edit?: string;
    new?: string;
    status?: string;
    page?: string;
  }>;
};

type AdminShopItem = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  cost: number;
  unlock_method: "gem" | "attendance" | "focus";
  unlock_requirement: number;
  available_from: string | null;
  available_until: string | null;
  is_active: boolean;
  is_basic: boolean;
  is_system: boolean;
  slot: string;
  sort_order: number;
  shop_item_variants: ShopItemVariant | ShopItemVariant[] | null;
};

type CatalogStatus = "all" | "basic" | "sale" | "reward" | "upcoming" | "expired" | "hidden";

type AdminInventoryRow = {
  shop_item_id: string;
};

type AdminCharacterRow = {
  id: string;
  display_name: string;
  species: CharacterSpecies;
  level: number;
  xp_current: number;
  xp_total: number;
  is_active: boolean;
  character_inventory: AdminInventoryRow | AdminInventoryRow[] | null;
};

type AdminProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  is_admin: boolean;
  created_at: string;
  user_attendance: { attended_on: string } | Array<{ attended_on: string }> | null;
  characters: AdminCharacterRow | AdminCharacterRow[] | null;
};

const slots = [
  "human_body",
  "human_hair",
  "human_eyes",
  "human_mouth",
  "human_top",
  "human_outfit",
  "human_bottom",
  "human_shoes",
  "cat_pattern",
  "cat_eyes",
  "accessory",
  "room_item",
  "mount"
];

const PAGE_SIZE = 20;
const slotLabels = new Map([
  ["human_body", "인간 · 바디"],
  ["human_hair", "인간 · 헤어"],
  ["human_eyes", "인간 · 눈"],
  ["human_mouth", "인간 · 입"],
  ["human_top", "인간 · 상의"],
  ["human_outfit", "인간 · 한벌옷"],
  ["human_bottom", "인간 · 하의"],
  ["human_shoes", "인간 · 신발"],
  ["cat_pattern", "고양이 · 무늬"],
  ["cat_eyes", "고양이 · 눈"],
  ["accessory", "악세서리"],
  ["room_item", "방 아이템"],
  ["mount", "탈것"]
]);

function variantsOf(item: AdminShopItem) {
  if (!item.shop_item_variants) return [];
  return Array.isArray(item.shop_item_variants) ? item.shop_item_variants : [item.shop_item_variants];
}

function charactersOf(profile: AdminProfileRow) {
  if (!profile.characters) return [];
  return Array.isArray(profile.characters) ? profile.characters : [profile.characters];
}

function inventoryCount(character: AdminCharacterRow) {
  if (!character.character_inventory) return 0;
  return Array.isArray(character.character_inventory) ? character.character_inventory.length : 1;
}

function dateTimeValue(value: string | null) {
  return value ? new Date(value).toISOString().slice(0, 16) : "";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(new Date(value));
}

function unlockLabel(item: AdminShopItem) {
  if (item.is_basic) return "기본 제공";
  if (item.unlock_method === "gem") return `${item.cost.toLocaleString()} 젬`;
  if (item.unlock_method === "attendance") return `${item.unlock_requirement.toLocaleString()}일 출석`;
  return `${item.unlock_requirement.toLocaleString()}분 작업`;
}

function itemSlot(item: AdminShopItem) {
  const variants = variantsOf(item);
  return variants.find((variant) => variant.species === "human")?.slot
    ?? variants.find((variant) => variant.species === "cat")?.slot
    ?? item.slot;
}

function slotLabel(slot: string) {
  return slotLabels.get(slot) ?? slot;
}

function slotOrder(slot: string) {
  const index = slots.indexOf(slot);
  return index < 0 ? slots.length : index;
}

function catalogStatus(item: AdminShopItem, now: Date): Exclude<CatalogStatus, "all"> {
  if (!item.is_active) return "hidden";
  if (item.available_from && new Date(item.available_from) > now) return "upcoming";
  if (item.available_until && new Date(item.available_until) <= now) return "expired";
  if (item.is_basic) return "basic";
  if (item.unlock_method === "gem") return "sale";
  return "reward";
}

const catalogStatusLabels: Record<Exclude<CatalogStatus, "all">, string> = {
  basic: "기본 제공",
  sale: "판매 중",
  reward: "보상 아이템",
  upcoming: "공개 예정",
  expired: "기한 만료",
  hidden: "숨김"
};

function VariantFields({
  species,
  variant
}: {
  species: CharacterSpecies;
  variant?: ShopItemVariant;
}) {
  const label = species === "human" ? "인간" : "고양이";

  return (
    <fieldset className="admin-variant-fieldset">
      <label className="admin-check-row">
        <input name={`${species}Enabled`} type="checkbox" defaultChecked={Boolean(variant)} />
        {label} 착용 지원
      </label>
      <label>
        슬롯
        <select name={`${species}Slot`} defaultValue={variant?.slot ?? (species === "human" ? "human_top" : "accessory")}>
          {slots.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
        </select>
      </label>
      <label>
        착용 payload JSON
        <textarea name={`${species}Payload`} defaultValue={JSON.stringify(variant?.payload ?? {}, null, 2)} />
      </label>
      <label>
        레이어 이미지 URL
        <input name={`${species}LayerAssetUrl`} defaultValue={variant?.layer_asset_url ?? ""} placeholder="/assets/characters/..." />
      </label>
    </fieldset>
  );
}

function CatalogItemForm({ item }: { item?: AdminShopItem }) {
  const variants = item ? variantsOf(item) : [];
  const humanVariant = variants.find((variant) => variant.species === "human");
  const catVariant = variants.find((variant) => variant.species === "cat");

  return (
    <form className="panel admin-item-form" action={saveCatalogItem}>
      {item ? <input type="hidden" name="itemId" value={item.id} /> : null}
      <div className="admin-form-heading">
        <div>
          <p className="subtle">{item ? item.code : "새 카탈로그 상품"}</p>
          <h2>{item ? item.name : "상품 추가"}</h2>
        </div>
        <label className="admin-check-row">
          <input name="isActive" type="checkbox" defaultChecked={item?.is_active ?? true} />
          사용자 화면 노출 허용
        </label>
      </div>
      <div className="admin-form-grid">
        <label>
          상품 코드
          <input name="code" required defaultValue={item?.code ?? ""} disabled={item?.is_system} />
          {item?.is_system ? <input type="hidden" name="code" value={item.code} /> : null}
        </label>
        <label>상품 이름<input name="name" required defaultValue={item?.name ?? ""} /></label>
        <label>코스튬 썸네일 URL<input name="thumbnailUrl" defaultValue={item?.thumbnail_url ?? ""} placeholder="/assets/shop/..." /></label>
        <label>설명<input name="description" defaultValue={item?.description ?? ""} /></label>
        <label>
          획득 방식
          <select name="unlockMethod" defaultValue={item?.is_basic ? "basic" : item?.unlock_method ?? "gem"} disabled={item?.is_system}>
            <option value="basic">기본 제공</option>
            <option value="gem">젬 구매</option>
            <option value="attendance">출석 보상</option>
            <option value="focus">작업시간 보상</option>
          </select>
          {item?.is_system ? <input type="hidden" name="unlockMethod" value="basic" /> : null}
          {item?.is_system ? <span className="admin-field-help">코드 내장 기본 코스튬은 캐릭터 생성과 연결되어 있어 획득 방식을 바꿀 수 없습니다.</span> : null}
        </label>
        <label>젬 가격<input name="cost" type="number" min="0" defaultValue={item?.cost ?? 0} /></label>
        <label>
          획득 조건 수치
          <input name="unlockRequirement" type="number" min="0" defaultValue={item?.unlock_requirement ?? 0} />
          <span className="admin-field-help">출석 보상은 일수, 작업시간 보상은 누적 작업 분을 입력합니다.</span>
        </label>
        <label>판매 시작<input name="availableFrom" type="datetime-local" defaultValue={dateTimeValue(item?.available_from ?? null)} /></label>
        <label>판매 종료<input name="availableUntil" type="datetime-local" defaultValue={dateTimeValue(item?.available_until ?? null)} /></label>
      </div>
      <div className="admin-variant-grid">
        <VariantFields species="human" variant={humanVariant} />
        <VariantFields species="cat" variant={catVariant} />
      </div>
      <div className="form-actions">
        <Link className="ghost-button" href={"/admin" as Route}>취소</Link>
        <button className="primary-button" type="submit">{item ? "상품 수정" : "상품 추가"}</button>
      </div>
    </form>
  );
}

function CatalogList({ items, status, page }: { items: AdminShopItem[]; status: CatalogStatus; page: number }) {
  const now = new Date();
  const filteredItems = status === "all"
    ? items
    : items.filter((item) => catalogStatus(item, now) === status);
  const orderedItems = [...filteredItems].sort((a, b) => {
    const slotDifference = slotOrder(itemSlot(a)) - slotOrder(itemSlot(b));
    return slotDifference || a.sort_order - b.sort_order;
  });
  const visibleItems = orderedItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const groupedItems = Array.from(
    visibleItems.reduce((groups, item) => {
      const slot = itemSlot(item);
      const group = groups.get(slot) ?? [];
      group.push(item);
      groups.set(slot, group);
      return groups;
    }, new Map<string, AdminShopItem[]>())
  );

  return (
    <section className="admin-catalog-list">
      {groupedItems.map(([slot, group]) => (
        <section className="admin-catalog-group" key={slot}>
          <header className="admin-catalog-group-heading">
            <h2>{slotLabel(slot)}</h2>
            <span>{group.length}개</span>
          </header>
          {group.map((item, index) => {
            const variants = variantsOf(item);
            const itemStatus = catalogStatus(item, now);

            return <article className="panel admin-catalog-row" key={item.id}>
            <div className="admin-catalog-thumbnail">
              {item.thumbnail_url ? <img src={item.thumbnail_url} alt="" /> : <span>이미지 없음</span>}
            </div>
            <div className="admin-catalog-main">
              <div className="admin-catalog-title">
                <strong>{item.name}</strong>
                <span className={`admin-status ${itemStatus}`}>{catalogStatusLabels[itemStatus]}</span>
              </div>
              <code>{item.code}</code>
              <div className="admin-chip-list">
                <span>{unlockLabel(item)}</span>
                {variants.map((variant) => <span key={variant.species}>{variant.species === "human" ? "인간" : "고양이"} · {variant.slot}</span>)}
              </div>
            </div>
            <div className="admin-row-actions">
              <form action={moveCatalogItem}>
                <input type="hidden" name="itemId" value={item.id} />
                <input type="hidden" name="direction" value="up" />
                <button className="icon-button" type="submit" disabled={status !== "all" || page !== 1 || index === 0} aria-label="위로 이동"><ArrowUp size={16} /></button>
              </form>
              <form action={moveCatalogItem}>
                <input type="hidden" name="itemId" value={item.id} />
                <input type="hidden" name="direction" value="down" />
                <button className="icon-button" type="submit" disabled={status !== "all" || page !== 1 || index === group.length - 1} aria-label="아래로 이동"><ArrowDown size={16} /></button>
              </form>
              <Link className="icon-button" href={`/admin?edit=${item.id}` as Route} aria-label={`${item.name} 수정`}><Edit3 size={16} /></Link>
              <form action={toggleCatalogItem}>
                <input type="hidden" name="itemId" value={item.id} />
                <input type="hidden" name="isActive" value={String(item.is_active)} />
                <button className="ghost-button" type="submit">{item.is_active ? "숨기기" : "노출 허용"}</button>
              </form>
              {!item.is_system ? <AdminDeleteButton itemId={item.id} itemName={item.name} /> : null}
            </div>
          </article>
          })}
        </section>
      ))}
      {visibleItems.length === 0 ? <div className="empty-state">이 상태에 해당하는 아이템이 없어요.</div> : null}
    </section>
  );
}

function UserList({ profiles, page }: { profiles: AdminProfileRow[]; page: number }) {
  const visibleProfiles = profiles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  return (
    <section className="admin-user-list">
      {visibleProfiles.map((profile) => {
        const characters = charactersOf(profile);
        const totalXp = characters.reduce((sum, character) => sum + character.xp_total, 0);
        const gems = characters.reduce((sum, character) => sum + character.xp_current, 0);
        const ownedItems = characters.reduce((sum, character) => sum + inventoryCount(character), 0);
        const attendanceCount = Array.isArray(profile.user_attendance)
          ? profile.user_attendance.length
          : profile.user_attendance ? 1 : 0;

        return (
          <article className="panel admin-user-card" key={profile.id}>
            <div className="admin-user-heading">
              <div>
                <strong>{profile.display_name ?? "이름 없음"}</strong>
                <p className="subtle">{profile.email ?? "이메일 없음"}</p>
              </div>
              {profile.is_admin ? <span className="admin-status active">관리자</span> : null}
            </div>
            <div className="admin-user-stats">
              <span>가입 {formatDate(profile.created_at)}</span>
              <span>캐릭터 {characters.length}</span>
              <span>젬 {gems.toLocaleString()}</span>
              <span>누적 XP {totalXp.toLocaleString()}</span>
              <span>보유 아이템 {ownedItems}</span>
              <span>출석 {attendanceCount}일</span>
            </div>
            <div className="admin-character-list">
              {characters.map((character) => (
                <span key={character.id}>
                  {character.display_name} · {character.species === "human" ? "인간" : "고양이"} · Lv.{character.level}
                  {character.is_active ? " · 사용 중" : ""}
                </span>
              ))}
            </div>
          </article>
        );
      })}
      {visibleProfiles.length === 0 ? <div className="empty-state">사용자가 없어요.</div> : null}
    </section>
  );
}

function Pagination({
  page,
  total,
  params
}: {
  page: number;
  total: number;
  params: Record<string, string | undefined>;
}) {
  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);
  if (totalPages <= 1) return null;

  const hrefFor = (nextPage: number) => {
    const query = new URLSearchParams(
      Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1]))
    );
    if (nextPage > 1) query.set("page", String(nextPage));
    else query.delete("page");
    return `?${query.toString()}` as Route;
  };

  return (
    <nav className="admin-pagination" aria-label="페이지 이동">
      <Link className={page <= 1 ? "disabled" : ""} href={hrefFor(Math.max(page - 1, 1))}>이전</Link>
      <span>{page} / {totalPages}</span>
      <Link className={page >= totalPages ? "disabled" : ""} href={hrefFor(Math.min(page + 1, totalPages))}>다음</Link>
    </nav>
  );
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  await requireAdmin();
  const supabase = await createClient();
  const { message, view, edit, new: createNew, status: requestedStatus, page: requestedPage } = await searchParams;
  const activeView = view === "users" ? "users" : "catalog";
  const page = Math.max(Number.parseInt(requestedPage ?? "1", 10) || 1, 1);
  const status: CatalogStatus = ["basic", "sale", "reward", "upcoming", "expired", "hidden"].includes(requestedStatus ?? "")
    ? requestedStatus as CatalogStatus
    : "all";
  const itemResult = await supabase
    .from("shop_items")
    .select("id, code, name, description, thumbnail_url, cost, unlock_method, unlock_requirement, available_from, available_until, is_active, is_basic, is_system, slot, sort_order, shop_item_variants(species, slot, payload, layer_asset_url)")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<AdminShopItem[]>();
  const missingBasicCatalogSchema = isMissingBasicCatalogSchema(itemResult.error);
  const missingSystemColumn = itemResult.error?.message.includes("is_system") ?? false;
  const basicFallbackItemResult = missingSystemColumn
    ? await supabase
        .from("shop_items")
        .select("id, code, name, description, thumbnail_url, cost, unlock_method, unlock_requirement, available_from, available_until, is_active, is_basic, slot, sort_order, shop_item_variants(species, slot, payload, layer_asset_url)")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true })
    : null;
  const fallbackItemResult = missingBasicCatalogSchema && !missingSystemColumn
    ? await supabase
        .from("shop_items")
        .select("id, code, name, description, thumbnail_url, cost, unlock_method, unlock_requirement, available_from, available_until, is_active, slot, sort_order, shop_item_variants(species, slot, payload, layer_asset_url)")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true })
    : null;
  const items = missingSystemColumn
    ? (basicFallbackItemResult?.data ?? []).map((item) => ({ ...item, is_system: item.code.startsWith("basic_") })) as AdminShopItem[]
    : missingBasicCatalogSchema
    ? (fallbackItemResult?.data ?? []).map((item) => ({ ...item, is_basic: false, is_system: false })) as AdminShopItem[]
    : itemResult.data ?? [];
  const itemError = missingSystemColumn
    ? basicFallbackItemResult?.error
    : missingBasicCatalogSchema ? fallbackItemResult?.error : itemResult.error;
  const selectedItem = edit ? (items ?? []).find((item) => item.id === edit) : undefined;
  const profileResult = activeView === "users"
    ? await supabase
        .from("profiles")
        .select("id, email, display_name, is_admin, created_at, user_attendance(attended_on), characters(id, display_name, species, level, xp_current, xp_total, is_active, character_inventory(shop_item_id))")
        .order("created_at", { ascending: false })
        .returns<AdminProfileRow[]>()
    : { data: [], error: null };
  const missingAttendanceSchema = profileResult.error?.message.includes("user_attendance") ?? false;
  const fallbackProfileResult = missingAttendanceSchema
    ? await supabase
        .from("profiles")
        .select("id, email, display_name, is_admin, created_at, characters(id, display_name, species, level, xp_current, xp_total, is_active, character_inventory(shop_item_id))")
        .order("created_at", { ascending: false })
    : null;
  const profiles = missingAttendanceSchema
    ? (fallbackProfileResult?.data ?? []).map((profile) => ({ ...profile, user_attendance: null })) as AdminProfileRow[]
    : profileResult.data ?? [];
  const profileError = missingAttendanceSchema ? fallbackProfileResult?.error : profileResult.error;

  return (
    <main className="simple-shell admin-shell">
      <header className="simple-header">
        <Link className="ghost-button" href={"/" as Route}><ArrowLeft size={16} /> 홈</Link>
        <h1><ShieldCheck size={22} /> 관리자</h1>
      </header>
      <nav className="admin-view-tabs" aria-label="관리자 메뉴">
        <Link className={activeView === "catalog" ? "selected" : ""} href={"/admin" as Route}><List size={17} /> 상품 관리</Link>
        <Link className={activeView === "users" ? "selected" : ""} href={"/admin?view=users" as Route}><Users size={17} /> 사용자 데이터</Link>
      </nav>
      {message ? <p className="notice">{message}</p> : null}
      {missingBasicCatalogSchema ? <p className="notice">{BASIC_CATALOG_SCHEMA_MESSAGE}</p> : null}
      {missingAttendanceSchema ? <p className="notice">출석 기록 DB가 아직 반영되지 않았어요. SQL Editor에서 16_attendance_and_system_catalog.sql을 실행해 주세요.</p> : null}
      {itemError ? <p className="notice">{itemError.message}</p> : null}
      {profileError ? <p className="notice">{profileError.message}</p> : null}

      {activeView === "catalog" ? (
        <>
          <section className="panel admin-intro">
            <PackagePlus size={20} />
            <div>
              <strong>코스튬 카탈로그</strong>
              <p className="subtle">기본 제공, 판매, 보상, 예정, 만료 아이템을 모두 확인하고 관리합니다.</p>
            </div>
            <Link className="primary-button" href={"/admin?new=1" as Route}>새 상품 추가</Link>
          </section>
          {createNew === "1" ? <CatalogItemForm /> : null}
          {selectedItem ? <CatalogItemForm item={selectedItem} /> : null}
          <nav className="admin-catalog-filters" aria-label="아이템 상태 필터">
            {([
              ["all", "전체"],
              ["basic", "기본 제공"],
              ["sale", "판매 중"],
              ["reward", "보상"],
              ["upcoming", "공개 예정"],
              ["expired", "기한 만료"],
              ["hidden", "숨김"]
            ] as Array<[CatalogStatus, string]>).map(([value, label]) => (
              <Link
                className={status === value ? "selected" : ""}
                href={(value === "all" ? "/admin" : `/admin?status=${value}`) as Route}
                key={value}
              >
                {label}
              </Link>
            ))}
          </nav>
          <CatalogList items={items ?? []} status={status} page={page} />
          <Pagination page={page} total={(items ?? []).filter((item) => status === "all" || catalogStatus(item, new Date()) === status).length} params={{ status: status === "all" ? undefined : status }} />
        </>
      ) : (
        <>
          <UserList profiles={profiles ?? []} page={page} />
          <Pagination page={page} total={(profiles ?? []).length} params={{ view: "users" }} />
        </>
      )}
    </main>
  );
}
