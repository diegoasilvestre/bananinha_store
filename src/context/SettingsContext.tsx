import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';

export interface StoreSettings {
  store_name: string;
  store_tagline: string;
  hero_title: string;
  hero_subtitle: string;
  whatsapp_number: string;
  instagram_url: string;
  free_shipping_min: number;
  announcement_bar: string;
  quiz_enabled: boolean;
  size_guide_url: string;
}

const defaultSettings: StoreSettings = {
  store_name: 'Bananinha Store',
  store_tagline: 'As melhores camisetas do Brasil',
  hero_title: 'O MANTO DO SEU TIME COM O ACABAMENTO PREMIUM',
  hero_subtitle: 'Vista a paixão pelo futebol com camisas oficiais selecionadas. Tecido tecnológico respirável, costuras reforçadas e escudos bordados de alta precisão.',
  whatsapp_number: '5511999999999',
  instagram_url: '',
  free_shipping_min: 299,
  announcement_bar: 'FRETE GRÁTIS EM COMPRAS ACIMA DE R$ 299! APROVEITE.',
  quiz_enabled: true,
  size_guide_url: '',
};

interface SettingsContextType {
  settings: StoreSettings;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<StoreSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('*');

      if (error) {
        console.error('Error fetching settings:', error.message);
        return;
      }

      if (data && data.length > 0) {
        const mappedSettings = { ...defaultSettings };
        data.forEach((item: { key: string; value: string }) => {
          const key = item.key as keyof StoreSettings;
          if (key in mappedSettings) {
            if (key === 'free_shipping_min') {
              mappedSettings[key] = Number(item.value) || 299;
            } else if (key === 'quiz_enabled') {
              mappedSettings[key] = item.value === 'true';
            } else {
              (mappedSettings[key] as string) = item.value;
            }
          }
        });
        setSettings(mappedSettings);
      }
    } catch (err) {
      console.error('Unexpected error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return (
    <SettingsContext.Provider value={{ settings, loading, refreshSettings: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
