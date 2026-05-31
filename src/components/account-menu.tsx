import { signOut } from "@/app/auth-actions";
import { DropdownMenu } from "@/components/dropdown-menu";
import Link from "next/link";
import type { Route } from "next";

type AccountMenuProps = {
  email?: string;
};

export function AccountMenu({ email }: AccountMenuProps) {
  return (
    <DropdownMenu
      ariaLabel="계정 메뉴"
      button="메뉴"
      className="account-menu"
      panelClassName="account-menu-panel"
    >
      <p className="subtle">계정</p>
      <strong>{email}</strong>
      <nav className="account-menu-links" aria-label="계정 메뉴">
        <Link href={"/profile" as Route}>계정 설정</Link>
        <Link href={"/friends" as Route}>친구</Link>
      </nav>
      <form action={signOut}>
        <button className="ghost-button" type="submit">
          로그아웃
        </button>
      </form>
    </DropdownMenu>
  );
}
