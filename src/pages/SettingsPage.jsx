// src/pages/SettingsPage.jsx
// Replaces the old placeholder. Three tabs rendered by role:
//
// "Account"       — All users: change password entry point.
// "Subscription"  — tenant_admin (VIEW_SUBSCRIPTIONS): current plan,
//                   limits, add-ons, maintenance window, upgrade request.
// "Admin Panel"   — super_admin (MANAGE_PLANS + MANAGE_SUBSCRIPTIONS):
//                   plan list with toggle, upgrade request approvals.
//
// Role detection: reads role from Zustand authStore (no RBAC refactor —
// role check is purely cosmetic for tab visibility; backend enforces real auth).

import { useState }                  from 'react'
import { Lock, CreditCard, Shield, Check, X,
         ChevronUp, Loader2, Plus, ToggleLeft, ToggleRight } from 'lucide-react'

import ChangePasswordModal           from '@/features/auth/components/ChangePasswordModal'
import { useMySubscription, usePlans,
  useAllSubscriptions, useUpgradeRequests,
  useSubmitUpgradeRequest, useApproveUpgradeRequest,
  useRejectUpgradeRequest, useTogglePlanActive }  from '@/features/subscription/hooks/useSubscription'
import { useAuthStore, selectUser }  from '@/store/authStore'
import { formatRupiah }              from '@/hooks/useRupiahInput'
import useToast                      from '@/hooks/useToast'
import { cn }                        from '@/lib/utils'

// ── Helpers ───────────────────────────────────────────────────

const fmt = (iso) => {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return '—' }
}

const limitDisplay = (v) => (v === -1 || v === undefined ? '∞' : v)

const PLAN_BADGE = {
  starter:  'bg-zinc-100 text-zinc-600',
  growth:   'bg-blue-100 text-blue-700',
  business: 'bg-violet-100 text-violet-700',
}

const STATUS_BADGE = {
  trial:     'bg-amber-100 text-amber-700',
  active:    'bg-emerald-100 text-emerald-700',
  expired:   'bg-red-100 text-red-700',
  cancelled: 'bg-zinc-100 text-zinc-500',
}

const REQUEST_BADGE = {
  pending:  'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
}

// ── Section wrapper ───────────────────────────────────────────

const Section = ({ title, description, children }) => (
  <div className="bg-card border border-border rounded-xl p-5 space-y-4">
    <div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
    </div>
    {children}
  </div>
)

const InfoRow = ({ label, value }) => (
  <div className="flex items-center justify-between py-2 border-b border-border last:border-0 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-foreground">{value ?? '—'}</span>
  </div>
)

// ── Account Tab ───────────────────────────────────────────────

const AccountTab = ({ user }) => {
  const [cpOpen, setCpOpen] = useState(false)
  return (
    <div className="space-y-4 max-w-xl">
      <Section title="Profile" description="Your account information.">
        <InfoRow label="Name"  value={user?.name} />
        <InfoRow label="Email" value={user?.email} />
        <InfoRow label="Role"  value={user?.role?.replace('_', ' ')} />
      </Section>

      <Section title="Security">
        <p className="text-sm text-muted-foreground">
          Use a strong, unique password you don't use elsewhere.
        </p>
        <button onClick={() => setCpOpen(true)}
          className={cn('flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md',
            'bg-brand-500 hover:bg-brand-600 text-brand-950 transition-colors')}>
          <Lock className="w-3.5 h-3.5" />Change Password
        </button>
      </Section>

      <ChangePasswordModal open={cpOpen} onClose={() => setCpOpen(false)} />
    </div>
  )
}

// ── Subscription Tab (tenant_admin) ───────────────────────────

const UpgradeRequestForm = ({ plans, currentPlanSlug }) => {
  const toast   = useToast()
  const submit  = useSubmitUpgradeRequest()
  const [toPlanId, setToPlanId] = useState('')
  const [reason,   setReason]   = useState('')

  const availablePlans = (plans ?? []).filter((p) => p.isActive && p.slug !== currentPlanSlug)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!toPlanId) return
    submit.mutate(
      { toPlanId, reason: reason || undefined },
      {
        onSuccess: () => { toast.success('Upgrade request submitted', 'We\'ll review it shortly.'); setToPlanId(''); setReason('') },
        onError:   (err) => toast.error('Request failed', err?.response?.data?.message ?? 'Please try again.'),
      }
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <select value={toPlanId} onChange={(e) => setToPlanId(e.target.value)} disabled={submit.isPending}
        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50">
        <option value="">Select plan to upgrade to…</option>
        {availablePlans.map((p) => (
          <option key={p._id} value={p._id}>
            {p.name} — Rp {formatRupiah(p.price)}/month
          </option>
        ))}
      </select>
      <textarea value={reason} onChange={(e) => setReason(e.target.value)} disabled={submit.isPending}
        placeholder="Optional: tell us why you want to upgrade…" rows={2}
        className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50" />
      <button type="submit" disabled={!toPlanId || submit.isPending}
        className={cn('flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md',
          'bg-brand-500 hover:bg-brand-600 text-brand-950 transition-colors disabled:opacity-60')}>
        {submit.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {submit.isPending ? 'Submitting…' : <><ChevronUp className="w-3.5 h-3.5" />Request Upgrade</>}
      </button>
    </form>
  )
}

