// ============================================================
// AdminMessagingSettingsPage — Component tests
//
// Tests rendering, channel configuration, loading/error states,
// and messaging settings for Telegram and WhatsApp integration.
// ============================================================

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import type {
  MessagingSettingsData,
  TelegramSettingsResponse,
  WhatsAppSettingsResponse,
} from '@/app/services/platform-api/pa-messaging';

// ── Mock motion/react ──────────────────────────────────────
vi.mock('motion/react', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <div {...props} ref={ref}>{children}</div>
    )),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// ── Mock toast notification ────────────────────────────────
const mockToast = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: (msg: string) => mockToast('success', msg),
    error: (msg: string) => mockToast('error', msg),
  },
  Toaster: () => null,
}));

// ── Mock UI components ─────────────────────────────────────
vi.mock('@/app/components/ui/skeleton', () => ({
  Skeleton: ({ className }: any) => <div className={className} data-testid="skeleton" />,
}));

vi.mock('@/app/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/app/components/ui/input', () => ({
  Input: ({ onChange, value, type, placeholder, ...props }: any) => (
    <input
      onChange={onChange}
      value={value}
      type={type}
      placeholder={placeholder}
      {...props}
    />
  ),
}));

vi.mock('@/app/components/ui/label', () => ({
  Label: ({ children, htmlFor }: any) => <label htmlFor={htmlFor}>{children}</label>,
}));

vi.mock('@/app/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange }: any) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      data-testid="switch"
    />
  ),
}));

vi.mock('@/app/components/ui/badge', () => ({
  Badge: ({ children, className, variant }: any) => (
    <span className={className} data-variant={variant}>
      {children}
    </span>
  ),
}));

vi.mock('@/app/components/shared/PageHeader', () => ({
  PageHeader: ({ title, subtitle, icon, actions }: any) => (
    <div data-testid="page-header">
      <div>{icon}</div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {actions && <div>{actions}</div>}
    </div>
  ),
}));

// ── Mock API ───────────────────────────────────────────────
const mockGetMessagingSettings = vi.fn();
const mockUpdateMessagingSettings = vi.fn();
const mockTestMessagingConnection = vi.fn();

vi.mock('@/app/services/platform-api/pa-messaging', () => ({
  getMessagingSettings: (...args: any[]) => mockGetMessagingSettings(...args),
  updateMessagingSettings: (...args: any[]) => mockUpdateMessagingSettings(...args),
  testMessagingConnection: (...args: any[]) => mockTestMessagingConnection(...args),
}));

// ── Mock contexts ──────────────────────────────────────────
const mockUsePlatformData = vi.fn();
const mockUseAuth = vi.fn();

vi.mock('@/app/context/PlatformDataContext', () => ({
  usePlatformData: () => mockUsePlatformData(),
}));

