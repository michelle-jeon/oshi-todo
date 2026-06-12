import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, PackagePlus, ShieldCheck } from "lucide-react";
import { saveCatalogItem, toggleCatalogItem } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { CharacterSpecies } from "@/lib/character-assets";
import type { ShopItemVariant } from "@/lib/shop-catalog";

type AdminPageProps = {
  searchParams: Promise<{ message?: string }>;
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
  shop_item_variants: ShopItemVariant | ShopItemVariant[] | null;
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

function dateTimeValue(value: string | null) {
  return value ? new Date(value).toISOString().slice(0, 16) : "";
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
        <h2>{item ? item.name : "새 상품"}</h2>
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
      <button className="primary-button" type="submit">{item ? "상품 수정" : "상품 추가"}</button>
    </form>
  );
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  await requireAdmin();
  const supabase = await createClient();
  const { message } = await searchParams;
  const { data: items, error } = await supabase
    .from("shop_items")
    .select("id, code, name, description, thumbnail_url, cost, unlock_method, unlock_requirement, available_from, available_until, is_active, shop_item_variants(species, slot, payload, layer_asset_url)")
    .order("created_at", { ascending: false })
    .returns<AdminShopItem[]>();

  return (
    <main className="simple-shell admin-shell">
      <header className="simple-header">
        <Link className="ghost-button" href={"/" as Route}><ArrowLeft size={16} /> 홈</Link>
        <h1><ShieldCheck size={22} /> 관리자</h1>
      </header>
      <section className="panel admin-intro">
        <PackagePlus size={20} />
        <div>
          <strong>코스튬 카탈로그</strong>
          <p className="subtle">상품 이미지는 공통 썸네일로, 아바타 착용 정보는 종족별 변형으로 관리합니다.</p>
        </div>
      </section>
      {message ? <p className="notice">{message}</p> : null}
      {error ? <p className="notice">{error.message}</p> : null}
      <CatalogItemForm />
      <section className="admin-item-list">
        {(items ?? []).map((item) => (
          <div key={item.id}>
            <CatalogItemForm item={item} />
            <form action={toggleCatalogItem}>
              <input type="hidden" name="itemId" value={item.id} />
              <input type="hidden" name="isActive" value={String(item.is_active)} />
              <button className="ghost-button" type="submit">{item.is_active ? "상점에서 내리기" : "상점에 올리기"}</button>
            </form>
          </div>
        ))}
      </section>
    </main>
  );
}
