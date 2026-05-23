import { Ellipsis } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { DropdownMenu } from "@/components/dropdown-menu";

export function CharacterMenu() {
  return (
    <DropdownMenu
      ariaLabel="캐릭터 메뉴"
      button={<Ellipsis size={20} />}
      className="character-menu"
      panelClassName="character-menu-panel"
    >
      <Link className="ghost-button" href={"/characters/wardrobe" as Route}>
        캐릭터 옷장
      </Link>
      <button className="ghost-button" type="button" disabled>
        캐릭터 선택
      </button>
    </DropdownMenu>
  );
}
