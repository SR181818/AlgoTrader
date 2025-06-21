import React, { useState } from 'react';
import { Settings, Bell, Mail, MessageSquare, Save, TestTube, Shield, Database, Server, User } from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'notifications' | 'api' | 'account'>('general');
  const [theme, setTheme] = useState('dark');
  const [language, setLanguage] = useState('en');
  const [timeZone, setTimeZone] = useState('UTC');
  const [defaultSymbol, setDefaultSymbol] = useState('BTC/USDT');
  const [defaultTimeframe, setDefaultTimeframe] = useState('15m');
  
  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [telegramNotifications, setTelegramNotifications] = useState(false);
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [webhookNotifications, setWebhookNotifications] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [soundNotifications, setSoundNotifications] = useState(true);
  const [soundVolume, setSoundVolume] = useState(50);
  
  // API settings
  const [binanceApiKey, setBinanceApiKey] = useState('');
  const [binanceApiSecret, setBinanceApiSecret] = useState('');
  const [binanceTestnet, setBinanceTestnet] = useState(true);
  
  // Account settings
  const [username, setUsername] = useState('Trader');
  const [email, setEmail] = useState('');
  const [developerMode, setDeveloperMode] = useState(false);
  
  const handleSaveSettings = () => {
    // In a real app, this would save to localStorage or a backend
    alert('Settings saved successfully!');
  };
  
  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <button
          onClick={handleSaveSettings}
          className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
        >
          <Save size={16} className="mr-2" />
          Save Settings
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">Settings</h3>
            </div>
            <div className="p-2">
              <button
                onClick={() => setActiveTab('general')}
                className={`w-full flex items-center px-4 py-3 rounded-lg text-left ${
                  activeTab === 'general' 
                    ? 'bg-blue-600/20 text-blue-400' 
                    : 'text-gray-300 hover:bg-gray-700/50'
                }`}
              >
                <Settings size={18} className="mr-3" />
                General
              </button>
              
              <button
                onClick={() => setActiveTab('notifications')}
                className={`w-full flex items-center px-4 py-3 rounded-lg text-left ${
                  activeTab === 'notifications' 
                    ? 'bg-blue-600/20 text-blue-400' 
                    : 'text-gray-300 hover:bg-gray-700/50'
                }`}
              >
                <Bell size={18} className="mr-3" />
                Notifications
              </button>
              
              <button
                onClick={() => setActiveTab('api')}
                className={`w-full flex items-center px-4 py-3 rounded-lg text-left ${
                  activeTab === 'api' 
                    ? 'bg-blue-600/20 text-blue-400' 
                    : 'text-gray-300 hover:bg-gray-700/50'
                }`}
              >
                <Database size={18} className="mr-3" />
                API Connections
              </button>
              
              <button
                onClick={() => setActiveTab('account')}
                className={`w-full flex items-center px-4 py-3 rounded-lg text-left ${
                  activeTab === 'account' 
                    ? 'bg-blue-600/20 text-blue-400' 
                    : 'text-gray-300 hover:bg-gray-700/50'
                }`}
              >
                <User size={18} className="mr-3" />
                Account
              </button>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="lg:col-span-3">
          <div className="bg-gray-800 rounded-lg border border-gray-700">
            {/* General Settings */}
            {activeTab === 'general' && (
              <div className="p-6">
                <h2 className="text-xl font-semibold text-white mb-6">General Settings</h2>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Theme</label>
                    <select
                      value={theme}
                      onChange={(e) => setTheme(e.target.value)}
                      className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
                    >
                      <option value="dark">Dark</option>
                      <option value="light">Light</option>
                      <option value="system">System Default</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Language</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                      <option value="ja">Japanese</option>
                      <option value="zh">Chinese</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Time Zone</label>
                    <select
                      value={timeZone}
                      onChange={(e) => setTimeZone(e.target.value)}
                      className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
                    >
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern Time (ET)</option>
                      <option value="America/Chicago">Central Time (CT)</option>
                      <option value="America/Denver">Mountain Time (MT)</option>
                      <option value="America/Los_Angeles">Pacific Time (PT)</option>
                      <option value="Europe/London">London (GMT)</option>
                      <option value="Europe/Paris">Central European Time (CET)</option>
                      <option value="Asia/Tokyo">Japan (JST)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Default Symbol</label>
                    <select
                      value={defaultSymbol}
                      onChange={(e) => setDefaultSymbol(e.target.value)}
                      className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
                    >
                      <option value="BTC/USDT">BTC/USDT</option>
                      <option value="ETH/USDT">ETH/USDT</option>
                      <option value="ADA/USDT">ADA/USDT</option>
                      <option value="SOL/USDT">SOL/USDT</option>
                      <option value="DOT/USDT">DOT/USDT</option>
                      <option value="EUR/USD">EUR/USD</option>
                      <option value="GBP/USD">GBP/USD</option>
                      <option value="USD/JPY">USD/JPY</option>
                      <option value="XAU/USD">XAU/USD (Gold)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Default Timeframe</label>
                    <select
                      value={defaultTimeframe}
                      onChange={(e) => setDefaultTimeframe(e.target.value)}
                      className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
                    >
                      <option value="1m">1 Minute</option>
                      <option value="5m">5 Minutes</option>
                      <option value="15m">15 Minutes</option>
                      <option value="30m">30 Minutes</option>
                      <option value="1h">1 Hour</option>
                      <option value="4h">4 Hours</option>
                      <option value="1d">1 Day</option>
                    </select>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-700">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={developerMode}
                        onChange={(e) => setDeveloperMode(e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-white">Enable Developer Mode</span>
                    </label>
                    <p className="text-sm text-gray-400 mt-1">
                      Enables advanced features and debugging tools
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Notification Settings */}
            {activeTab === 'notifications' && (
              <div className="p-6">
                <h2 className="text-xl font-semibold text-white mb-6">Notification Settings</h2>
                
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
                            checked={emailNotifications}
                            onChange={(e) => setEmailNotifications(e.target.checked)}
                            className="mr-2"
                          />
                          <span className="text-white text-sm">Enabled</span>
                        </label>
                      </div>
                    </div>

                    {emailNotifications && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm text-gray-300 mb-1">Email Address</label>
                          <div className="flex space-x-2">
                            <input
                              type="email"
                              value={emailAddress}
                              onChange={(e) => setEmailAddress(e.target.value)}
                              placeholder="your@email.com"
                              className="flex-1 bg-gray-700 text-white rounded px-3 py-2 border border-gray-500"
                            />
                            <button
                              className="flex items-center px-3 py-2 rounded text-white transition-colors bg-blue-600 hover:bg-blue-700"
                            >
                              <TestTube size={16} className="mr-1" />
                              Test
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={true}
                              className="mr-2"
                            />
                            <span className="text-white text-sm">Trading Signals</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={true}
                              className="mr-2"
                            />
                            <span className="text-white text-sm">Trade Execution</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={true}
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
                          checked={telegramNotifications}
                          onChange={(e) => setTelegramNotifications(e.target.checked)}
                          className="mr-2"
                        />
                        <span className="text-white text-sm">Enabled</span>
                      </label>
                    </div>

                    {telegramNotifications && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm text-gray-300 mb-1">Bot Token</label>
                            <input
                              type="password"
                              value={telegramBotToken}
                              onChange={(e) => setTelegramBotToken(e.target.value)}
                              placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                              className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-500"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm text-gray-300 mb-1">Chat ID</label>
                            <div className="flex space-x-2">
                              <input
                                type="text"
                                value={telegramChatId}
                                onChange={(e) => setTelegramChatId(e.target.value)}
                                placeholder="-1001234567890"
                                className="flex-1 bg-gray-700 text-white rounded px-3 py-2 border border-gray-500"
                              />
                              <button
                                className="flex items-center px-3 py-2 rounded text-white transition-colors bg-blue-600 hover:bg-blue-700"
                              >
                                <TestTube size={16} className="mr-1" />
                                Test
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={true}
                              className="mr-2"
                            />
                            <span className="text-white text-sm">Trading Signals</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={true}
                              className="mr-2"
                            />
                            <span className="text-white text-sm">Trade Execution</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={true}
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
                          checked={webhookNotifications}
                          onChange={(e) => setWebhookNotifications(e.target.checked)}
                          className="mr-2"
                        />
                        <span className="text-white text-sm">Enabled</span>
                      </label>
                    </div>

                    {webhookNotifications && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm text-gray-300 mb-1">Webhook URL</label>
                          <div className="flex space-x-2">
                            <input
                              type="url"
                              value={webhookUrl}
                              onChange={(e) => setWebhookUrl(e.target.value)}
                              placeholder="https://your-webhook-url.com/endpoint"
                              className="flex-1 bg-gray-700 text-white rounded px-3 py-2 border border-gray-500"
                            />
                            <button
                              className="flex items-center px-3 py-2 rounded text-white transition-colors bg-blue-600 hover:bg-blue-700"
                            >
                              <TestTube size={16} className="mr-1" />
                              Test
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={true}
                              className="mr-2"
                            />
                            <span className="text-white text-sm">Trading Signals</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={true}
                              className="mr-2"
                            />
                            <span className="text-white text-sm">Trade Execution</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={true}
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
                          checked={soundNotifications}
                          onChange={(e) => setSoundNotifications(e.target.checked)}
                          className="mr-2"
                        />
                        <span className="text-white text-sm">Enabled</span>
                      </label>
                    </div>

                    {soundNotifications && (
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">Volume</label>
                        <div className="flex items-center space-x-3">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={soundVolume}
                            onChange={(e) => setSoundVolume(parseInt(e.target.value))}
                            className="flex-1"
                          />
                          <span className="text-white text-sm w-12">{soundVolume}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* API Connection Settings */}
            {activeTab === 'api' && (
              <div className="p-6">
                <h2 className="text-xl font-semibold text-white mb-6">API Connections</h2>
                
                <div className="space-y-6">
                  {/* Binance API */}
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <Server className="text-blue-400 mr-2" size={20} />
                        <h3 className="text-white font-medium">Binance API</h3>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-block w-3 h-3 rounded-full ${binanceApiKey ? 'bg-green-400' : 'bg-gray-500'}`}></span>
                        <span className="text-sm text-gray-300">{binanceApiKey ? 'Connected' : 'Not Connected'}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">API Key</label>
                        <input
                          type="password"
                          value={binanceApiKey}
                          onChange={(e) => setBinanceApiKey(e.target.value)}
                          placeholder="Enter your Binance API key"
                          className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">API Secret</label>
                        <input
                          type="password"
                          value={binanceApiSecret}
                          onChange={(e) => setBinanceApiSecret(e.target.value)}
                          placeholder="Enter your Binance API secret"
                          className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-500"
                        />
                      </div>
                      
                      <div>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={binanceTestnet}
                            onChange={(e) => setBinanceTestnet(e.target.checked)}
                            className="mr-2"
                          />
                          <span className="text-white">Use Testnet</span>
                        </label>
                        <p className="text-sm text-gray-400 mt-1">
                          Testnet is for testing only and does not use real funds
                        </p>
                      </div>
                      
                      <div className="flex justify-end">
                        <button
                          className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
                        >
                          <TestTube size={16} className="mr-2" />
                          Test Connection
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Add more API connections here */}
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <Shield className="text-blue-400 mr-2" size={20} />
                        <h3 className="text-white font-medium">API Security Settings</h3>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={true}
                          className="mr-2"
                        />
                        <span className="text-white">Encrypt API keys in local storage</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={true}
                          className="mr-2"
                        />
                        <span className="text-white">Require password to modify API settings</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={true}
                          className="mr-2"
                        />
                        <span className="text-white">Limit API permissions to read-only by default</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Account Settings */}
            {activeTab === 'account' && (
              <div className="p-6">
                <h2 className="text-xl font-semibold text-white mb-6">Account Settings</h2>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Username</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600"
                    />
                  </div>
                  
                  <div className="pt-4 border-t border-gray-700">
                    <button
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white transition-colors"
                    >
                      Reset All Settings
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}