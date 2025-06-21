import React, { useState } from 'react';
import { Settings, Bell, Mail, MessageSquare, Save, TestTube } from 'lucide-react';

interface NotificationSettings {
  email: {
    enabled: boolean;
    address: string;
    signals: boolean;
    trades: boolean;
    alerts: boolean;
  };
  telegram: {
    enabled: boolean;
    botToken: string;
    chatId: string;
    signals: boolean;
    trades: boolean;
    alerts: boolean;
  };
  webhook: {
    enabled: boolean;
    url: string;
    signals: boolean;
    trades: boolean;
    alerts: boolean;
  };
  sound: {
    enabled: boolean;
    volume: number;
  };
}

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: NotificationSettings) => void;
  initialSettings?: NotificationSettings;
}

const defaultSettings: NotificationSettings = {
  email: {
    enabled: false,
    address: '',
    signals: true,
    trades: true,
    alerts: true,
  },
  telegram: {
    enabled: false,
    botToken: '',
    chatId: '',
    signals: true,
    trades: true,
    alerts: true,
  },
  webhook: {
    enabled: false,
    url: '',
    signals: true,
    trades: true,
    alerts: true,
  },
  sound: {
    enabled: true,
    volume: 50,
  },
};

export function SettingsPanel({ isOpen, onClose, onSave, initialSettings }: SettingsPanelProps) {
  const [settings, setSettings] = useState<NotificationSettings>(initialSettings || defaultSettings);
  const [testStatus, setTestStatus] = useState<{ [key: string]: 'idle' | 'testing' | 'success' | 'error' }>({});

  if (!isOpen) return null;

  const updateEmailSettings = (field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      email: { ...prev.email, [field]: value }
    }));
  };

  const updateTelegramSettings = (field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      telegram: { ...prev.telegram, [field]: value }
    }));
  };

  const updateWebhookSettings = (field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      webhook: { ...prev.webhook, [field]: value }
    }));
  };

  const updateSoundSettings = (field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      sound: { ...prev.sound, [field]: value }
    }));
  };

  const testNotification = async (type: 'email' | 'telegram' | 'webhook') => {
    setTestStatus(prev => ({ ...prev, [type]: 'testing' }));
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In a real implementation, you would make actual API calls here
      const success = Math.random() > 0.3; // 70% success rate for demo
      
      setTestStatus(prev => ({ ...prev, [type]: success ? 'success' : 'error' }));
      
      setTimeout(() => {
        setTestStatus(prev => ({ ...prev, [type]: 'idle' }));
      }, 3000);
    } catch (error) {
      setTestStatus(prev => ({ ...prev, [type]: 'error' }));
      setTimeout(() => {
        setTestStatus(prev => ({ ...prev, [type]: 'idle' }));
      }, 3000);
    }
  };

  const handleSave = () => {
    onSave(settings);
    onClose();
  };

  const getTestButtonText = (type: string) => {
    const status = testStatus[type];
    switch (status) {
      case 'testing': return 'Testing...';
      case 'success': return 'Success!';
      case 'error': return 'Failed';
      default: return 'Test';
    }
  };

  const getTestButtonColor = (type: string) => {
    const status = testStatus[type];
    switch (status) {
      case 'testing': return 'bg-yellow-600 hover:bg-yellow-700';
      case 'success': return 'bg-green-600 hover:bg-green-700';
      case 'error': return 'bg-red-600 hover:bg-red-700';
      default: return 'bg-blue-600 hover:bg-blue-700';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Settings className="text-blue-400 mr-2" size={24} />
            <h2 className="text-xl font-bold text-white">Notification Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* Email Notifications */}
          <div className="bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Mail className="text-blue-400 mr-2" size={20} />
                <h3 className="text-white font-medium">Email Notifications</h3>
              </div>
              <div className="flex items-center space-x-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.email.enabled}
                    onChange={(e) => updateEmailSettings('enabled', e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-white text-sm">Enabled</span>
                </label>
              </div>
            </div>

            {settings.email.enabled && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Email Address</label>
                  <div className="flex space-x-2">
                    <input
                      type="email"
                      value={settings.email.address}
                      onChange={(e) => updateEmailSettings('address', e.target.value)}
                      placeholder="your@email.com"
                      className="flex-1 bg-gray-700 text-white rounded px-3 py-2 border border-gray-500"
                    />
                    <button
                      onClick={() => testNotification('email')}
                      disabled={!settings.email.address || testStatus.email === 'testing'}
                      className={`flex items-center px-3 py-2 rounded text-white transition-colors ${getTestButtonColor('email')} disabled:opacity-50`}
                    >
                      <TestTube size={16} className="mr-1" />
                      {getTestButtonText('email')}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.email.signals}
                      onChange={(e) => updateEmailSettings('signals', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-white text-sm">Trading Signals</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.email.trades}
                      onChange={(e) => updateEmailSettings('trades', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-white text-sm">Trade Execution</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.email.alerts}
                      onChange={(e) => updateEmailSettings('alerts', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-white text-sm">Risk Alerts</span>
                  </label>
                </div>
              </div>
            )}
          </div>
          
          {/* Telegram Notifications */}
          <div className="bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <MessageSquare className="text-blue-400 mr-2" size={20} />
                <h3 className="text-white font-medium">Telegram Notifications</h3>
              </div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.telegram.enabled}
                  onChange={(e) => updateTelegramSettings('enabled', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-white text-sm">Enabled</span>
              </label>
            </div>

            {settings.telegram.enabled && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Bot Token</label>
                    <input
                      type="password"
                      value={settings.telegram.botToken}
                      onChange={(e) => updateTelegramSettings('botToken', e.target.value)}
                      placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                      className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Chat ID</label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={settings.telegram.chatId}
                        onChange={(e) => updateTelegramSettings('chatId', e.target.value)}
                        placeholder="-1001234567890"
                        className="flex-1 bg-gray-700 text-white rounded px-3 py-2 border border-gray-500"
                      />
                      <button
                        onClick={() => testNotification('telegram')}
                        disabled={!settings.telegram.botToken || !settings.telegram.chatId || testStatus.telegram === 'testing'}
                        className={`flex items-center px-3 py-2 rounded text-white transition-colors ${getTestButtonColor('telegram')} disabled:opacity-50`}
                      >
                        <TestTube size={16} className="mr-1" />
                        {getTestButtonText('telegram')}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.telegram.signals}
                      onChange={(e) => updateTelegramSettings('signals', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-white text-sm">Trading Signals</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.telegram.trades}
                      onChange={(e) => updateTelegramSettings('trades', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-white text-sm">Trade Execution</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.telegram.alerts}
                      onChange={(e) => updateTelegramSettings('alerts', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-white text-sm">Risk Alerts</span>
                  </label>
                </div>
              </div>
            )}
          </div>
          
          {/* Webhook Notifications */}
          <div className="bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Bell className="text-blue-400 mr-2" size={20} />
                <h3 className="text-white font-medium">Webhook Notifications</h3>
              </div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.webhook.enabled}
                  onChange={(e) => updateWebhookSettings('enabled', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-white text-sm">Enabled</span>
              </label>
            </div>

            {settings.webhook.enabled && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Webhook URL</label>
                  <div className="flex space-x-2">
                    <input
                      type="url"
                      value={settings.webhook.url}
                      onChange={(e) => updateWebhookSettings('url', e.target.value)}
                      placeholder="https://your-webhook-url.com/endpoint"
                      className="flex-1 bg-gray-700 text-white rounded px-3 py-2 border border-gray-500"
                    />
                    <button
                      onClick={() => testNotification('webhook')}
                      disabled={!settings.webhook.url || testStatus.webhook === 'testing'}
                      className={`flex items-center px-3 py-2 rounded text-white transition-colors ${getTestButtonColor('webhook')} disabled:opacity-50`}
                    >
                      <TestTube size={16} className="mr-1" />
                      {getTestButtonText('webhook')}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.webhook.signals}
                      onChange={(e) => updateWebhookSettings('signals', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-white text-sm">Trading Signals</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.webhook.trades}
                      onChange={(e) => updateWebhookSettings('trades', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-white text-sm">Trade Execution</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.webhook.alerts}
                      onChange={(e) => updateWebhookSettings('alerts', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-white text-sm">Risk Alerts</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Sound Notifications */}
          <div className="bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Bell className="text-blue-400 mr-2" size={20} />
                <h3 className="text-white font-medium">Sound Notifications</h3>
              </div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.sound.enabled}
                  onChange={(e) => updateSoundSettings('enabled', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-white text-sm">Enabled</span>
              </label>
            </div>

            {settings.sound.enabled && (
              <div>
                <label className="block text-sm text-gray-300 mb-1">Volume</label>
                <div className="flex items-center space-x-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.sound.volume}
                    onChange={(e) => updateSoundSettings('volume', parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-white text-sm w-12">{settings.sound.volume}%</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
          >
            <Save size={16} className="mr-2" />
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}