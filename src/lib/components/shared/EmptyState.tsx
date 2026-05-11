import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card"

type EmptyStateProps = {
  title: string
  description: string
  actionText?: string
  onAction?: () => void
}

export function EmptyState({
  title,
  description,
  actionText,
  onAction,
}: EmptyStateProps) {
  return (
    <Card className="rounded-none border-dashed text-center">
      <CardContent className="space-y-3 px-4 py-8">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        {actionText && onAction ? (
          <div className="pt-1">
            <Button type="button" onClick={onAction}>
              {actionText}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
