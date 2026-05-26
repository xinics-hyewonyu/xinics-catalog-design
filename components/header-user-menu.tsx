"use client";

import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/xds/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/xds/dropdown-menu";

interface Props {
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export function HeaderUserMenu({ email, displayName, avatarUrl }: Props) {
  const initial = (displayName ?? email)?.trim().charAt(0).toUpperCase() || "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`${displayName ?? email} 메뉴`}
        className="rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--xds-focus-ring-color)]"
      >
        <Avatar size="md">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
          <AvatarFallback>{initial}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>
          <div className="flex flex-col gap-xxs">
            {displayName ? (
              <span className="text-sm font-medium text-text-body">
                {displayName}
              </span>
            ) : null}
            <span className="text-xs text-text-caption">{email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <form action="/auth/signout" method="post" className="w-full">
            <button
              type="submit"
              className="flex w-full items-center gap-xs text-left"
            >
              <LogOut aria-hidden className="size-4" />
              로그아웃
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