const SubscriptionTab = () => {
  const { data: sub, isLoading: subLoading } = useMySubscription()
  const { data: plansData }                  = usePlans({})
  const { data: reqData }                    = useUpgradeRequests({})
  const plans    = plansData?.data    ?? []
  const requests = reqData?.data      ?? []

  if (subLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>

  if (!sub) return (
    <div className="text-center py-12 text-muted-foreground text-sm">No subscription found. Contact support.</div>
  )

  const plan   = sub.plan ?? {}

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Current plan summary */}
      <Section title="Current Plan">
        <div className="flex items-center gap-3 mb-3">
          <span className={cn('px-3 py-1 rounded-full text-sm font-bold capitalize',
            PLAN_BADGE[sub.planSlug] ?? 'bg-zinc-100 text-zinc-600')}>
            {plan.name ?? sub.planSlug}
          </span>
          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium capitalize',
            STATUS_BADGE[sub.status] ?? 'bg-zinc-100 text-zinc-500')}>
            {sub.status}
          </span>
        </div>
        <InfoRow label="Billing cycle" value={sub.billingCycle} />
        <InfoRow label="Started"       value={fmt(sub.startedAt)} />
        <InfoRow label="Expires"       value={sub.expiredAt ? fmt(sub.expiredAt) : 'No fixed expiry'} />
        {sub.maintenanceUntil && (
          <InfoRow label="Maintenance until" value={fmt(sub.maintenanceUntil)} />
        )}
        <InfoRow label="Auto-renew" value={sub.autoRenew ? 'Yes' : 'No'} />
      </Section>

      {/* Limits */}
      <Section title="Resource Limits" description="Effective limits include your plan base and any purchased add-ons.">
        {[
          ['Outlets',   sub.effectiveLimits?.maxOutlets],
          ['Employees', sub.effectiveLimits?.maxEmployees],
          ['Admins',    sub.effectiveLimits?.maxAdmins],
          ['Bikes',     sub.effectiveLimits?.maxBikes],
          ['Products',  sub.effectiveLimits?.maxProducts],
        ].map(([label, effective]) => (
          <div key={label} className="flex items-center justify-between py-2 border-b border-border last:border-0 text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-semibold text-foreground tabular-nums">{limitDisplay(effective)}</span>
          </div>
        ))}
      </Section>

      {/* Features */}
      {plan.features && (
        <Section title="Feature Access">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {Object.entries(plan.features).map(([key, enabled]) => (
              <div key={key} className="flex items-center gap-1.5 text-xs py-1">
                {enabled
                  ? <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  : <X     className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />}
                <span className={enabled ? 'text-foreground' : 'text-muted-foreground/60'}>
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Upgrade request form */}
      <Section title="Request Plan Upgrade"
        description="Submit a request to upgrade your plan. Our team will review and respond.">
        <UpgradeRequestForm plans={plans} currentPlanSlug={sub.planSlug} />
      </Section>

      {/* Upgrade request history */}
      {requests.length > 0 && (
        <Section title="Upgrade Request History">
          {requests.map((r) => (
            <div key={r._id} className="flex items-center justify-between py-2 border-b border-border last:border-0 text-sm">
              <div>
                <p className="font-medium text-foreground capitalize">
                  {r.fromPlanSlug} → {r.toPlanSlug}
                </p>
                <p className="text-xs text-muted-foreground">{fmt(r.createdAt)}</p>
                {r.adminNotes && <p className="text-xs text-muted-foreground italic mt-0.5">"{r.adminNotes}"</p>}
              </div>
              <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium capitalize',
                REQUEST_BADGE[r.status] ?? 'bg-zinc-100 text-zinc-500')}>
                {r.status}
              </span>
            </div>
          ))}
        </Section>
      )}
    </div>
  )
}

// ── Admin Panel Tab (super_admin) ─────────────────────────────

