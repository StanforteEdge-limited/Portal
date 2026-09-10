import { hasAnyPermission } from "@stanforte/shared";
import { useAuth } from "@/shared/context/AuthProvider";

export function usePermission(required: string[], any = true): boolean {
  const { user } = useAuth();
  if (!required.length) return true;
  if (any) return hasAnyPermission(user, required);
  return required.every((p) => hasAnyPermission(user, [p]));
}