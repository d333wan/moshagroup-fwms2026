import { Badge } from "@/components/ui/badge";
import type { Database } from "@/integrations/supabase/types";

type TaskStatus = Database["public"]["Enums"]["task_status"];
type TaskPriority = Database["public"]["Enums"]["task_priority"];

const STATUS_LABEL: Record<TaskStatus, string> = {
  draft: "Draft",
  assigned: "Ditugaskan",
  in_progress: "Dikerjakan",
  on_hold: "Ditunda",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

const STATUS_VARIANT: Record<TaskStatus, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline",
  assigned: "secondary",
  in_progress: "default",
  on_hold: "outline",
  completed: "secondary",
  cancelled: "destructive",
};

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: "Rendah",
  medium: "Sedang",
  high: "Tinggi",
  urgent: "Mendesak",
};

const PRIORITY_VARIANT: Record<TaskPriority, "default" | "secondary" | "destructive" | "outline"> = {
  low: "outline",
  medium: "secondary",
  high: "default",
  urgent: "destructive",
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}

export function TaskPriorityBadge({ priority }: { priority: TaskPriority }) {
  return <Badge variant={PRIORITY_VARIANT[priority]}>{PRIORITY_LABEL[priority]}</Badge>;
}

export const TASK_STATUS_LABEL = STATUS_LABEL;
export const TASK_PRIORITY_LABEL = PRIORITY_LABEL;
export const TASK_STATUS_VALUES: TaskStatus[] = [
  "draft",
  "assigned",
  "in_progress",
  "on_hold",
  "completed",
  "cancelled",
];
export const TASK_PRIORITY_VALUES: TaskPriority[] = [
  "low",
  "medium",
  "high",
  "urgent",
];
