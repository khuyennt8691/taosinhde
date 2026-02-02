
import { GoogleGenAI, Type } from "@google/genai";
import { Question, ExamMatrix, CognitiveLevel } from "../types";

const EXAM_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          content: { type: Type.STRING },
          options: {
            type: Type.OBJECT,
            properties: {
              A: { type: Type.STRING },
              B: { type: Type.STRING },
              C: { type: Type.STRING },
              D: { type: Type.STRING }
            }
          },
          answer: { type: Type.STRING },
          solution: { type: Type.STRING },
          topic: { type: Type.STRING },
          level: { type: Type.STRING }
        }
      }
    },
    matrix: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          topic: { type: Type.STRING },
          recognize: { type: Type.NUMBER },
          understand: { type: Type.NUMBER },
          apply: { type: Type.NUMBER },
          highApply: { type: Type.NUMBER },
          total: { type: Type.NUMBER }
        }
      }
    }
  }
};

// Helper to get API key from localStorage or fallback
function getApiKey(): string {
  // Check window global first (set by SettingsPanel)
  if (typeof window !== 'undefined' && (window as any).__GEMINI_API_KEY__) {
    return (window as any).__GEMINI_API_KEY__;
  }
  // Check localStorage
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem('physigenius_api_key');
    if (stored) return stored;
  }
  // Fallback to import.meta.env for Vite
  return (import.meta as any).env?.VITE_API_KEY || '';
}

// Model fallback configuration
const MODEL_FALLBACK_ORDER = [
  'gemini-3-pro-preview',
  'gemini-3-flash-preview',
  'gemini-2.5-flash'
];

// Helper to call API with automatic model fallback
async function callWithFallback(
  ai: any,
  config: any,
  contents: any
): Promise<any> {
  let lastError: Error | null = null;

  for (const model of MODEL_FALLBACK_ORDER) {
    try {
      console.log(`[PhysiGenius] Trying model: ${model}`);
      const response = await ai.models.generateContent({
        model,
        contents,
        config
      });
      console.log(`[PhysiGenius] Success with model: ${model}`);
      return response;
    } catch (error: any) {
      console.warn(`[PhysiGenius] Model ${model} failed:`, error.message);
      lastError = error;
      // Continue to next model if current one fails
      continue;
    }
  }

  // All models failed
  throw lastError || new Error('Tất cả các model AI đều không khả dụng. Vui lòng thử lại sau.');
}

export const analyzeExam = async (content: string, imageBase64?: string): Promise<any> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Chưa cấu hình API key. Vui lòng vào Cài đặt để nhập Gemini API key.');
  }
  // Always create a new GoogleGenAI instance right before making an API call
  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `
    Bạn là một chuyên gia giáo dục Vật lý THPT tại Việt Nam.
    Nhiệm vụ: Phân tích nội dung đề thi được cung cấp (văn bản hoặc hình ảnh).
    1. Trích xuất tất cả các câu hỏi trắc nghiệm.
    2. Xác định chủ đề (ví dụ: Dao động cơ, Sóng cơ, Điện xoay chiều...).
    3. Phân loại mức độ nhận thức cho mỗi câu (Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao).
    4. Xây dựng ma trận kiến thức chi tiết.
    5. Đưa ra lời giải chi tiết cho từng câu bằng LaTeX ($...$ cho công thức).
    
    Yêu cầu định dạng: JSON.
  `;

  const parts: any[] = [{ text: content || "Hãy phân tích đề thi trong ảnh đính kèm." }];
  if (imageBase64) {
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: imageBase64
      }
    });
  }

  // Use callWithFallback for automatic model switching
  const response = await callWithFallback(
    ai,
    {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: EXAM_SCHEMA as any
    },
    { parts }
  );

  try {
    const parsed = JSON.parse(response.text);
    // Validate response structure
    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      throw new Error("Invalid response structure: missing questions array");
    }
    return parsed;
  } catch (parseError) {
    console.error("Failed to parse AI response:", response.text);
    throw new Error("Không thể phân tích phản hồi từ AI. Vui lòng thử lại.");
  }
};

export const generateVariant = async (originalQuestions: Question[], config: any): Promise<any> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Chưa cấu hình API key. Vui lòng vào Cài đặt để nhập Gemini API key.');
  }
  // Always create a new GoogleGenAI instance right before making an API call
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Dựa trên danh sách câu hỏi Vật lý gốc sau đây, hãy tạo một đề thi biến thể (variant).
    Yêu cầu:
    1. Giữ nguyên ma trận kiến thức và cấu trúc.
    2. Thay đổi số liệu và ngữ cảnh bài toán (ví dụ: thay đổi tần số, khối lượng, chiều dài con lắc...) nhưng giữ nguyên phương pháp giải và độ khó.
    3. Nếu độ khó điều chỉnh là 'easier', hãy làm số liệu đẹp hơn hoặc giảm bớt bước tính toán trung gian. Nếu 'harder', hãy tăng số bước hoặc lồng ghép thêm hiện tượng phụ.
    4. Trả về kết quả theo cấu trúc JSON tương tự như đề gốc.
    
    Cấu hình: ${JSON.stringify(config)}
    Đề gốc: ${JSON.stringify(originalQuestions)}
  `;

  // Use callWithFallback for automatic model switching
  const response = await callWithFallback(
    ai,
    {
      responseMimeType: "application/json",
      responseSchema: EXAM_SCHEMA as any
    },
    prompt
  );

  try {
    const parsed = JSON.parse(response.text);
    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      throw new Error("Invalid response structure: missing questions array");
    }
    return parsed;
  } catch (parseError) {
    console.error("Failed to parse AI response:", response.text);
    throw new Error("Không thể tạo biến thể. Vui lòng thử lại.");
  }
};
