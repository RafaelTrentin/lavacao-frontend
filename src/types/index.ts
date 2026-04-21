export interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'CUSTOMER';
  businessId: string;
  name?: string;
  phone?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface SignupDTO {
  name: string;
  phone: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'CUSTOMER';
  businessSlug: string;
}

export interface OperatingPeriod {
  open: string;
  close: string;
}

export type OperatingHoursValue = OperatingPeriod[] | null;
export type OperatingHoursMap = Record<string, OperatingHoursValue>;

export interface VehicleTypeInfo {
  id: string;
  businessId: string;
  kind: VehicleType;
  displayName: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface ServiceModeRule {
  id: string;
  serviceModeId: string;
  vehicleTypeId: string;
  durationMinutes: number;
  basePriceInCents: number;
  createdAt?: string;
  updatedAt?: string;
  vehicleType: VehicleTypeInfo;
}

export interface ServiceMode {
  id: string;
  businessId: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  displayOrder: number;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  rules: ServiceModeRule[];
}

export interface ExtraService {
  id: string;
  businessId: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  estimatedPriceInCents?: number | null;
  isActive: boolean;
  displayOrder: number;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  serviceModeId?: string | null;
}

export function formatPrice(cents?: number | null) {
  if (!cents) return null;
  return (cents / 100).toFixed(2);
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  displayLabel: string;
}

export interface Appointment {
  id: string;
  bookingNumber: string;
  status:
    | 'CONFIRMED'
    | 'IN_PROGRESS'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'NO_SHOW';
  scheduledStartAt: string;
  scheduledEndAt: string;
  snapshotServiceModeName: string;
  snapshotTotalPriceInCents: number;
  vehicleType: VehicleType;
  willSearchVehicle: boolean;
  createdAt: string;
}

export interface DashboardSummary {
  todayAppointments: number;
  weekAppointments: number;
  monthRevenue: number;
  totalClients: number;

  recentAppointments: Array<{
    id: string;
    status: string;
    vehicleType: VehicleType;
    client: { name: string };
    serviceMode: { name: string };
    time: string;
    date: string;
  }>;

  cancellationRate: number;
  averageTicket: number;

  dailyRevenue: Array<{
    date: string;
    revenue: number;
  }>;

  topServices: Array<{
    name: string;
    count: number;
  }>;

  topCustomers: Array<{
    name: string;
    count: number;
  }>;
}

export interface CreateAppointmentDTO {
  serviceModeId: string;
  vehicleType: VehicleType;
  scheduledStartAt: string;
  willSearchVehicle: boolean;
  searchType?: 'CURRENT_LOCATION' | 'MANUAL_ADDRESS';
  serviceAddressId?: string;
  pickupReference?: string;
}

export type VehicleType = string;

export const VEHICLE_TYPES: {
  value: VehicleType;
  label: string;
  icon: string;
}[] = [
  { value: 'CAR', label: 'Carro', icon: '🚗' },
  { value: 'MOTORCYCLE', label: 'Moto', icon: '🏍️' },
];

export interface CustomerProfile {
  id: string;
  businessId: string;
  userId: string;
  name: string;
  phone?: string | null;
  preferredContactMethod?: string | null;
  createdAt?: string;
  updatedAt?: string;
  user: {
    id: string;
    email: string;
    role: 'ADMIN' | 'CUSTOMER';
    businessId: string;
  };
  addresses?: any[];
}

export interface NotificationItem {
  id: string;
  businessId: string;
  userId: string;
  appointmentId?: string | null;
  type:
    | 'APPOINTMENT_RESCHEDULED'
    | 'APPOINTMENT_CANCELLED'
    | 'APPOINTMENT_STARTED'
    | 'GENERAL';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string | null;
}