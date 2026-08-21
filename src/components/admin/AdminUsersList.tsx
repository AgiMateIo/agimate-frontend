'use client';

import { useTranslations } from 'next-intl';
import { Pagination } from '@/components/ui/Pagination';
import { useAdminUsersQuery, type RoleFilter } from '@/queries/admin';
import AdminUserRow from './AdminUserRow';
import { Placeholder } from '@/components/ui/Placeholder';
import { useIdSet } from '@/hooks/useIdSet';

export default function AdminUsersList({
  search,
  role,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  currentUserId,
}: {
  search: string;
  role: RoleFilter;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  // Undefined when GET /user/me did not report an id — the self row then stays
  // editable and the backend rejects the change with a 400.
  currentUserId?: string;
}) {
  const t = useTranslations('Admin');
  const { data } = useAdminUsersQuery(search, role, page, pageSize);
  const expanded = useIdSet();


  if (data.content.length === 0) {
    return (
      <Placeholder>
        {search || role !== 'ALL' ? t('noUsersFiltered') : t('noUsers')}
      </Placeholder>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted">{t('usersTotal', { count: data.totalElements })}</div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="w-9" />
              <th className="text-left py-3 px-4 text-sm font-medium text-muted">
                {t('columnUser')}
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted w-32">
                {t('columnRole')}
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted w-40 whitespace-nowrap">
                {t('columnCreatedAt')}
              </th>
            </tr>
          </thead>
          <tbody>
            {data.content.map((user) => (
              <AdminUserRow
                key={user.id}
                user={user}
                expanded={expanded.has(user.id)}
                onToggle={() => expanded.toggle(user.id)}
                isSelf={!!currentUserId && currentUserId === user.id}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Registration order is fixed on the backend — there is no sort to offer. */}
      <Pagination
        page={page}
        pageSize={data.size}
        totalElements={data.totalElements}
        totalPages={data.totalPages}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        rowsPerPageLabel={t('rowsPerPage')}
      />
    </div>
  );
}
