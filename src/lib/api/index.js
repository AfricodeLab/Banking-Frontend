import { api } from './client.js';

/** Grouped endpoint bindings for the Go core-banking API. */

export const AuthApi = {
  login: (username, password, otp) => api.post('/auth/login', { username, password, otp }, { auth: false }),
  register: (payload) => api.post('/auth/register', payload, { auth: false }),
  // Backend reads the bearer token from the Authorization header (attached by auth:true).
  validate: () => api.post('/auth/validate', undefined, { auth: true }),
  // MFA enrolment (authenticated).
  mfaSetup: () => api.post('/auth/mfa/setup', {}),
  mfaEnable: (code) => api.post('/auth/mfa/enable', { code }),
  mfaDisable: (code) => api.post('/auth/mfa/disable', { code }),
};

export const CustomerApi = {
  list: (params) => api.get('/customers', { params }),
  get: (id) => api.get(`/customers/${id}`),
  create: (payload) => api.post('/customers', payload),
  update: (id, payload) => api.put(`/customers/${id}`, payload),
  remove: (id) => api.del(`/customers/${id}`),
  compliance: (id) => api.get(`/customers/${id}/compliance`),
  risk: (id) => api.get(`/customers/${id}/risk`),
};

export const AccountApi = {
  get: (id) => api.get(`/accounts/${id}`),
  create: (payload) => api.post('/accounts', payload),
  byCustomer: (customerId) => api.get(`/accounts/customer/${customerId}`),
  updateStatus: (id, status) => api.put(`/accounts/${id}/status`, { status }),
  remove: (id) => api.del(`/accounts/${id}`),
  cards: (id) => api.get(`/accounts/${id}/cards`),
  createCard: (id, payload) => api.post(`/accounts/${id}/cards`, payload),
  transactions: (id) => api.get(`/accounts/${id}/transactions`),
  limits: (id) => api.get(`/accounts/${id}/limits`),
  setLimits: (id, payload) => api.put(`/accounts/${id}/limits`, payload),
};

export const TransactionApi = {
  create: (payload) => api.post('/transactions', payload),
  get: (id) => api.get(`/transactions/${id}`),
  process: (id) => api.put(`/transactions/${id}/process`, {}),
  cancel: (id) => api.put(`/transactions/${id}/cancel`, {}),
  reverse: (id, reason) => api.put(`/transactions/${id}/reverse`, { reason }),
  logs: (id) => api.get(`/transactions/${id}/logs`),
  byAccount: (accountId, params) => api.get(`/transactions/account/${accountId}`, { params }),
  history: (params) => api.get('/transactions/history', { params }),
  stats: () => api.get('/transactions/admin/stats'),
  tellerToday: (params) => api.get('/transactions/teller/today', { params }),
};

// In-app notifications.
export const NotificationApi = {
  list: () => api.get('/notifications'),
  unreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id) => api.post(`/notifications/${id}/read`, {}),
  markAllRead: () => api.post('/notifications/read-all', {}),
};

// Teller cash-drawer / session.
export const TellerApi = {
  current: () => api.get('/teller/sessions/current'),
  open: (payload) => api.post('/teller/sessions/open', payload),
  close: (payload) => api.post('/teller/sessions/close', payload),
  deposit: (payload, key) => api.post('/teller/cash/deposit', payload, key ? { headers: { 'Idempotency-Key': key } } : undefined),
  withdraw: (payload, key) => api.post('/teller/cash/withdraw', payload, key ? { headers: { 'Idempotency-Key': key } } : undefined),
  vault: (payload) => api.post('/teller/cash/vault', payload),
  adjust: (payload) => api.post('/teller/cash/adjust', payload),
  pendingAdjustments: () => api.get('/teller/cash/adjustments/pending'),
  approveAdjustment: (id) => api.post(`/teller/cash/adjustments/${id}/approve`, {}),
  rejectAdjustment: (id, reason) => api.post(`/teller/cash/adjustments/${id}/reject`, { reason }),
  movements: () => api.get('/teller/cash/movements'),
};

// Customer online-banking portal (scoped to the logged-in customer).
export const PortalApi = {
  profile: () => api.get('/portal/profile'),
  accounts: () => api.get('/portal/accounts'),
  transactions: (params) => api.get('/portal/transactions', { params }),
  provision: (customerId, payload) => api.post(`/portal/access/${customerId}`, payload || {}),
};

// Outbound payment rails (GIP / MoMo / RTGS / SWIFT).
export const PayoutApi = {
  rails: () => api.get('/rails'),
  list: (params) => api.get('/payouts', { params }),
  create: (payload) => api.post('/payouts', payload),
};

// Maker-checker approval queue.
export const ApprovalApi = {
  list: (params) => api.get('/approvals', { params }),
  approve: (id) => api.post(`/approvals/${id}/approve`, {}),
  reject: (id, reason) => api.post(`/approvals/${id}/reject`, { reason }),
  requestInfo: (id, note) => api.post(`/approvals/${id}/request-info`, { note }),
};

