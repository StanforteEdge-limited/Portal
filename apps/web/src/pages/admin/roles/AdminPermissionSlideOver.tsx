import { SlideOver, SlideOverHeader, SlideOverContent } from "@/shared/components/ui/SlideOver";
import type { RolePermission } from "./admin-roles-api";

type Props = {
  permission: RolePermission;
  onClose: () => void;
};

export default function AdminPermissionSlideOver({ permission, onClose }: Props) {
  return (
    <SlideOver open={true} onClose={onClose} size="md">
      <SlideOverHeader
        title={permission.name}
        subtitle={permission.module}
        onClose={onClose}
      />
      <SlideOverContent>
        <dl className="space-y-4 text-sm">
          <div>
            <dt className="font-medium text-slate-500">Name</dt>
            <dd className="mt-1 font-mono text-slate-900">{permission.name}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Slug</dt>
            <dd className="mt-1 font-mono text-slate-900">{permission.slug}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Module</dt>
            <dd className="mt-1 text-slate-900 capitalize">{permission.module}</dd>
          </div>
          {permission.description ? (
            <div>
              <dt className="font-medium text-slate-500">Description</dt>
              <dd className="mt-1 text-slate-900">{permission.description}</dd>
            </div>
          ) : null}
        </dl>
        <p className="mt-6 text-xs text-slate-400">
          Permissions are system-defined. Assign them to roles from the Roles tab.
        </p>
      </SlideOverContent>
    </SlideOver>
  );
}