'use client';

import { Suspense, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Alert } from '@/components/ui/Alert';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { FilterPill, FilterRow } from '@/components/ui/FilterPill';
import { SearchToolbar } from '@/components/ui/SearchToolbar';
import AdminUsersList from '@/components/admin/AdminUsersList';
import { useUser } from '@/contexts/UserContext';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import type { RoleFilter } from '@/queries/admin';

const ROLE_FILTERS: RoleFilter[] = ['ALL', 'GUEST', 'USER', 'ADMIN'];

export default function AdminUsersPage() {
  const t = useTranslations('Admin');
  const tCommon = useTranslations('Common');
  const { user, loading } = useUser();
  const isAdmin = useIsAdmin();

  const [search, setSearch] = useState('');
  const [role, setRole] = useState<RoleFilter>('ALL');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  const header = (
    <div>
      <h1 className="text-2xl font-bold text-foreground">{t('usersTitle')}</h1>
      <p className="text-muted mt-1">{t('usersSubtitle')}</p>
    </div>
  );

  // The backend gates the whole admin prefix with 403; this only keeps the UI
  // honest for someone who typed the URL. The role arrives with GET /user/me, so
  // wait for it instead of calling a still-loading user a non-admin.
  if (!isAdmin) {
    return (
      <div className="space-y-6">
        {header}
        {loading || !user ? (
          <div className="text-center py-12 text-muted">{tCommon('loading')}</div>
        ) : (
          <Alert variant="error">{t('noAccess')}</Alert>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}

      {/* Outside the Suspense boundary: typing must never unmount the field. */}
      <SearchToolbar
        value={search}
        onChange={(value) => {
          setSearch(value);
          setPage(0);
        }}
        placeholder={t('searchPlaceholder')}
        filtersActive={role !== 'ALL'}
        filters={
          <FilterRow label={t('columnRole')}>
            {ROLE_FILTERS.map((value) => (
              <FilterPill
                key={value}
                active={role === value}
                onClick={() => {
                  setRole(value);
                  setPage(0);
                }}
              >
                {value === 'ALL' ? t('filterAllRoles') : t(`role_${value}`)}
              </FilterPill>
            ))}
          </FilterRow>
        }
      />

      <ErrorBoundary resetKeys={[debouncedSearch, role]}>
        <Suspense
          fallback={<div className="text-center py-12 text-muted">{t('loadingUsers')}</div>}
        >
          <AdminUsersList
            key={`${role}:${debouncedSearch}`}
            search={debouncedSearch}
            role={role}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(0);
            }}
            currentUserId={user?.id}
          />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
