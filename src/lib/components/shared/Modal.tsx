import type { ReactNode } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const widthClassMap: Record<"sm" | "md" | "lg", string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
}

type ModalProps = {
  open: boolean
  title: string
  onClose: () => void
  width?: "sm" | "md" | "lg"
  children?: ReactNode
}

export function Modal({
  open,
  title,
  onClose,
  width = "md",
  children,
}: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        className={`max-w-[calc(100%-2rem)] ${widthClassMap[width]}`}
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="pt-2">{children}</div>
      </DialogContent>
    </Dialog>
  )
}
