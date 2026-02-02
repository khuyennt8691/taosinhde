
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Exam, Question, ExamMatrix, GenerationConfig, CognitiveLevel } from './types';
import { analyzeExam, generateVariant } from './services/geminiService';
import { exportToWord, exportToJson, downloadBlob } from './services/exportService';
import QuestionCard from './components/QuestionCard';
import SettingsPanel from './components/SettingsPanel';
import {
  Plus,
  FileText,
  LayoutDashboard,
  History,
  Settings,
  Upload,
  Sparkles,
  Download,
  ChevronRight,
  ChevronDown,
  Info,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'create' | 'dashboard' | 'history' | 'settings'>('create');
  const [loading, setLoading] = useState(false);
  const [examContent, setExamContent] = useState('');
  const [currentExam, setCurrentExam] = useState<Exam | null>(null);
  const [history, setHistory] = useState<Exam[]>([]);
  const [config, setConfig] = useState<GenerationConfig>({
    difficultyAdjustment: 'original',
    variantCount: 1,
    shuffleQuestions: true,
    shuffleOptions: true
  });
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Load history from local storage
  useEffect(() => {
    const saved = localStorage.getItem('physigenius_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  const saveToHistory = (exam: Exam) => {
    const updated = [exam, ...history].slice(0, 20); // Keep last 20
    setHistory(updated);
    localStorage.setItem('physigenius_history', JSON.stringify(updated));
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Export handlers
  const handleExportJson = () => {
    if (!currentExam) return;
    const blob = exportToJson(currentExam);
    const filename = `${currentExam.title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
    downloadBlob(blob, filename);
    showToast('Đã xuất file JSON thành công!');
    setShowExportMenu(false);
  };

  const handleExportWord = async () => {
    if (!currentExam) return;
    setLoading(true);
    try {
      const blob = await exportToWord(currentExam);
      const filename = `${currentExam.title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.docx`;
      downloadBlob(blob, filename);
      showToast('Đã xuất file Word thành công!');
    } catch (error) {
      console.error('Export Word error:', error);
      showToast('Lỗi khi xuất file Word!', 'error');
    } finally {
      setLoading(false);
      setShowExportMenu(false);
    }
  };

  // Calculate dynamic topic statistics from history
  const topicStats = useMemo(() => {
    const stats: Record<string, number> = {};
    let totalQuestions = 0;

    history.forEach(exam => {
      exam.questions.forEach(q => {
        stats[q.topic] = (stats[q.topic] || 0) + 1;
        totalQuestions++;
      });
    });

    // Convert to array and calculate percentages
    const entries = Object.entries(stats)
      .map(([name, count]) => ({
        name,
        val: totalQuestions > 0 ? Math.round((count / totalQuestions) * 100) : 0
      }))
      .sort((a, b) => b.val - a.val)
      .slice(0, 6); // Top 6 topics

    // If no data, return default placeholder
    if (entries.length === 0) {
      return [
        { name: 'Chưa có dữ liệu', val: 0 }
      ];
    }

    return entries;
  }, [history]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input để có thể upload cùng file lại
    e.target.value = '';

    setLoading(true);
    try {
      // Wrap FileReader in Promise
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result?.toString();
          if (result) {
            const data = result.split(',')[1];
            resolve(data);
          } else {
            reject(new Error('Không thể đọc file'));
          }
        };
        reader.onerror = () => reject(new Error('Lỗi đọc file'));
        reader.readAsDataURL(file);
      });

      const result = await analyzeExam("", base64);
      const newExam: Exam = {
        id: Date.now().toString(),
        title: result.title || `Đề thi từ ${file.name}`,
        createdAt: Date.now(),
        questions: result.questions.map((q: any, i: number) => ({ ...q, id: i.toString(), order: i + 1 })),
        matrix: result.matrix
      };
      setCurrentExam(newExam);
      saveToHistory(newExam);
      showToast("Phân tích đề thi thành công!");
    } catch (error: any) {
      console.error('File upload error:', error);
      showToast(error.message || "Có lỗi khi xử lý file!", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeText = async () => {
    if (!examContent.trim()) return;
    setLoading(true);
    try {
      const result = await analyzeExam(examContent);
      const newExam: Exam = {
        id: Date.now().toString(),
        title: result.title || "Đề thi mới từ văn bản",
        createdAt: Date.now(),
        questions: result.questions.map((q: any, i: number) => ({ ...q, id: i.toString(), order: i + 1 })),
        matrix: result.matrix
      };
      setCurrentExam(newExam);
      saveToHistory(newExam);
      showToast("Phân tích nội dung thành công!");
    } catch (error) {
      console.error(error);
      showToast("Lỗi phân tích văn bản!", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateVariant = async () => {
    if (!currentExam) return;
    setLoading(true);
    try {
      const result = await generateVariant(currentExam.questions, config);
      const variantExam: Exam = {
        id: `variant-${Date.now()}`,
        title: `Biến thể: ${currentExam.title}`,
        createdAt: Date.now(),
        questions: result.questions.map((q: any, i: number) => ({ ...q, id: i.toString(), order: i + 1 })),
        matrix: result.matrix
      };
      setCurrentExam(variantExam);
      saveToHistory(variantExam);
      showToast("Đã tạo bộ đề biến thể mới!");
    } catch (error) {
      console.error(error);
      showToast("Lỗi khi tạo đề biến thể!", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f8fafc]">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 p-6 flex flex-col gap-8">
        <div className="flex items-center gap-3">
          <div className="p-2 gradient-bg rounded-lg shadow-lg">
            <Sparkles className="text-white w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold gradient-text">PhysiGenius</h1>
        </div>

        <nav className="flex flex-col gap-2">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'create' ? 'bg-blue-50 text-primary font-bold shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Plus size={20} />
            Tạo đề mới
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-blue-50 text-primary font-bold shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <LayoutDashboard size={20} />
            Bảng điều khiển
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'history' ? 'bg-blue-50 text-primary font-bold shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <History size={20} />
            Lịch sử lưu trữ
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-blue-50 text-primary font-bold shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Settings size={20} />
            Cài đặt
          </button>
        </nav>

        <div className="mt-auto p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
            <Info size={16} />
            <span>AI Status</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider">Gemini 3 Ready</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto max-h-screen">
        {/* Header Section */}
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              {activeTab === 'create' ? 'Soạn thảo & Phân tích Đề' : activeTab === 'dashboard' ? 'Thống kê Tổng quan' : 'Kho Đề thi đã lưu'}
            </h2>
            <p className="text-slate-500">
              {activeTab === 'create' ? 'Tải lên hoặc nhập nội dung đề thi Vật lý gốc.' : 'Quản lý các tài nguyên và bộ đề của bạn.'}
            </p>
          </div>

          {currentExam && activeTab === 'create' && (
            <div className="flex gap-2">
              <button
                onClick={handleGenerateVariant}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full gradient-bg text-white font-bold shadow-lg hover:opacity-90 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                Tạo biến thể mới
              </button>

              {/* Export Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="flex items-center gap-1 px-4 py-2.5 bg-white border border-slate-200 rounded-full hover:bg-slate-50 shadow-sm"
                >
                  <Download size={18} className="text-slate-600" />
                  <ChevronDown size={14} className="text-slate-400" />
                </button>

                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-2 z-50">
                    <button
                      onClick={handleExportJson}
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <FileText size={16} className="text-blue-500" />
                      Xuất JSON
                    </button>
                    <button
                      onClick={handleExportWord}
                      disabled={loading}
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 disabled:opacity-50"
                    >
                      <FileText size={16} className="text-green-500" />
                      Xuất Word (.docx)
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </header>

        {/* Dynamic Content */}
        <div className="max-w-6xl mx-auto">
          {activeTab === 'create' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Input Area */}
              <div className="lg:col-span-1 flex flex-col gap-6">
                <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Upload size={20} className="text-primary" />
                    Nhập dữ liệu
                  </h3>

                  <div className="space-y-4">
                    <label className="block w-full cursor-pointer group">
                      <div className="w-full h-32 border-2 border-dashed border-slate-200 group-hover:border-primary rounded-xl flex flex-col items-center justify-center gap-2 transition-all bg-slate-50/50 group-hover:bg-blue-50/30">
                        <FileText className="text-slate-400 group-hover:text-primary" size={32} />
                        <span className="text-sm font-medium text-slate-500">Tải lên Ảnh / PDF</span>
                      </div>
                      <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileUpload} />
                    </label>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center"><span className="w-full border-t"></span></div>
                      <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-400">Hoặc dán văn bản</span></div>
                    </div>

                    <textarea
                      placeholder="Dán câu hỏi tại đây..."
                      className="w-full h-48 p-4 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none resize-none text-sm"
                      value={examContent}
                      onChange={(e) => setExamContent(e.target.value)}
                    ></textarea>

                    <button
                      onClick={handleAnalyzeText}
                      disabled={loading || !examContent.trim()}
                      className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold hover:bg-black transition-all disabled:opacity-50"
                    >
                      Phân tích nội dung
                    </button>
                  </div>
                </section>

                <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Settings size={20} className="text-secondary" />
                    Cấu hình sinh đề
                  </h3>

                  <div className="space-y-6">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase block mb-3">Mức độ khó dễ</label>
                      <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-lg">
                        {(['easier', 'original', 'harder'] as const).map(lvl => (
                          <button
                            key={lvl}
                            onClick={() => setConfig({ ...config, difficultyAdjustment: lvl })}
                            className={`py-1.5 text-xs font-bold rounded-md transition-all ${config.difficultyAdjustment === lvl ? 'bg-white shadow-sm text-primary' : 'text-slate-500'}`}
                          >
                            {lvl === 'easier' ? 'Dễ hơn' : lvl === 'original' ? 'Giữ nguyên' : 'Khó hơn'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">Tráo câu hỏi</span>
                      <button
                        onClick={() => setConfig({ ...config, shuffleQuestions: !config.shuffleQuestions })}
                        className={`w-10 h-6 rounded-full transition-all flex items-center px-1 ${config.shuffleQuestions ? 'bg-primary' : 'bg-slate-300'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white transition-all ${config.shuffleQuestions ? 'translate-x-4' : ''}`}></div>
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">Tráo đáp án</span>
                      <button
                        onClick={() => setConfig({ ...config, shuffleOptions: !config.shuffleOptions })}
                        className={`w-10 h-6 rounded-full transition-all flex items-center px-1 ${config.shuffleOptions ? 'bg-primary' : 'bg-slate-300'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white transition-all ${config.shuffleOptions ? 'translate-x-4' : ''}`}></div>
                      </button>
                    </div>
                  </div>
                </section>
              </div>

              {/* View Area */}
              <div className="lg:col-span-2">
                {!currentExam ? (
                  <div className="h-[600px] border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 bg-white p-12 text-center">
                    <Sparkles size={48} className="mb-4 opacity-20" />
                    <h4 className="text-xl font-bold text-slate-800 mb-2">Chưa có dữ liệu phân tích</h4>
                    <p className="max-w-xs">Hãy bắt đầu bằng việc tải lên một đề thi hoặc dán nội dung văn bản vào khung bên trái.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Matrix View */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 overflow-x-auto">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-slate-800">Ma trận kiến thức</h4>
                        <span className="text-xs text-slate-500 italic">* Tự động sinh bởi AI</span>
                      </div>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-500">
                            <th className="py-2 text-left font-semibold">Chuyên đề</th>
                            <th className="py-2 text-center font-semibold">NB</th>
                            <th className="py-2 text-center font-semibold">TH</th>
                            <th className="py-2 text-center font-semibold">VD</th>
                            <th className="py-2 text-center font-semibold">VDC</th>
                            <th className="py-2 text-center font-semibold">Tổng</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentExam.matrix.map((row, idx) => (
                            <tr key={idx} className="border-b border-slate-50">
                              <td className="py-3 font-medium text-slate-700">{row.topic}</td>
                              <td className="py-3 text-center">{row.recognize}</td>
                              <td className="py-3 text-center">{row.understand}</td>
                              <td className="py-3 text-center">{row.apply}</td>
                              <td className="py-3 text-center">{row.highApply}</td>
                              <td className="py-3 text-center font-bold text-primary">{row.total}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Question List */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-slate-800 flex items-center gap-2">
                          <FileText size={20} className="text-primary" />
                          Chi tiết câu hỏi ({currentExam.questions.length})
                        </h4>
                      </div>
                      {currentExam.questions.map((q) => (
                        <QuestionCard key={q.id} question={q} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Tổng số đề đã tạo', value: history.length, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Câu hỏi trong kho', value: history.reduce((acc, curr) => acc + curr.questions.length, 0), icon: Sparkles, color: 'text-orange-600', bg: 'bg-orange-50' },
                { label: 'Tỉ lệ chính xác AI', value: '99.2%', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
                { label: 'Lượt tải về', value: '24', icon: Download, color: 'text-purple-600', bg: 'bg-purple-50' },
              ].map((stat, i) => (
                <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className={`p-4 rounded-xl ${stat.bg}`}>
                    <stat.icon className={stat.color} size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                    <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
                  </div>
                </div>
              ))}

              <div className="md:col-span-2 lg:col-span-4 bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="text-lg font-bold mb-6">Biểu đồ Tần suất Chuyên đề</h3>
                <div className="h-64 flex items-end justify-between gap-4">
                  {topicStats.map((item, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-3">
                      <div
                        className="w-full bg-blue-100 rounded-t-lg transition-all duration-1000 group hover:bg-primary relative"
                        style={{ height: `${Math.max(item.val, 5)}%` }}
                      >
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                          {item.val}%
                        </div>
                      </div>
                      <span className="text-xs font-medium text-slate-500 whitespace-nowrap truncate max-w-full" title={item.name}>{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {history.length === 0 ? (
                <div className="col-span-full py-20 text-center text-slate-400">
                  Chưa có lịch sử tạo đề.
                </div>
              ) : (
                history.map((exam) => (
                  <div
                    key={exam.id}
                    className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                    onClick={() => {
                      setCurrentExam(exam);
                      setActiveTab('create');
                    }}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-blue-50 text-primary rounded-lg">
                        <FileText size={20} />
                      </div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        {new Date(exam.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-800 mb-1 group-hover:text-primary transition-colors">{exam.title}</h4>
                    <p className="text-xs text-slate-500 mb-4">{exam.questions.length} câu hỏi • {exam.matrix.length} chuyên đề</p>
                    <div className="flex items-center text-xs font-bold text-primary">
                      Xem chi tiết <ChevronRight size={14} />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-2xl">
              <SettingsPanel />
            </div>
          )}
        </div>
      </main >

      {/* Global Loading Overlay */}
      {
        loading && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-white">
            <div className="p-8 bg-white rounded-3xl shadow-2xl flex flex-col items-center gap-4 text-slate-800">
              <Loader2 className="animate-spin text-primary" size={48} />
              <div className="text-center">
                <p className="font-bold text-xl">Đang xử lý với Gemini AI...</p>
                <p className="text-sm text-slate-500 mt-1">Hệ thống đang phân tích ma trận kiến thức và sinh đề thi.</p>
              </div>
            </div>
          </div>
        )
      }

      {/* Toast Notification */}
      {
        toast && (
          <div className={`fixed bottom-8 right-8 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl animate-bounce-short ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
            {toast.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
            <span className="font-bold">{toast.message}</span>
          </div>
        )
      }

      <style>{`
        @keyframes bounce-short {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-short {
          animation: bounce-short 0.5s ease-in-out;
        }
      `}</style>
    </div >
  );
};

export default App;