const AdminTab = () => {
  const toast               = useToast()
  const { data: plansData } = usePlans({})
  const { data: reqData }   = useUpgradeRequests({})
  const toggleMutation      = useTogglePlanActive()
  const approveMutation     = useApproveUpgradeRequest()
  const rejectMutation      = useRejectUpgradeRequest()
  const plans    = plansData?.data ?? []
  const requests = reqData?.data   ?? []
  const pending  = requests.filter((r) => r.status === 'pending')

  const handleTogglePlan = (planId) => {
    toggleMutation.mutate(planId, {
      onSuccess: (p) => toast.success(`Plan ${p.isActive ? 'activated' : 'deactivated'}`),
      onError:   (err) => toast.error('Failed', err?.response?.data?.message ?? 'Please try again.'),
    })
  }

  const handleApprove = (requestId) => {
    approveMutation.mutate({ requestId, payload: {} }, {
      onSuccess: () => toast.success('Upgrade request approved'),
      onError:   (err) => toast.error('Failed', err?.response?.data?.message ?? 'Please try again.'),
    })
  }

  const handleReject = (requestId) => {
    rejectMutation.mutate({ requestId, payload: {} }, {
      onSuccess: () => toast.success('Upgrade request rejected'),
      onError:   (err) => toast.error('Failed', err?.response?.data?.message ?? 'Please try again.'),
    })
  }

  return (
    <div className="space-y-4">
      {/* Plans */}
      <Section title="Plans" description="Manage subscription plans available to tenants.">
        {plans.length === 0 ? (
          <p className="text-sm text-muted-foreground">No plans found.</p>
        ) : (
          <div className="space-y-2">
            {plans.map((plan) => (
              <div key={plan._id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{plan.name}</p>
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium capitalize',
                      PLAN_BADGE[plan.slug] ?? 'bg-zinc-100 text-zinc-600')}>
                      {plan.slug}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Rp {formatRupiah(plan.price ?? 0)}/month
                    {' · '}{limitDisplay(plan.limits?.maxOutlets)} outlets
                    {' · '}{limitDisplay(plan.limits?.maxEmployees)} employees
                    {' · '}{limitDisplay(plan.limits?.maxAdmins)} admins
                  </p>
                </div>
                <button
                  onClick={() => handleTogglePlan(plan._id)}
                  disabled={toggleMutation.isPending}
                  title={plan.isActive ? 'Deactivate' : 'Activate'}
                  className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50">
                  {plan.isActive
                    ? <ToggleRight className="w-5 h-5 text-brand-500" />
                    : <ToggleLeft  className="w-5 h-5" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Pending upgrade requests */}
      <Section title={`Pending Upgrade Requests ${pending.length > 0 ? `(${pending.length})` : ''}`}
        description="Review and action upgrade requests from tenants.">
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending requests.</p>
        ) : (
          <div className="space-y-2">
            {pending.map((req) => (
              <div key={req._id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {req.fromPlanSlug} → {req.toPlanSlug}
                  </p>
                  <p className="text-xs text-muted-foreground">{fmt(req.createdAt)}</p>
                  {req.reason && (
                    <p className="text-xs text-muted-foreground italic mt-0.5 truncate">"{req.reason}"</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => handleApprove(req._id)}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                    className={cn('flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-md',
                      'bg-emerald-500 hover:bg-emerald-600 text-white transition-colors disabled:opacity-60')}>
                    {approveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    Approve
                  </button>
                  <button onClick={() => handleReject(req._id)}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                    className={cn('flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-md',
                      'border border-destructive text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-60')}>
                    <X className="w-3 h-3" />Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}

// ── SettingsPage ──────────────────────────────────────────────

const SettingsPage = () => {
  const user = useAuthStore(selectUser)
  const role = user?.role

  const tabs = [
    { key: 'account',      label: 'Account',      icon: Lock,        roles: null }, // all
    { key: 'subscription', label: 'Subscription',  icon: CreditCard,  roles: ['tenant_admin'] },
    { key: 'admin',        label: 'Admin Panel',   icon: Shield,      roles: ['super_admin'] },
  ].filter((t) => !t.roles || t.roles.includes(role))

  const [activeTab, setActiveTab] = useState('account')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account and subscription.</p>
      </div>

      {/* Tab switcher */}
      <div className="flex items-center p-1 bg-muted rounded-lg gap-0.5 mb-6 w-fit">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={cn('flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all',
              activeTab === key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      {activeTab === 'account'      && <AccountTab user={user} />}
      {activeTab === 'subscription' && <SubscriptionTab />}
      {activeTab === 'admin'        && <AdminTab />}
    </div>
  )
}

export default SettingsPage