import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import BusinessClosures from '@/components/admin/BusinessClosures';
import { adminApi } from '@/lib/api';

vi.mock('@/lib/api', () => ({ adminApi: { closures: vi.fn(), closeBusiness: vi.fn(), removeClosure: vi.fn() } }));
let client: QueryClient;
const closure = { id: 'closed', type: 'FULL_DAY', isRecurring: false, blockDate: '2035-01-08', blockEndDate: '2035-01-10', timezone: 'UTC',
  affectedAppointments: [{ id: 'appointment', bookingNumber: 'TEST', customer: { name: 'Cliente de teste' }, scheduledStartAt: '2035-01-09T12:00:00Z', status: 'CONFIRMED' }] };
beforeEach(() => { vi.clearAllMocks(); vi.mocked(adminApi.closures).mockResolvedValue([]); });
afterEach(() => { cleanup(); client.clear(); vi.restoreAllMocks(); });
function mount() {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><MemoryRouter><BusinessClosures /></MemoryRouter></QueryClientProvider>);
}
it('saves inclusive dates and displays existing appointments to reschedule', async () => {
  vi.mocked(adminApi.closeBusiness).mockImplementation(async () => { vi.mocked(adminApi.closures).mockResolvedValue([closure]); return closure; });
  mount();
  fireEvent.change(screen.getByLabelText('Fechada a partir de'), { target: { value: '2035-01-08' } });
  fireEvent.change(screen.getByLabelText('Fechada até'), { target: { value: '2035-01-10' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar período fechado' }));
  await waitFor(() => expect(adminApi.closeBusiness).toHaveBeenCalledWith('2035-01-08', '2035-01-10'));
  expect(await screen.findByText(/Cliente de teste/)).toBeInTheDocument();
  expect(screen.getByText(/1 atendimento/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Abrir agenda/ })).toHaveAttribute('href', '/admin/schedule');
});
it('prevents inverted periods', () => {
  mount();
  fireEvent.change(screen.getByLabelText('Fechada a partir de'), { target: { value: '2035-01-10' } });
  fireEvent.change(screen.getByLabelText('Fechada até'), { target: { value: '2035-01-08' } });
  expect(screen.getByRole('button', { name: 'Salvar período fechado' })).toBeDisabled();
  expect(adminApi.closeBusiness).not.toHaveBeenCalled();
});
it('allows removing the closure after confirmation', async () => {
  vi.mocked(adminApi.closures).mockResolvedValue([closure]);
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  mount();
  fireEvent.click(await screen.findByRole('button', { name: 'Remover fechamento' }));
  await waitFor(() => expect(adminApi.removeClosure).toHaveBeenCalledWith('closed'));
});
