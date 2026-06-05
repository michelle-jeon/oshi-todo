import { redirect } from "next/navigation";
import type { Route } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { signOut } from "@/app/auth-actions";
import { CharacterCreateWizard } from "@/components/character-create-wizard";
import {
  isLegacyStarterCharacter,
  MAX_CHARACTER_SLOTS
} from "@/lib/character-onboarding";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type NewCharacterPageProps = {
  searchParams: Promise<{
    from?: string;
    message?: string;
  }>;
};

export default async function NewCharacterPage({ searchParams }: NewCharacterPageProps) {
  const user = await requireUser();
  const supabase = await createClient();
  const { from, message } = await searchParams;
  const { count } = await supabase
    .from("characters")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  const { data: activeCharacter } = await supabase
    .from("characters")
    .select("display_name, customization")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle<{ display_name: string; customization: Record<string, string> }>();

  if ((count ?? 0) >= MAX_CHARACTER_SLOTS && !isLegacyStarterCharacter(activeCharacter)) {
    redirect("/characters?message=캐릭터 슬롯이 모두 찼어요." as Route);
  }

  const isFirstCharacter = (count ?? 0) === 0 || isLegacyStarterCharacter(activeCharacter);
  const isFromCharacterSelect = from === "characters" && !isFirstCharacter;

  return (
    <main className="auth-shell">
      <section className="auth-panel character-create-panel">
        <div className="auth-heading-row">
          <div>
            <p className="subtle">OshiTodo</p>
            <h1 className="brand">{isFirstCharacter ? "첫 캐릭터 생성" : "새 캐릭터 생성"}</h1>
            <p className="subtle">종족을 고르고, 코스튬을 입혀본 다음 이름을 정해 주세요.</p>
          </div>
          {isFromCharacterSelect ? (
            <Link className="ghost-button compact-button" href={"/characters" as Route}>
              <ArrowLeft size={16} /> 뒤로가기
            </Link>
          ) : (
            <form action={signOut}>
              <button className="subtle-link-button" type="submit">
                다른 계정으로 로그인
              </button>
            </form>
          )}
        </div>

        {message ? <p className="notice">{message}</p> : null}

        <CharacterCreateWizard source={isFromCharacterSelect ? "characters" : "onboarding"} />
      </section>
    </main>
  );
}
