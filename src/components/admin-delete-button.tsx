"use client";

import { Trash2 } from "lucide-react";
import { deleteCatalogItem } from "@/app/admin/actions";

type AdminDeleteButtonProps = {
  itemId: string;
  itemName: string;
};

export function AdminDeleteButton({ itemId, itemName }: AdminDeleteButtonProps) {
  return (
    <form
      action={deleteCatalogItem}
      onSubmit={(event) => {
        if (!window.confirm(`${itemName} 상품을 완전히 삭제할까요?`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="itemId" value={itemId} />
      <button className="icon-button danger" type="submit" aria-label={`${itemName} 삭제`}>
        <Trash2 size={16} />
      </button>
    </form>
  );
}
