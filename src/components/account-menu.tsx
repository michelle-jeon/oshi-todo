import { signOut } from "@/app/auth-actions";
import { DropdownMenu } from "@/components/dropdown-menu";

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
      <form action={signOut}>
        <button className="ghost-button" type="submit">
          로그아웃
        </button>
      </form>
    </DropdownMenu>
  );
}
