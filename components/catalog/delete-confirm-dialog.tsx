"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/xds/button";
import { Input } from "@/components/xds/input";
import { Label } from "@/components/xds/label";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/xds/modal";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** What the user must type to enable the confirm button. */
  confirmText: string;
  /** Modal title text. */
  title: string;
  /** Body copy explaining what will happen. */
  description: string;
  /** Label on the confirm button. */
  confirmLabel: string;
  /** Called when the user confirms. */
  onConfirm: () => Promise<void> | void;
  /** Optional: hint shown below the confirm input. */
  hint?: string;
  /**
   * Pass false when this dialog is rendered on top of another Radix Dialog
   * (e.g. the Detail modal). Non-modal still renders overlay + content through
   * the portal, but skips the focus trap / inert sibling marking that would
   * otherwise hide this dialog underneath the parent dialog.
   */
  modal?: boolean;
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  confirmText,
  title,
  description,
  confirmLabel,
  onConfirm,
  hint,
  modal = true,
}: Props) {
  const [input, setInput] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open) setInput("");
  }, [open]);

  const matches = input.trim() === confirmText.trim();

  function handleConfirm() {
    if (!matches || pending) return;
    startTransition(async () => {
      await onConfirm();
    });
  }

  function handleOpenChange(next: boolean) {
    if (!next && pending) return;
    onOpenChange(next);
  }

  return (
    <Modal open={open} onOpenChange={handleOpenChange} modal={modal}>
      <ModalContent size="sm" tone="danger">
        <ModalHeader>
          <ModalTitle>{title}</ModalTitle>
          <ModalDescription>{description}</ModalDescription>
        </ModalHeader>
        <ModalBody>
          <div className="flex flex-col gap-sm p-lg">
            <div className="flex flex-col gap-xs">
              <Label htmlFor="delete-confirm-input">
                계속하려면{" "}
                <span className="font-semibold text-text-heading">
                  {confirmText}
                </span>{" "}
                을(를) 정확히 입력해주세요
              </Label>
              <Input
                id="delete-confirm-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={confirmText}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && matches) {
                    e.preventDefault();
                    handleConfirm();
                  }
                }}
                autoComplete="off"
                spellCheck={false}
                autoFocus
              />
              {hint ? (
                <p className="text-xs text-text-caption">{hint}</p>
              ) : null}
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            type="button"
            variant="default"
            onClick={() => handleOpenChange(false)}
            disabled={pending}
          >
            취소
          </Button>
          <Button
            type="button"
            variant="danger"
            iconLeading={<Trash2 aria-hidden className="size-4" />}
            onClick={handleConfirm}
            disabled={!matches}
            loading={pending}
          >
            {confirmLabel}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
