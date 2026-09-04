import { requireAdminAccess } from '@/lib/auth/session';
import { updateRuntimeSettingAction } from '@/server/admin/actions';
import { getAdminRuntimeSettings } from '@/server/admin/code-admin';
import { CodeAlert, CodePageHeader, CodePanel, getRuntimeTypeLabel } from '../../_components/code-console-ui';
import { BooleanPill, Button, EmptyAdminState } from '../_components/admin-shared';

export const dynamic = 'force-dynamic';

function RuntimeToggleRow({ name, value }) {
  return (
    <label className="flex items-center justify-between rounded-xl border border-[#DDD6FE] bg-white px-3 py-2 text-sm text-[#374151]">
      <span>{name}</span>
      <select name={value.name} defaultValue={value.enabled ? 'true' : 'false'} className="rounded-lg border border-[#CBD5E1] bg-white px-2 py-1 text-xs">
        <option value="true">Oui</option>
        <option value="false">Non</option>
      </select>
    </label>
  );
}

export default async function AdminRuntimesPage({ searchParams }) {
  await requireAdminAccess('fr', '/code/admin/runtimes');
  const params = searchParams ? await searchParams : {};
  const updated = typeof params?.updated === 'string' ? params.updated : null;
  const error = typeof params?.error === 'string' ? params.error : null;
  const result = await getAdminRuntimeSettings();

  return (
    <main className="px-4 py-8 lg:px-8">
      <CodePageHeader
        eyebrow="ADMIN RUNTIME"
        title="Runtimes AgentHub Code"
        description="Pilotage global prudent des runtimes. L’allowlist creator reste séparée."
      />

      {updated && <CodeAlert tone="success">Runtime setting mis à jour.</CodeAlert>}
      {error && <div className="mt-4"><CodeAlert tone="error">Impossible de mettre à jour ce runtime.</CodeAlert></div>}

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        {result.error && <CodeAlert tone="error">Impossible de charger les runtimes.</CodeAlert>}
        {!result.error && result.settings.length === 0 && <EmptyAdminState title="Aucun runtime" text="Les settings runtime seront listés ici." />}
        {result.settings.map((setting) => (
          <CodePanel key={setting.runtime_type}>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-label text-xs text-[#6B3FA0]">{setting.runtime_type}</p>
                <h2 className="font-display text-xl font-bold text-[#111827]">{getRuntimeTypeLabel(setting.runtime_type)}</h2>
                <p className="mt-2 text-sm leading-6 text-[#4B5563]">{setting.description || 'Pas de description.'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <BooleanPill active={setting.enabled} trueLabel="Enabled" falseLabel="Disabled" />
                <BooleanPill active={setting.creator_visible} trueLabel="Creator visible" falseLabel="Hidden" />
                <BooleanPill active={setting.run_enabled} trueLabel="Run enabled" falseLabel="Run off" />
              </div>
            </div>
            <form action={updateRuntimeSettingAction} className="grid gap-2">
              <input type="hidden" name="runtime_type" value={setting.runtime_type} />
              <RuntimeToggleRow name="Enabled" value={{ name: 'enabled', enabled: setting.enabled }} />
              <RuntimeToggleRow name="Creator visible" value={{ name: 'creator_visible', enabled: setting.creator_visible }} />
              <RuntimeToggleRow name="Run enabled" value={{ name: 'run_enabled', enabled: setting.run_enabled }} />
              <Button type="submit" className="mt-2 h-10 border-0 bg-[#111827] text-white hover:bg-[#2B1A44]">
                Enregistrer avec audit log
              </Button>
            </form>
          </CodePanel>
        ))}
      </section>
    </main>
  );
}
