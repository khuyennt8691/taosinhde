import React, { useState, useEffect } from 'react';
import { Key, Save, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';

interface SettingsPanelProps {
    onApiKeyChange?: (key: string) => void;
}

const STORAGE_KEY = 'physigenius_api_key';

const SettingsPanel: React.FC<SettingsPanelProps> = ({ onApiKeyChange }) => {
    const [apiKey, setApiKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [saved, setSaved] = useState(false);
    const [hasExistingKey, setHasExistingKey] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            setApiKey(stored);
            setHasExistingKey(true);
        }
    }, []);

    const handleSave = () => {
        if (apiKey.trim()) {
            localStorage.setItem(STORAGE_KEY, apiKey.trim());
            // Update environment for current session
            (window as any).__GEMINI_API_KEY__ = apiKey.trim();
            setHasExistingKey(true);
            setSaved(true);
            onApiKeyChange?.(apiKey.trim());
            setTimeout(() => setSaved(false), 2000);
        }
    };

    const handleClear = () => {
        localStorage.removeItem(STORAGE_KEY);
        delete (window as any).__GEMINI_API_KEY__;
        setApiKey('');
        setHasExistingKey(false);
        onApiKeyChange?.('');
    };

    return (
        <div className="space-y-6">
            {/* API Key Section */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Key size={20} className="text-primary" />
                    Gemini API Key
                </h3>

                <div className="space-y-4">
                    <p className="text-sm text-slate-500">
                        Nhập API key từ Google AI Studio để sử dụng tính năng AI.
                        <a
                            href="https://aistudio.google.com/apikey"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline ml-1"
                        >
                            Lấy API key tại đây →
                        </a>
                    </p>

                    <div className="relative">
                        <input
                            type={showKey ? 'text' : 'password'}
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="AIza..."
                            className="w-full px-4 py-3 pr-12 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-sm font-mono"
                        />
                        <button
                            onClick={() => setShowKey(!showKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={handleSave}
                            disabled={!apiKey.trim()}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white font-medium hover:opacity-90 transition-all disabled:opacity-50"
                        >
                            {saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
                            {saved ? 'Đã lưu!' : 'Lưu API Key'}
                        </button>

                        {hasExistingKey && (
                            <button
                                onClick={handleClear}
                                className="px-4 py-2 rounded-lg border border-red-200 text-red-600 font-medium hover:bg-red-50 transition-all"
                            >
                                Xóa
                            </button>
                        )}
                    </div>

                    {hasExistingKey && !saved && (
                        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                            <CheckCircle2 size={16} />
                            API key đã được lưu
                        </div>
                    )}
                </div>
            </section>

            {/* Info Section */}
            <section className="bg-blue-50 rounded-2xl p-6">
                <div className="flex gap-3">
                    <AlertCircle className="text-blue-500 flex-shrink-0" size={20} />
                    <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">Lưu ý bảo mật</p>
                        <p className="text-blue-600">
                            API key được lưu trong localStorage của trình duyệt.
                            Không chia sẻ API key với người khác.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default SettingsPanel;
