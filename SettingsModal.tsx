import React, { useState, useEffect } from 'react';
import { X, Bot, Radio, Smartphone, Check, ShieldCheck, RefreshCw, Key, MessageSquare, AlertCircle } from 'lucide-react';
import { TelegramSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: TelegramSettings | null;
  onSaveSettings: (newSettings: Partial<TelegramSettings>) => Promise<void>;
  onTestConnection: (token: string, channel: string) => Promise<any>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onTestConnection
}) => {
  const [activeTab, setActiveTab] = useState<'bot' | 'mtproto' | 'sync'>('bot');
  const [botToken, setBotToken] = useState('');
  const [channelId, setChannelId] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [syncInterval, setSyncInterval] = useState(15);
  const [autoSync, setAutoSync] = useState(true);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setBotToken(settings.botToken || '');
      setChannelId(settings.channelId || '');
      setPhone(settings.phone || '');
      setSyncInterval(settings.syncIntervalMinutes || 15);
      setAutoSync(settings.autoSyncEnabled ?? true);
    }
  }, [settings]);

  if (!isOpen) return null;

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await onTestConnection(botToken, channelId);
      setTestResult({
        success: true,
        message: `Connected! Bot: @${res.bot.username}. Channel verified.`
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        error: err.message || 'Failed to connect to Telegram'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveSettings({
        botToken,
        channelId,
        phone,
        syncIntervalMinutes: syncInterval,
        autoSyncEnabled: autoSync
      });
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleSendPhoneCode = async () => {
    if (!phone) return;
    try {
      await fetch('/api/telegram/mtproto/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      setIsCodeSent(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleVerifyPhoneCode = async () => {
    try {
      await fetch('/api/telegram/mtproto/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: phoneCode })
      });
      alert('MTProto Login verified! Session active.');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md select-none">
      <div className="w-full max-w-lg glass-panel rounded-3xl p-6 border border-white/10 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Telegram Server Setup</h3>
              <p className="text-xs text-slate-400">Configure Storage Channel & Credentials</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex p-1 rounded-2xl bg-white/5 border border-white/10">
          <button
            onClick={() => setActiveTab('bot')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'bot' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>Bot API</span>
          </button>
          <button
            onClick={() => setActiveTab('mtproto')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'mtproto' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>MTProto Login</span>
          </button>
          <button
            onClick={() => setActiveTab('sync')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'sync' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>Auto Sync</span>
          </button>
        </div>

        {/* Tab 1: Bot API */}
        {activeTab === 'bot' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">
                Telegram Bot Token
              </label>
              <input
                type="password"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">Get token from @BotFather on Telegram</p>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">
                Private Channel ID or Username
              </label>
              <input
                type="text"
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                placeholder="@my_private_storage or -100123456789"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">Add your bot as Administrator in this channel</p>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  testResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}
              >
                {testResult.success ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{testResult.message || testResult.error}</span>
              </div>
            )}

            <button
              onClick={handleTest}
              disabled={testing}
              className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Radio className="w-3.5 h-3.5 text-blue-400" />}
              <span>Test Telegram Connection</span>
            </button>
          </div>
        )}

        {/* Tab 2: MTProto Login */}
        {activeTab === 'mtproto' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">
                Telegram Account Phone Number
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1234567890"
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={handleSendPhoneCode}
                  className="px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium"
                >
                  Send Code
                </button>
              </div>
            </div>

            {isCodeSent && (
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">
                  Verification Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={phoneCode}
                    onChange={(e) => setPhoneCode(e.target.value)}
                    placeholder="12345"
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={handleVerifyPhoneCode}
                    className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium"
                  >
                    Verify
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Auto Sync Schedule */}
        {activeTab === 'sync' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/10">
              <div>
                <h4 className="text-xs font-semibold text-white">Enable Automatic Sync</h4>
                <p className="text-[11px] text-slate-400">Background scan for new Telegram uploads</p>
              </div>
              <input
                type="checkbox"
                checked={autoSync}
                onChange={(e) => setAutoSync(e.target.checked)}
                className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">
                Sync Interval
              </label>
              <select
                value={syncInterval}
                onChange={(e) => setSyncInterval(Number(e.target.value))}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value={5}>Every 5 minutes</option>
                <option value={15}>Every 15 minutes</option>
                <option value={30}>Every 30 minutes</option>
                <option value={60}>Every 1 hour</option>
              </select>
            </div>
          </div>
        )}

        {/* Save & Close Actions */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
};
