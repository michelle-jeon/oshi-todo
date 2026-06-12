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
import { AdminDeleteButton } from "@/components/admin-delete-button";

type AdminPageProps = {
  searchParams: Promise<{ message?: string; view?: string; edit?: string; new?: string }>;
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
  sort_order: number;
  shop_item_variants: ShopItemVariant | ShopItemVariant[] | null;
};

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
  characters: AdminCharacterRow | AdminCharacterRow[] | null;
};

const slots = [
  "human_body",
  "human_shoes",
  "human_bottom",
  "human_top",
  "human_hair",
  "human_mouth",
  "human_eyes",
  "human_outfit",
  "cat_pattern",
  "cat_eyes",
  "accessory",
  "room_item",
  "mount"
];

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
  if (item.unlock_method === "gem") return `${item.cost.toLocaleString()} 젬`;
  if (item.unlock_method === "attendance") return `${item.unlock_requirement.toLocaleString()}일 출석`;
  return `${item.unlock_requirement.toLocaleString()}분 작업`;
}

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
          상점 노출
        </label>
      </div>
      <div className="admin-form-grid">
        <label>상품 코드<input name="code" required defaultValue={item?.code ?? ""} /></label>
        <label>상품 이름<input name="name" required defaultValue={item?.name ?? ""} /></label>
        <label>코스튬 썸네일 URL<input name="thumbnailUrl" defaultValue={item?.thumbnail_url ?? ""} placeholder="/assets/shop/..." /></label>
        <label>설명<input name="description" defaultValue={item?.description ?? ""} /></label>
        <label>
          획득 방식
          <select name="unlockMethod" defaultValue={item?.unlock_method ?? "gem"}>
            <option value="gem">젬 구매</option>
            <option value="attendance">출석 보상</option>
            <option value="focus">작업시간 보상</option>
          </select>
        </label>
        <label>젬 가격<input name="cost" type="number" min="0" defaultValue={item?.cost ?? 0} /></label>
        <label>획득 조건 수치<input name="unlockRequirement" type="number" min="0" defaultValue={item?.unlock_requirement ?? 0} /></label>
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

function CatalogList({ items }: { items: AdminShopItem[] }) {
  return (
    <section className="admin-catalog-list">
      {items.map((item, index) => {
        const variants = variantsOf(item);

        return (
          <article className="panel admin-catalog-row" key={item.id}>
            <div className="admin-catalog-thumbnail">
              {item.thumbnail_url ? <img src={item.thumbnail_url} alt="" /> : <span>이미지 없음</span>}
            </div>
            <div className="admin-catalog-main">
              <div className="admin-catalog-title">
                <strong>{item.name}</strong>
                <span className={item.is_active ? "admin-status active" : "admin-status"}>{item.is_active ? "노출 중" : "숨김"}</span>
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
                <button className="icon-button" type="submit" disabled={index === 0} aria-label="위로 이동"><ArrowUp size={16} /></button>
              </form>
              <form action={moveCatalogItem}>
                <input type="hidden" name="itemId" value={item.id} />
                <input type="hidden" name="direction" value="down" />
                <button className="icon-button" type="submit" disabled={index === items.length - 1} aria-label="아래로 이동"><ArrowDown size={16} /></button>
              </form>
              <Link className="icon-button" href={`/admin?edit=${item.id}` as Route} aria-label={`${item.name} 수정`}><Edit3 size={16} /></Link>
              <form action={toggleCatalogItem}>
                <input type="hidden" name="itemId" value={item.id} />
                <input type="hidden" name="isActive" value={String(item.is_active)} />
                <button className="ghost-button" type="submit">{item.is_active ? "내리기" : "올리기"}</button>
              </form>
              <AdminDeleteButton itemId={item.id} itemName={item.name} />
            </div>
          </article>
        );
      })}
      {items.length === 0 ? <div className="empty-state">등록된 상품이 없어요.</div> : null}
    </section>
  );
}

function UserList({ profiles }: { profiles: AdminProfileRow[] }) {
  return (
    <section className="admin-user-list">
      {profiles.map((profile) => {
        const characters = charactersOf(profile);
        const totalXp = characters.reduce((sum, character) => sum + character.xp_total, 0);
        const gems = characters.reduce((sum, character) => sum + character.xp_current, 0);
        const ownedItems = characters.reduce((sum, character) => sum + inventoryCount(character), 0);

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
      {profiles.length === 0 ? <div className="empty-state">사용자가 없어요.</div> : null}
    </section>
  );
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  await requireAdmin();
  const supabase = await createClient();
  const { message, view, edit, new: createNew } = await searchParams;
  const activeView = view === "users" ? "users" : "catalog";
  const { data: items, error: itemError } = await supabase
    .from("shop_items")
    .select("id, code, name, description, thumbnail_url, cost, unlock_method, unlock_requirement, available_from, available_until, is_active, sort_order, shop_item_variants(species, slot, payload, layer_asset_url)")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<AdminShopItem[]>();
  const selectedItem = edit ? (items ?? []).find((item) => item.id === edit) : undefined;
  const { data: profiles, error: profileError } =
    activeView === "users"
      ? await supabase
          .from("profiles")
          .select("id, email, display_name, is_admin, created_at, characters(id, display_name, species, level, xp_current, xp_total, is_active, character_inventory(shop_item_id))")
          .order("created_at", { ascending: false })
          .returns<AdminProfileRow[]>()
      : { data: [], error: null };

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
      {itemError ? <p className="notice">{itemError.message}</p> : null}
      {profileError ? <p className="notice">{profileError.message}</p> : null}

      {activeView === "catalog" ? (
        <>
          <section className="panel admin-intro">
            <PackagePlus size={20} />
            <div>
              <strong>코스튬 카탈로그</strong>
              <p className="subtle">전체 상품을 확인하고 수정, 노출 변경, 정렬, 삭제할 수 있습니다.</p>
            </div>
            <Link className="primary-button" href={"/admin?new=1" as Route}>새 상품 추가</Link>
          </section>
          {createNew === "1" ? <CatalogItemForm /> : null}
          {selectedItem ? <CatalogItemForm item={selectedItem} /> : null}
          <CatalogList items={items ?? []} />
        </>
      ) : (
        <UserList profiles={profiles ?? []} />
      )}
    </main>
  );
}
