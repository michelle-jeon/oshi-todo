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
      ariaLabel="내정보 메뉴"
      button="내정보"
      className="account-menu"
      panelClassName="account-menu-panel"
    >
      <p className="subtle">로그인 계정</p>
      <strong>{email}</strong>
      <nav className="account-menu-links" aria-label="계정 메뉴">
        <Link href={"/friends" as Route}>친구</Link>
        <Link href={"/plaza" as Route}>광장</Link>
        <Link href={"/room" as Route}>내 방</Link>
      </nav>
      <form action={signOut}>
        <button className="ghost-button" type="submit">
          로그아웃
        </button>
      </form>
    </DropdownMenu>
  );
}
