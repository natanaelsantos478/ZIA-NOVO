// ─────────────────────────────────────────────────────────────────────────────
// Configurações de Aparência
// ─────────────────────────────────────────────────────────────────────────────
import { Sun, Moon, Monitor, RotateCcw, Sparkles, ZapOff, Zap } from 'lucide-react';
import {
  useTheme,
  ACCENT_COLORS,
  type ColorScheme,
  type AccentColor,
  type BorderRadius,
  type GlowLevel,
} from '../../../context/ThemeContext';

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">{children}</h3>
  );
}

function OptionCard({
  active, onClick, children, className = '',
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 text-xs font-medium transition-all
        ${active
          ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'}
        ${className}
      `}
    >
      {active && (
        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500" />
      )}
      {children}
    </button>
  );
}

// ── Seletores de Tema ─────────────────────────────────────────────────────────

function ColorSchemeSelector() {
  const { settings, update } = useTheme();

  const options: { value: ColorScheme; label: string; icon: React.ReactNode }[] = [
    { value: 'light',  label: 'Claro',   icon: <Sun  className="w-5 h-5" /> },
    { value: 'dark',   label: 'Escuro',  icon: <Moon className="w-5 h-5" /> },
    { value: 'system', label: 'Sistema', icon: <Monitor className="w-5 h-5" /> },
  ];

  return (
    <div>
      <SectionTitle>Modo de Cor</SectionTitle>
      <div className="grid grid-cols-3 gap-3">
        {options.map(o => (
          <OptionCard
            key={o.value}
            active={settings.colorScheme === o.value}
            onClick={() => update({ colorScheme: o.value })}
          >
            {o.icon}
            {o.label}
          </OptionCard>
        ))}
      </div>
    </div>
  );
}

function AccentColorSelector() {
  const { settings, update } = useTheme();

  return (
    <div>
      <SectionTitle>Cor de Destaque</SectionTitle>
      <div className="flex flex-wrap gap-2.5">
        {(Object.entries(ACCENT_COLORS) as [AccentColor, typeof ACCENT_COLORS[AccentColor]][]).map(
          ([key, color]) => (
            <button
              key={key}
              title={color.label}
              onClick={() => update({ accentColor: key })}
              className={`
                w-9 h-9 rounded-full transition-all flex items-center justify-center
                ${settings.accentColor === key ? 'ring-2 ring-offset-2 ring-current scale-110' : 'hover:scale-105'}
              `}
              style={{ backgroundColor: color.hex, color: color.hex }}
            >
              {settings.accentColor === key && (
                <span className="w-3 h-3 rounded-full bg-white/80" />
              )}
            </button>
          )
        )}
      </div>
      <p className="text-xs text-slate-400 mt-2">
        Selecionado: <strong className="text-slate-600">{ACCENT_COLORS[settings.accentColor].label}</strong>
      </p>
    </div>
  );
}

function BorderRadiusSelector() {
  const { settings, update } = useTheme();

  const options: { value: BorderRadius; label: string; preview: string }[] = [
    { value: 'sharp',   label: 'Reto',        preview: 'rounded-sm'   },
    { value: 'default', label: 'Padrão',       preview: 'rounded-lg'   },
    { value: 'rounded', label: 'Arredondado',  preview: 'rounded-2xl'  },
    { value: 'pill',    label: 'Pílula',       preview: 'rounded-full' },
  ];

  return (
    <div>
      <SectionTitle>Estilo de Borda</SectionTitle>
      <div className="grid grid-cols-4 gap-3">
        {options.map(o => (
          <OptionCard
            key={o.value}
            active={settings.borderRadius === o.value}
            onClick={() => update({ borderRadius: o.value })}
          >
            <div
              className={`w-8 h-8 bg-indigo-200 border-2 border-indigo-400 ${o.preview}`}
            />
            <span>{o.label}</span>
          </OptionCard>
        ))}
      </div>
    </div>
  );
}

function GlowSelector() {
  const { settings, update } = useTheme();

  const options: { value: GlowLevel; label: string; icon: React.ReactNode; desc: string }[] = [
    { value: 'none',   label: 'Sem Brilho', icon: <ZapOff className="w-4 h-4" />, desc: 'Visual limpo' },
    { value: 'subtle', label: 'Sutil',      icon: <Zap    className="w-4 h-4" />, desc: 'Leve luminescência' },
    { value: 'vivid',  label: 'Intenso',    icon: <Sparkles className="w-4 h-4" />, desc: 'Brilho pronunciado' },
  ];

  return (
    <div>
      <SectionTitle>Efeito de Brilho (Glow)</SectionTitle>
      <div className="grid grid-cols-3 gap-3">
        {options.map(o => (
          <OptionCard
            key={o.value}
            active={settings.glowLevel === o.value}
            onClick={() => update({ glowLevel: o.value })}
          >
            {o.icon}
            <span>{o.label}</span>
            <span className="text-[10px] text-slate-400 font-normal">{o.desc}</span>
          </OptionCard>
        ))}
      </div>
    </div>
  );
}

function SidebarStyleSelector() {
  const { settings, update } = useTheme();

  const options: { value: 'default' | 'minimal' | 'bordered'; label: string; desc: string }[] = [
    { value: 'default',  label: 'Padrão',    desc: 'Com fundo colorido' },
    { value: 'minimal',  label: 'Minimalista', desc: 'Ícones apenas'    },
    { value: 'bordered', label: 'Com Borda',  desc: 'Separador lateral'  },
  ];

  return (
    <div>
      <SectionTitle>Estilo da Barra Lateral</SectionTitle>
      <div className="grid grid-cols-3 gap-3">
        {options.map(o => (
          <OptionCard
            key={o.value}
            active={settings.sidebarStyle === o.value}
            onClick={() => update({ sidebarStyle: o.value })}
          >
            <div className="w-8 h-10 rounded-md border border-slate-300 overflow-hidden flex">
              <div className={`w-2 h-full ${
                o.value === 'default'  ? 'bg-indigo-400' :
                o.value === 'bordered' ? 'bg-transparent border-r-2 border-slate-400' :
                'bg-slate-100'
              }`} />
              <div className="flex-1 bg-slate-50 flex flex-col justify-center gap-0.5 px-0.5">
                <div className="h-0.5 bg-slate-300 rounded" />
                <div className="h-0.5 bg-slate-300 rounded" />
                <div className="h-0.5 bg-slate-300 rounded" />
              </div>
            </div>
            <span>{o.label}</span>
            <span className="text-[10px] text-slate-400 font-normal">{o.desc}</span>
          </OptionCard>
        ))}
      </div>
    </div>
  );
}

function CompactModeToggle() {
  const { settings, update } = useTheme();

  return (
    <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl">
      <div>
        <p className="text-sm font-semibold text-slate-700">Modo Compacto</p>
        <p className="text-xs text-slate-400 mt-0.5">Reduz o espaçamento para mostrar mais conteúdo</p>
      </div>
      <button
        onClick={() => update({ compactMode: !settings.compactMode })}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          settings.compactMode ? 'bg-indigo-500' : 'bg-slate-200'
        }`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
          settings.compactMode ? 'translate-x-5' : 'translate-x-0'
        }`} />
      </button>
    </div>
  );
}

// ── Preview ────────────────────────────────────────────────────────────────────

function LivePreview() {
  const { settings, isDark } = useTheme();
  const accent = ACCENT_COLORS[settings.accentColor];

  const cardRadius =
    settings.borderRadius === 'sharp'   ? '4px'    :
    settings.borderRadius === 'default' ? '12px'   :
    settings.borderRadius === 'rounded' ? '20px'   : '9999px';

  const cardBg    = isDark ? 'rgb(30 41 59)'  : 'white';
  const cardText  = isDark ? 'rgb(241 245 249)' : 'rgb(15 23 42)';
  const cardSub   = isDark ? 'rgb(148 163 184)' : 'rgb(100 116 139)';
  const cardBorder= isDark ? 'rgb(51 65 85)'  : 'rgb(226 232 240)';
  const pageBg    = isDark ? 'rgb(15 23 42)'  : 'rgb(248 250 252)';

  const glowShadow =
    settings.glowLevel === 'subtle' ? `0 0 20px 0 ${accent.hex}30, 0 2px 8px 0 rgba(0,0,0,0.08)` :
    settings.glowLevel === 'vivid'  ? `0 0 32px 0 ${accent.hex}55, 0 2px 8px 0 rgba(0,0,0,0.12)` :
    '0 1px 4px 0 rgba(0,0,0,0.06)';

  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
        <span className="ml-2 text-xs text-slate-400 font-medium">Preview</span>
      </div>
      <div style={{ background: pageBg, padding: '16px' }}>
        <div
          style={{
            background: cardBg,
            borderRadius: cardRadius,
            border: `1px solid ${cardBorder}`,
            boxShadow: glowShadow,
            padding: '14px',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div
              style={{ width: 28, height: 28, borderRadius: cardRadius, background: accent.hex }}
              className="flex items-center justify-center shrink-0"
            />
            <div>
              <p style={{ color: cardText, fontWeight: 600, fontSize: 13, margin: 0 }}>Cartão de Exemplo</p>
              <p style={{ color: cardSub, fontSize: 11, margin: 0 }}>Visualização em tempo real</p>
            </div>
          </div>
          <div
            style={{
              background: accent.hex,
              borderRadius: cardRadius,
              padding: '6px 14px',
              display: 'inline-block',
              color: 'white',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            Botão de Ação
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function Appearance() {
  const { reset } = useTheme();

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Aparência</h1>
          <p className="text-sm text-slate-500 mt-0.5">Personalize a interface da plataforma</p>
        </div>
        <button
          onClick={() => { if (confirm('Restaurar todas as configurações de aparência?')) reset(); }}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-500 transition-colors px-3 py-1.5 border border-slate-200 hover:border-red-200 rounded-lg"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Restaurar padrão
        </button>
      </div>

      <div className="space-y-6">

        {/* Preview ao vivo */}
        <div>
          <SectionTitle>Preview em Tempo Real</SectionTitle>
          <LivePreview />
        </div>

        <div className="h-px bg-slate-100" />

        <ColorSchemeSelector />
        <AccentColorSelector />
        <BorderRadiusSelector />
        <GlowSelector />
        <CompactModeToggle />
        <SidebarStyleSelector />

      </div>
    </div>
  );
}
