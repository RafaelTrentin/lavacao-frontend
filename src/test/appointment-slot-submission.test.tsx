import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import NewAppointmentPage from '@/pages/client/NewAppointmentPage';
import { appointmentsApi, availabilityApi } from '@/lib/api';

vi.mock('@/hooks/useBusinessTimezone', () => ({ useBusinessTimezone: () => 'America/Manaus' }));
vi.mock('@/components/layouts/ClientLayout', () => ({ default: ({ children }: React.PropsWithChildren) => <div>{children}</div> }));
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
  motion: { div: ({ children }: React.PropsWithChildren) => <div>{children}</div> },
}));
vi.mock('@/components/ui/calendar', () => ({ Calendar: ({ onSelect }: { onSelect: (date: Date) => void }) =>
  <button onClick={() => onSelect(new Date(2035, 0, 8, 12))}>Escolher dia de teste</button> }));
vi.mock('@/lib/api', () => ({
  vehicleTypesApi: { list: async () => [{ id: 'vehicle', kind: 'CAR', displayName: 'Carro de teste' }] },
  serviceModesApi: { list: async () => [{ id: 'mode', name: 'Lavagem de teste', rules: [
    { vehicleType: { kind: 'CAR' }, durationMinutes: 40, basePriceInCents: 1000 },
  ] }] },
  availabilityApi: { getSlotsWithStatus: vi.fn(async () => ({ closed: false, message: null, slots: [{ startTime: '00:15', endTime: '00:55', displayLabel: '00:15 - 00:55',
    scheduledStartAt: '2035-01-08T04:15:00.000Z', scheduledEndAt: '2035-01-08T04:55:00.000Z', timezone: 'America/Manaus' }] })) },
  appointmentsApi: { create: vi.fn(async () => ({ id: 'fixture' })), estimateSearchFee: vi.fn() },
}));

afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe('Customer booking submission', () => {
  it('tells the customer that the selected date is closed without offering slots', async () => {
    vi.mocked(availabilityApi.getSlotsWithStatus).mockResolvedValueOnce({ slots: [], closed: true, message: 'Lavação fechada' });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><MemoryRouter><NewAppointmentPage /></MemoryRouter></QueryClientProvider>);
    fireEvent.click(await screen.findByRole('button', { name: 'Carro de teste' }));
    fireEvent.click(screen.getByRole('button', { name: /Continuar/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Lavagem de teste/ }));
    fireEvent.click(screen.getByRole('button', { name: /Continuar/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Escolher dia de teste' }));
    fireEvent.click(screen.getByRole('button', { name: /Continuar/ }));
    await screen.findByText('Lavação fechada nesta data');
    expect(screen.getByRole('button', { name: /Continuar/ })).toBeDisabled();
    expect(appointmentsApi.create).not.toHaveBeenCalled(); client.clear();
  });
  async function summary() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><NewAppointmentPage /></MemoryRouter></QueryClientProvider>);
    fireEvent.click(await screen.findByRole('button', { name: 'Carro de teste' }));
    fireEvent.click(screen.getByRole('button', { name: /Continuar/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Lavagem de teste/ }));
    fireEvent.click(screen.getByRole('button', { name: /Continuar/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Escolher dia de teste' }));
    fireEvent.click(screen.getByRole('button', { name: /Continuar/ }));
    fireEvent.click(await screen.findByRole('button', { name: /^00:15$/ }));
    fireEvent.click(screen.getByRole('button', { name: /Continuar/ }));
    return client;
  }
  it('keeps manual pickup outside the total and explicitly tells the customer to negotiate offline', async () => {
    const client = await summary();
    fireEvent.click(screen.getByRole('switch'));
    fireEvent.click(screen.getByRole('button', { name: /Digitar endereço/ }));
    for (const [placeholder, value] of [['Rua', 'Rua não localizada'], ['Número', '10'], ['Bairro', 'Teste'], ['Cidade', 'Teste'], ['Estado', 'SC']]) {
      fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value } });
    }
    expect(screen.getByText('Valor no app (sem taxa de busca)')).toBeInTheDocument();
    expect(screen.getByText(/Essa taxa não está incluída no valor abaixo/)).toBeInTheDocument();
    expect(appointmentsApi.estimateSearchFee).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Confirmar Agendamento/ }));
    await waitFor(() => expect(appointmentsApi.create).toHaveBeenCalledWith(expect.objectContaining({ searchType: 'MANUAL_ADDRESS', streetAddress: 'Rua não localizada', willSearchVehicle: true })));
    expect(vi.mocked(appointmentsApi.create).mock.calls[0][0]).not.toHaveProperty('searchFeeInCents');
    client.clear();
  });
  it('does not present a failed GPS quote as zero or submit the booking', async () => {
    vi.mocked(appointmentsApi.estimateSearchFee).mockRejectedValue(new Error('Maps unavailable'));
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
      getCurrentPosition: (success: any) => success({ coords: { latitude: -27, longitude: -48 } }),
    } });
    const client = await summary();
    fireEvent.click(screen.getByRole('switch'));
    fireEvent.click(screen.getByRole('button', { name: 'Localização atual' }));
    fireEvent.click(screen.getByRole('button', { name: 'Usar minha localização atual' }));
    await waitFor(() => expect(appointmentsApi.estimateSearchFee).toHaveBeenCalled());
    await screen.findByText('Taxa de busca indisponível');
    fireEvent.click(screen.getByRole('button', { name: /Confirmar Agendamento/ }));
    expect(appointmentsApi.create).not.toHaveBeenCalled();
    client.clear();
  });
  it('sends the UTC slot from the API instead of reconstructing a -03 offset', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><NewAppointmentPage /></MemoryRouter></QueryClientProvider>);
    fireEvent.click(await screen.findByRole('button', { name: 'Carro de teste' }));
    fireEvent.click(screen.getByRole('button', { name: /Continuar/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Lavagem de teste/ }));
    fireEvent.click(screen.getByRole('button', { name: /Continuar/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Escolher dia de teste' }));
    fireEvent.click(screen.getByRole('button', { name: /Continuar/ }));
    fireEvent.click(await screen.findByRole('button', { name: /^00:15$/ }));
    fireEvent.click(screen.getByRole('button', { name: /Continuar/ }));
    fireEvent.click(screen.getByRole('button', { name: /Confirmar Agendamento/ }));
    await waitFor(() => expect(appointmentsApi.create).toHaveBeenCalledWith(expect.objectContaining({
      scheduledStartAt: '2035-01-08T04:15:00.000Z', serviceModeId: 'mode', willSearchVehicle: false,
    })));
    client.clear();
  });
});
