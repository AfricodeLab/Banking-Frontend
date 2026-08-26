import { api } from './client.js';

/** Grouped endpoint bindings for the Go core-banking API. */

export const AuthApi = {
  login: (username, password) => api.post('/auth/login', { username, password }, { auth: false }),
  register: (payload) => api.post('/auth/register', payload, { auth: false }),
  validate: (token) => api.post('/auth/validate', { token }, { auth: false }),
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
};

export const TransactionApi = {
  create: (payload) => api.post('/transactions', payload),
  get: (id) => api.get(`/transactions/${id}`),
  process: (id) => api.put(`/transactions/${id}/process`, {}),
  cancel: (id) => api.put(`/transactions/${id}/cancel`, {}),
  logs: (id) => api.get(`/transactions/${id}/logs`),
  byAccount: (accountId) => api.get(`/transactions/account/${accountId}`),
  history: (params) => api.get('/transactions/history', { params }),
  stats: () => api.get('/transactions/admin/stats'),
};

export const LoanApi = {
  list: (params) => api.get('/loans', { params }),
  get: (id) => api.get(`/loans/${id}`),
  create: (payload) => api.post('/loans', payload),
  byCustomer: (customerId) => api.get(`/loans/customer/${customerId}`),
  summary: (id) => api.get(`/loans/${id}/summary`),
  updateStatus: (id, status) => api.put(`/loans/${id}/status`, { status }),
  remove: (id) => api.del(`/loans/${id}`),
};

export const BranchApi = {
  list: () => api.get('/branches'),
  get: (id) => api.get(`/branches/${id}`),
  create: (payload) => api.post('/branches', payload),
  stats: () => api.get('/branches/stats'),
};

export const RoleApi = {
  list: () => api.get('/roles'),
};

export const EmployeeApi = {
  list: (params) => api.get('/employees', { params }),
  create: (payload) => api.post('/employees', payload),
};

export const ComplianceApi = {
  list: (params) => api.get('/compliance', { params }),
};

export const AuditApi = {
  list: (params) => api.get('/audit', { params }),
};

export const ExchangeRateApi = {
  latest: (params) => api.get('/exchange-rates/latest', { params }),
  convert: (params) => api.get('/exchange-rates/convert', { params }),
  currencies: () => api.get('/exchange-rates/currencies'),
};

export const ReportApi = {
  transactions: (params) => api.get('/reports/transactions', { params }),
  customers: (params) => api.get('/reports/customers', { params }),
  accounts: (params) => api.get('/reports/accounts', { params }),
  dailySummary: (params) => api.get('/reports/daily-summary', { params }),
};

export const SystemApi = {
  health: () => api.get('/health', { auth: false }),
  metrics: () => api.get('/metrics', { auth: false }),
};