export const LoanApi = {
  list: (params) => api.get('/loans', { params }),
  get: (id) => api.get(`/loans/${id}`),
  create: (payload) => api.post('/loans', payload),
  byCustomer: (customerId) => api.get(`/loans/customer/${customerId}`),
  summary: (id) => api.get(`/loans/${id}/summary`),
  updateStatus: (id, status) => api.put(`/loans/${id}/status`, { status }),
  pay: (id, account_id, payment_amount) => api.post(`/loans/${id}/payments`, { account_id, payment_amount }),
  remove: (id) => api.del(`/loans/${id}`),
};

export const BeneficiaryApi = {
  list: (ownerCustomerId, params) => api.get('/beneficiaries', { params: { owner_customer_id: ownerCustomerId, ...params } }),
  get: (id) => api.get(`/beneficiaries/${id}`),
  create: (payload) => api.post('/beneficiaries', payload),
  remove: (id) => api.del(`/beneficiaries/${id}`),
};

export const StandingOrderApi = {
  list: (accountId) => api.get('/standing-orders', { params: accountId ? { account_id: accountId } : {} }),
  create: (payload) => api.post('/standing-orders', payload),
  pause: (id) => api.put(`/standing-orders/${id}/pause`, {}),
  resume: (id) => api.put(`/standing-orders/${id}/resume`, {}),
  cancel: (id) => api.del(`/standing-orders/${id}`),
};

export const BranchApi = {
  list: () => api.get('/branches'),
  get: (id) => api.get(`/branches/${id}`),
  create: (payload) => api.post('/branches', payload),
  stats: () => api.get('/branches/stats'),
};

export const CardApi = {
  byAccount: (accountId) => api.get(`/accounts/${accountId}/cards`),
  issue: (accountId, payload) => api.post(`/accounts/${accountId}/cards`, payload),
  block: (id) => api.put(`/cards/${id}/block`, {}),
  unblock: (id) => api.put(`/cards/${id}/unblock`, {}),
  updateStatus: (id, status) => api.put(`/cards/${id}/status`, { status }),
  stats: () => api.get('/cards/stats'),
};

export const RoleApi = {
  list: () => api.get('/roles'),
  get: (id) => api.get(`/roles/${id}`),
  create: (payload) => api.post('/roles', payload), // { role_name, department }
  update: (id, payload) => api.put(`/roles/${id}`, payload),
  remove: (id) => api.del(`/roles/${id}`),
  permissions: (id) => api.get(`/roles/${id}/permissions`),
  assignPermission: (id, permissionId) => api.post(`/roles/${id}/permissions/${permissionId}`, {}),
  removePermission: (id, permissionId) => api.del(`/roles/${id}/permissions/${permissionId}`),
};

export const PermissionApi = {
  list: () => api.get('/permissions'),
};

export const UserApi = {
  list: () => api.get('/users'),
  register: (payload) => api.post('/auth/register', payload, { auth: false }),
  // Admin MFA management.
  requireMfa: (userId, required) => api.post('/admin/mfa/require', { user_id: userId, required }),
  requireMfaByRole: (roleId, required) => api.post('/admin/mfa/require', { role_id: roleId, required }),
  requireMfaAll: (required) => api.post('/admin/mfa/require', { all: true, required }),
  resetMfa: (userId) => api.post('/admin/mfa/reset', { user_id: userId }),
  setTellerLimit: (userId, limit) => api.put(`/users/${userId}/teller-limit`, { limit }),
};

export const EmployeeApi = {
  list: (params) => api.get('/employees', { params }),
  create: (payload) => api.post('/employees', payload),
};

export const ComplianceApi = {
  list: (params) => api.get('/compliance', { params }),
};

export const AuditApi = {
  list: (params) => api.get('/audits', { params }),
  stats: () => api.get('/audits/stats'),
};

export const ExchangeRateApi = {
  latest: (params) => api.get('/exchange-rates/latest', { params }),
  convert: (params) => api.get('/exchange-rates/convert', { params }),
  currencies: () => api.get('/exchange-rates/currencies'),
};

export const FxRateApi = {
  list: () => api.get('/fx-rates'),
  upsert: (payload) => api.post('/fx-rates', payload), // { base_currency, quote_currency, rate }
  update: (id, rate) => api.put(`/fx-rates/${id}`, { rate }),
  remove: (id) => api.del(`/fx-rates/${id}`),
};

export const ReportApi = {
  transactions: (params) => api.get('/reports/transactions', { params }),
  customers: (params) => api.get('/reports/customers', { params }),
  accounts: (params) => api.get('/reports/accounts', { params }),
  dailySummary: (params) => api.get('/reports/daily-summary', { params }),
};

export const ApiKeyApi = {
  list: () => api.get('/api-keys'),
  create: (payload) => api.post('/api-keys', payload), // { name, owner, scopes }
  revoke: (id) => api.del(`/api-keys/${id}`),
};

export const SystemApi = {
  health: () => api.get('/health', { auth: false }),
  metrics: () => api.get('/metrics', { auth: false }),
};