vi.mock('@/app/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// ── Import after mocks ────────────────────────────────────
import { AdminMessagingSettingsPage } from '../AdminMessagingSettingsPage';
import { render } from '@testing-library/react';

// ── Mock data ──────────────────────────────────────────────

function createMockTelegramSettings(overrides?: Partial<MessagingSettingsData>): MessagingSettingsData {
  return {
    is_enabled: false,
    settings: {
      bot_username: '@test_bot',
      has_bot_token: false,
      has_webhook_secret: false,
    } as TelegramSettingsResponse,
    ...overrides,
  };
}

function createMockWhatsappSettings(overrides?: Partial<MessagingSettingsData>): MessagingSettingsData {
  return {
    is_enabled: false,
    settings: {
      phone_number_id: '123456789',
      business_account_id: '987654321',
      has_access_token: false,
      has_app_secret: false,
      has_verify_token: false,
    } as WhatsAppSettingsResponse,
    ...overrides,
  };
}

// ── Test suite ─────────────────────────────────────────────

describe('AdminMessagingSettingsPage', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockUsePlatformData.mockReturnValue({
      institutionId: 'inst-1',
    });
    mockUseAuth.mockReturnValue({
      user: { id: 'admin-1', email: 'admin@test.com' },
      role: 'admin',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    mockToast.mockClear();
  });

  // ── Rendering & Loading Tests ────────────────────────

  it('renders without crashing with admin role', async () => {
    mockGetMessagingSettings.mockResolvedValue(createMockTelegramSettings());

    render(<AdminMessagingSettingsPage />);
    await waitFor(() => {
      expect(screen.getByText('Integraciones de Mensajería')).toBeInTheDocument();
    });
  });

  it('displays page header with title and subtitle', async () => {
    mockGetMessagingSettings.mockResolvedValue(createMockTelegramSettings());

    render(<AdminMessagingSettingsPage />);
    await waitFor(() => {
      expect(screen.getByText('Integraciones de Mensajería')).toBeInTheDocument();
      expect(
        screen.getByText(/Configura los bots de Telegram y WhatsApp/)
      ).toBeInTheDocument();
    });
  });

  it('shows loading skeleton while fetching settings', async () => {
    mockGetMessagingSettings.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(createMockTelegramSettings()), 100))
    );

    render(<AdminMessagingSettingsPage />);
    const skeletons = screen.queryAllByTestId('skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  // ── Channel Card Tests ─────────────────────────────────

  it('displays Telegram channel card', async () => {
    mockGetMessagingSettings.mockResolvedValue(createMockTelegramSettings());

    render(<AdminMessagingSettingsPage />);
    await waitFor(() => {
      expect(screen.getByText('Telegram Bot')).toBeInTheDocument();
    });
  });

  it('displays WhatsApp channel card', async () => {
    mockGetMessagingSettings.mockResolvedValue(createMockTelegramSettings());

    render(<AdminMessagingSettingsPage />);
    await waitFor(() => {
      expect(screen.getByText('WhatsApp Business')).toBeInTheDocument();
    });
  });

  it('shows Telegram description', async () => {
    mockGetMessagingSettings.mockResolvedValue(createMockTelegramSettings());

    render(<AdminMessagingSettingsPage />);
    await waitFor(() => {
      expect(
        screen.getByText(/Conecta un bot de Telegram/)
      ).toBeInTheDocument();
    });
  });

  it('shows WhatsApp description', async () => {
    mockGetMessagingSettings.mockResolvedValue(createMockTelegramSettings());

    render(<AdminMessagingSettingsPage />);
    await waitFor(() => {
      expect(
        screen.getByText(/Integra WhatsApp Business API/)
      ).toBeInTheDocument();
    });
  });

  // ── Telegram Configuration Tests ───────────────────────

  it('displays Telegram token input field', async () => {
    mockGetMessagingSettings.mockResolvedValue(createMockTelegramSettings());

    render(<AdminMessagingSettingsPage />);
    await waitFor(() => {
      const tokenInputs = screen.getAllByPlaceholderText(/Bot/i);
      expect(tokenInputs.length).toBeGreaterThan(0);
    });
  });

  it('displays Telegram username input field', async () => {
    mockGetMessagingSettings.mockResolvedValue(createMockTelegramSettings());

    render(<AdminMessagingSettingsPage />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/@mi_bot/i)).toBeInTheDocument();
    });
  });

  it('displays Telegram webhook secret field', async () => {
    mockGetMessagingSettings.mockResolvedValue(createMockTelegramSettings());

    render(<AdminMessagingSettingsPage />);
    await waitFor(() => {
      const labels = screen.getAllByText(/Webhook/);
      expect(labels.length).toBeGreaterThan(0);
    });
  });

  // ── WhatsApp Configuration Tests ────────────────────────

  it('displays WhatsApp phone number ID field', async () => {
    mockGetMessagingSettings
      .mockResolvedValueOnce(createMockTelegramSettings())
      .mockResolvedValueOnce(createMockWhatsappSettings());

    render(<AdminMessagingSettingsPage />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/123456789012345/)).toBeInTheDocument();
    });
  });

  it('displays WhatsApp business account ID field', async () => {
    mockGetMessagingSettings
      .mockResolvedValueOnce(createMockTelegramSettings())
      .mockResolvedValueOnce(createMockWhatsappSettings());

    render(<AdminMessagingSettingsPage />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/987654321012345/)).toBeInTheDocument();
    });
  });

  it('displays WhatsApp access token field', async () => {
    mockGetMessagingSettings
      .mockResolvedValueOnce(createMockTelegramSettings())
      .mockResolvedValueOnce(createMockWhatsappSettings());

    render(<AdminMessagingSettingsPage />);
    await waitFor(() => {
      const labels = screen.getAllByText(/Access Token/);
      expect(labels.length).toBeGreaterThan(0);
    });
  });

  it('displays WhatsApp app secret field', async () => {
    mockGetMessagingSettings
      .mockResolvedValueOnce(createMockTelegramSettings())
      .mockResolvedValueOnce(createMockWhatsappSettings());

    render(<AdminMessagingSettingsPage />);
    await waitFor(() => {
      const labels = screen.getAllByText(/App Secret/);
      expect(labels.length).toBeGreaterThan(0);
    });
  });

  it('displays WhatsApp verify token field', async () => {
    mockGetMessagingSettings
      .mockResolvedValueOnce(createMockTelegramSettings())
      .mockResolvedValueOnce(createMockWhatsappSettings());

    render(<AdminMessagingSettingsPage />);
    await waitFor(() => {
      const labels = screen.getAllByText(/Verify Token/);
      expect(labels.length).toBeGreaterThan(0);
    });
  });

  // ── Toggle/Enable Tests ────────────────────────────────

  it('displays enable/disable toggle for each channel', async () => {
    mockGetMessagingSettings.mockResolvedValue(createMockTelegramSettings());

    render(<AdminMessagingSettingsPage />);
    await waitFor(() => {
      const switches = screen.getAllByTestId('switch');
      expect(switches.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('shows configuration status badges', async () => {
    mockGetMessagingSettings.mockResolvedValue(createMockTelegramSettings());

    render(<AdminMessagingSettingsPage />);
    await waitFor(() => {
      const badges = screen.getAllByText('Sin configurar');
      expect(badges.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('shows "Configurado" badge when credentials exist', async () => {
    mockGetMessagingSettings.mockResolvedValue(
      createMockTelegramSettings({
        settings: {
          ...createMockTelegramSettings().settings,
          has_bot_token: true,
        } as TelegramSettingsResponse,
      })
    );

    render(<AdminMessagingSettingsPage />);
    await waitFor(() => {
      expect(screen.getByText('Configurado')).toBeInTheDocument();
    });
  });

  // ── Save Button Tests ──────────────────────────────────

  it('displays save button for each channel', async () => {
    mockGetMessagingSettings.mockResolvedValue(createMockTelegramSettings());

    render(<AdminMessagingSettingsPage />);
    await waitFor(() => {
      const saveButtons = screen.getAllByText('Guardar');
      expect(saveButtons.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('displays test connection button for each channel', async () => {
    mockGetMessagingSettings.mockResolvedValue(createMockTelegramSettings());

    render(<AdminMessagingSettingsPage />);
    await waitFor(() => {
      const testButtons = screen.getAllByText(/Probar conexión/);
      expect(testButtons.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ── Error State Tests ──────────────────────────────────

  it('displays error state when API call fails', async () => {
    mockGetMessagingSettings.mockRejectedValue(new Error('Failed to load settings'));

    render(<AdminMessagingSettingsPage />);
    await waitFor(() => {
      expect(screen.getByText('Error al cargar')).toBeInTheDocument();
      expect(screen.getByText('Failed to load settings')).toBeInTheDocument();
    });
  });

  it('shows retry button in error state', async () => {
    mockGetMessagingSettings.mockRejectedValue(new Error('Connection failed'));

    render(<AdminMessagingSettingsPage />);
    await waitFor(() => {
      expect(screen.getByText('Reintentar')).toBeInTheDocument();
    });
  });

  // ── Info Banner Tests ──────────────────────────────────

  it('displays information banner for getting tokens', async () => {
    mockGetMessagingSettings.mockResolvedValue(createMockTelegramSettings());

    render(<AdminMessagingSettingsPage />);
    await waitFor(() => {
      expect(screen.getByText('Cómo obtener los tokens')).toBeInTheDocument();
    });
  });

  it('shows Telegram token instruction in banner', async () => {
    mockGetMessagingSettings.mockResolvedValue(createMockTelegramSettings());

    render(<AdminMessagingSettingsPage />);
    await waitFor(() => {
      expect(screen.getByText(/@BotFather/)).toBeInTheDocument();
    });
  });

  it('shows WhatsApp token instruction in banner', async () => {
    mockGetMessagingSettings.mockResolvedValue(createMockTelegramSettings());

    render(<AdminMessagingSettingsPage />);
    await waitFor(() => {
      expect(screen.getByText(/developers.facebook.com/)).toBeInTheDocument();
    });
  });

  // ── Fetch Calls Tests ──────────────────────────────────

  it('fetches both Telegram and WhatsApp settings on mount', async () => {
    mockGetMessagingSettings.mockResolvedValue(createMockTelegramSettings());

    render(<AdminMessagingSettingsPage />);
    await waitFor(() => {
      expect(mockGetMessagingSettings).toHaveBeenCalledWith('telegram');
      expect(mockGetMessagingSettings).toHaveBeenCalledWith('whatsapp');
    });
  });

  it('requires institutionId to fetch settings', async () => {
    mockUsePlatformData.mockReturnValue({ institutionId: null });
    mockGetMessagingSettings.mockResolvedValue(createMockTelegramSettings());

    render(<AdminMessagingSettingsPage />);
    await waitFor(() => {
      // Should not call API if institutionId is missing
      expect(mockGetMessagingSettings).not.toHaveBeenCalled();
    });
  });

  // ── Hidden Input Tests ────────────────────────────────

  it('shows masked placeholder for saved tokens', async () => {
    mockGetMessagingSettings.mockResolvedValue(
      createMockTelegramSettings({
        settings: {
          ...createMockTelegramSettings().settings,
          has_bot_token: true,
        } as TelegramSettingsResponse,
      })
    );

    render(<AdminMessagingSettingsPage />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/••••••••/i)).toBeInTheDocument();
    });
  });

  // ── Multiple Calls Test ────────────────────────────────

  it('handles multiple channels loading concurrently', async () => {
    const telegramPromise = Promise.resolve(createMockTelegramSettings());
    const whatsappPromise = Promise.resolve(createMockWhatsappSettings());

    mockGetMessagingSettings
      .mockResolvedValueOnce(telegramPromise)
      .mockResolvedValueOnce(whatsappPromise);

    render(<AdminMessagingSettingsPage />);
    await waitFor(() => {
      expect(screen.getByText('Telegram Bot')).toBeInTheDocument();
      expect(screen.getByText('WhatsApp Business')).toBeInTheDocument();
    });
  });
});
