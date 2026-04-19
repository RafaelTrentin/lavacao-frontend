import axios from 'axios';
import type {
  AuthResponse,
  SignupDTO,
  ServiceMode,
  ExtraService,
  TimeSlot,
  Appointment,
  DashboardSummary,
  CreateAppointmentDTO,
  User,
  VehicleTypeInfo,
  CustomerProfile,
  NotificationItem,
} from '@/types';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('washhub_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('washhub_token');
      const slug = getCurrentBusinessSlugFromPath();
        window.location.href = slug ? `/empresa/${slug}/login` : '/';
    }
    return Promise.reject(error);
  },
);

function getCurrentBusinessSlugFromPath() {
  const match = window.location.pathname.match(/^\/empresa\/([^/]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// AUTH
export const authApi = {
  login: (email: string, password: string, businessSlug?: string) =>
  api
    .post<AuthResponse>('/auth/login', { email, password, businessSlug })
    .then((r) => r.data),

  signup: (data: SignupDTO) =>
    api.post<AuthResponse>('/auth/signup', data).then((r) => r.data),
};

// SERVICE MODES
export const serviceModesApi = {
  list: () =>
    api.get<ServiceMode[]>('/service-modes').then((r) => r.data),

  listAdmin: () =>
    api.get<ServiceMode[]>('/admin/service-modes').then((r) => r.data),

  getByIdAdmin: (id: string) =>
    api.get<ServiceMode>(`/admin/service-modes/${id}`).then((r) => r.data),

  create: (data: {
    name: string;
    description?: string;
    isActive: boolean;
  }) =>
    api.post<ServiceMode>('/admin/service-modes', data).then((r) => r.data),

  update: (
    id: string,
    data: {
      name?: string;
      description?: string;
      isActive?: boolean;
    },
  ) =>
    api.put<ServiceMode>(`/admin/service-modes/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/admin/service-modes/${id}`).then((r) => r.data),

  createRule: (
    serviceModeId: string,
    data: {
      vehicleTypeKind: string;
      durationMinutes: number;
      basePriceInCents: number;
    },
  ) =>
    api
      .post(`/admin/service-modes/${serviceModeId}/rules`, data)
      .then((r) => r.data),

  updateRule: (
    ruleId: string,
    data: {
      durationMinutes: number;
      basePriceInCents: number;
    },
  ) =>
    api.put(`/admin/service-modes/rules/${ruleId}`, data).then((r) => r.data),
};

export const vehicleTypesApi = {
  list: () =>
    api.get<VehicleTypeInfo[]>('/vehicle-types').then((r) => r.data),

  listAdmin: () =>
    api.get<VehicleTypeInfo[]>('/admin/vehicle-types').then((r) => r.data),

  create: (data: { kind: string; displayName: string }) =>
    api.post<VehicleTypeInfo>('/admin/vehicle-types', data).then((r) => r.data),

  update: (id: string, data: { kind?: string; displayName?: string }) =>
    api
      .put<VehicleTypeInfo>(`/admin/vehicle-types/${id}`, data)
      .then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/admin/vehicle-types/${id}`).then((r) => r.data),
};

// EXTRA SERVICES
export const extraServicesApi = {
  list: () =>
    api.get<ExtraService[]>('/extra-services').then((r) => r.data),

  listRequests: () =>
    api.get('/extra-services/requests').then((r) => r.data),

  createRequest: (data: { extraServiceId: string; description?: string }) =>
    api.post('/extra-services/requests', data).then((r) => r.data),

  create: (data: Partial<ExtraService>) =>
    api.post<ExtraService>('/extra-services', data).then((r) => r.data),

  update: (id: string, data: Partial<ExtraService>) =>
    api.put<ExtraService>(`/extra-services/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/extra-services/${id}`).then((r) => r.data),
};

// AVAILABILITY
export const availabilityApi = {
  getSlots: (serviceModeId: string, vehicleType: string, date: string) =>
    api
      .get<TimeSlot[]>('/availability/slots', {
        params: { serviceModeId, vehicleType, date },
      })
      .then((r) => r.data),

  validateSlot: (
    serviceModeId: string,
    vehicleType: string,
    date: string,
    time: string,
  ) =>
    api
      .get<{ isValid: boolean }>('/availability/validate', {
        params: { serviceModeId, vehicleType, date, time },
      })
      .then((r) => r.data),
};

// APPOINTMENTS (CLIENTE)
export const appointmentsApi = {
  create: (data: CreateAppointmentDTO) =>
    api.post<Appointment>('/appointments', data).then((r) => r.data),

  myList: () =>
    api.get<Appointment[]>('/appointments').then((r) => r.data),

  getById: (id: string) =>
    api.get<Appointment>(`/appointments/${id}`).then((r) => r.data),

  cancel: (id: string, reason?: string) =>
    api
      .post<Appointment>(`/appointments/${id}/cancel`, { reason })
      .then((r) => r.data),

  reschedule: (id: string, newScheduledStartAt: string) =>
    api
      .post<Appointment>(`/appointments/${id}/reschedule`, {
        newScheduledStartAt,
      })
      .then((r) => r.data),

      estimateSearchFee: (data: {
  serviceModeId: string;
  vehicleType: string;
  willSearchVehicle: boolean;
  searchType?: string;
  serviceAddressId?: string;
  streetAddress?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  pickupReference?: string;
}) => api.post('/appointments/estimate-search-fee', data).then((r) => r.data),

};

// ADMIN
export const adminApi = {
  dashboardSummary: (date?: string) =>
    api
      .get<DashboardSummary>('/admin/dashboard/summary', {
        params: date ? { date } : {},
      })
      .then((r) => r.data),

  appointments: (params?: { date?: string }) => {
    if (params?.date) {
      return api
        .get<Appointment[]>(`/appointments/admin/date/${params.date}`)
        .then((r) => r.data);
    }

    return Promise.resolve([]);
  },

  clients: () =>
    api.get<CustomerProfile[]>('/customers/admin/list').then((r) => r.data),

  createQuickCustomer: (data: {
    name: string;
    phone: string;
    email?: string;
    preferredContactMethod?: string;
  }) => api.post('/customers/admin/quick', data).then((r) => r.data),

  createAppointment: (data: {
    customerId: string;
    appointment: CreateAppointmentDTO;
  }) => api.post('/appointments/admin', data).then((r) => r.data),

  cancelAppointment: (id: string, reason?: string) =>
    api
      .post(`/appointments/${id}/cancel`, { reason })
      .then((r) => r.data),

  rescheduleAppointment: (id: string, newScheduledStartAt: string) =>
    api
      .post(`/appointments/${id}/reschedule`, {
        newScheduledStartAt,
      })
      .then((r) => r.data),

  startAppointment: (id: string) =>
    api.post(`/appointments/${id}/start`).then((r) => r.data),

  completeAppointment: (id: string) =>
    api.post(`/appointments/${id}/complete`).then((r) => r.data),

  // SETTINGS
  getBusiness: () => api.get('/business').then((r) => r.data),
  getBusinessSettings: () => api.get('/business/settings').then((r) => r.data),
  getBusinessBranding: () => api.get('/business/branding').then((r) => r.data),
  getBusinessAddress: () => api.get('/business/address').then((r) => r.data),

  updateBusinessSettings: (data: {
    operatingHoursJson?: Record<string, any>;
    searchFeeUpTo5km?: number;
    searchFeeOver5km?: number;
    searchFeeLimitKm?: number;
    whatsappPhone?: string;
    minimumAdvanceMinutes?: number;
  }) => api.put('/business/settings', data).then((r) => r.data),

  updateBusinessBranding: (data: {
    logoUrl?: string;
    iconUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
  }) => api.put('/business/branding', data).then((r) => r.data),

  updateBusinessAddress: (data: {
    streetAddress?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    latitude?: number;
    longitude?: number;
  }) => api.put('/business/address', data).then((r) => r.data),

uploadLogo: (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  return api
    .post('/business/upload-logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data);
},

  geocodeBusinessAddress: (data: {
  streetAddress: string;
  number?: string;
  neighborhood?: string;
  city: string;
  state: string;
  zipCode?: string;
}) => api.post('/business/geocode-address', data).then((r) => r.data),

topCustomersByPeriod: (period: 'WEEK' | 'MONTH') =>
  api
    .get('/admin/dashboard/top-customers-period', {
      params: { period },
    })
    .then((r) => r.data),

};

export const mapsApi = {
  geocodeAddress: (data: {
    streetAddress: string;
    number?: string;
    neighborhood?: string;
    city: string;
    state: string;
    zipCode?: string;
  }) => api.post('/maps/geocode-address', data).then((r) => r.data),
};

export const customersApi = {
  getProfile: () =>
    api.get<CustomerProfile>('/customers/profile').then((r) => r.data),

  updateProfile: (data: {
    name?: string;
    phone?: string;
    preferredContactMethod?: string;
    email?: string;
  }) => api.put<CustomerProfile>('/customers/profile', data).then((r) => r.data),
};

export const notificationsApi = {
  list: () =>
    api.get<NotificationItem[]>('/notifications').then((r) => r.data),

  unreadCount: () =>
    api.get<{ count: number }>('/notifications/unread-count').then((r) => r.data),

  markRead: (id: string) =>
    api.post(`/notifications/${id}/read`).then((r) => r.data),

  markAllRead: () =>
    api.post('/notifications/read-all').then((r) => r.data),
};

export const pushNotificationsApi = {
  getPublicKey: () =>
    api.get<{ publicKey: string }>('/push-notifications/public-key').then((r) => r.data),

  subscribe: (subscription: PushSubscriptionJSON) =>
    api.post('/push-notifications/subscribe', subscription).then((r) => r.data),

  unsubscribe: (endpoint: string) =>
    api.delete('/push-notifications/unsubscribe', {
      data: { endpoint },
    }).then((r) => r.data),
};

export const publicBusinessApi = {
  getBySlug: (slug: string) =>
    api.get(`/public/business/empresa/${slug}`).then((r) => r.data),
};

export default api;