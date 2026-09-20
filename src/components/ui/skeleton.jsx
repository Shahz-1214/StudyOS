import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}) {
  return (
    (<div
      className={cn("animate-pulse rounded-md bg-elevated-high", className)}
      {...props} />)
  );
}

export { Skeleton }