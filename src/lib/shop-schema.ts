export const BASIC_CATALOG_SCHEMA_MESSAGE =
  "기본 코스튬 관리 DB 스키마가 아직 반영되지 않았어요. Supabase SQL Editor에서 15_sync_basic_catalog_items.sql과 16_attendance_and_system_catalog.sql 내용을 순서대로 실행한 뒤 새로고침해 주세요.";

export function isMissingBasicCatalogSchema(error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : String(error ?? "");

  return message.includes("shop_items.is_basic")
    || message.includes("is_basic")
    || message.includes("shop_items.is_system")
    || message.includes("is_system");
}
