
const connections = {};

// ---- Port 管理 ----
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "streaming-connection") {
    const id = Date.now().toString();
    connections[id] = port;
    port.postMessage({ type: "connectionId", id });
    port.onDisconnect.addListener(() => delete connections[id]);
  }
});

// ---- 通用工具 ----
function escapeHtml(str = "") { return str.replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function splitTextIntoChunks(text, maxLen = 6000) {
  const sents = text.match(/[^\.\!\?。！？\n]+[\.\!\?。！？\n]+/g) || [text];
  const chunks = []; let cur = "";
  for (const s of sents) { if (cur.length + s.length <= maxLen) cur += s; else { chunks.push(cur.trim()); cur = s; } }
  if (cur) chunks.push(cur.trim());
  return chunks;
}
async function dataUrlToBlob(dataUrl) { const r = await fetch(dataUrl); return await r.blob(); }



function postError(id, msg) { if (connections[id]) connections[id].postMessage({ type: "error", message: msg }); }
function getModelSettings() {
  return new Promise(r => chrome.storage.local.get({ temperature: 1.0, topK: 20, language: "auto" }, r));
}

// ---- 消息分发  ----
chrome.runtime.onMessage.addListener((msg, s, send) => {
  if (msg.action === "captureScreenshot") captureScreenshot(send);
  else if (msg.action === "analyzeImage") analyzeImage(msg, send);
  else if (msg.action === "analyzeText") summarizeText(msg, send);
  else if (msg.action === "translateText") translateText(msg, send);
  else if (msg.action === "summarizePageStreaming") summarizePageStreaming(msg);
  else if (msg.action === "checkModelAvailability") checkModelAvailability(send);
  return true;
});

// ---- 截图 ----
function captureScreenshot(send) {
  chrome.tabs.captureVisibleTab(null, { format: "png" }, (d) => {
    if (chrome.runtime.lastError) send({ status: "error", message: chrome.runtime.lastError.message });
    else send({ status: "success", dataUrl: d });
  });
}

// ---------------------------------------------
// ---- 图像分析  ----
// ---------------------------------------------
async function analyzeImage(msg, send) {
  try {
    console.log(msg.payload)
    const blob = await dataUrlToBlob(msg.payload);
    const imageBitmap = await createImageBitmap(blob);
    const p = await LanguageModel.params();
    const cfg = msg.settings;

    const session = await LanguageModel.create({
      temperature: cfg.temperature ?? p.defaultTemperature,
      topK: cfg.topK ?? p.defaultTopK,
      expectedInputs: [{ type: "image" }, { type: "text" }],
      initialPrompts: [{
        role: "system",
        content: `You are an expert image analyst. Respond in ${cfg.language === "auto" ? "the same language as the user's question" : cfg.language}.`
      }]
    });


    // 构造多模态输入 parts
    const parts = [
      { type: "image", inlineData: imageBitmap },//, mimeType: blob.type || "image/png" 
      { type: "text", text: msg.question || "Analyze this image." }
    ];

    // 将 parts 包装在 LanguageModelMessage 对象中
    const message = {
      role: "user",
      content: [
        { type: "image", value: imageBitmap },//, mimeType: blob.type || "image/png" 
        { type: "text", value: msg.question || "Analyze this image." },
      ],
    };
    // console.log(message);
    const res = await session.prompt([message]);

    send(escapeHtml(res));
  } catch (e) {
    console.error("Image analysis failed:", e);
    send("❌ Image analysis failed: " + e.message);
  }
}

// ---------------------------------------------
// ---- 文本分析  ----
// ---------------------------------------------
async function summarizeText(msg, send) {
  try {
    const t = msg.payload || "";
    const p = await LanguageModel.params();
    const cfg = msg.settings;
    const s = await LanguageModel.create({
      temperature: cfg.temperature ?? p.defaultTemperature,
      topK: cfg.topK ?? p.defaultTopK,
      expectedInputs: [{ type: "text" }],
      initialPrompts: [{ role: "system", content: `You are a funny teacher,you will chat with user. Respond in ${cfg.language === "auto" ? "the same language as the input text" : cfg.language}.` }]
    });

    // 将文本包装在 LanguageModelMessage 对象中
    const message = {
      role: "user",
      content: t,
    };

    const res = await s.prompt([message]);
    send(escapeHtml(res));
  } catch (e) { send("❌ " + e.message); }
}

// ---------------------------------------------
// ---- 文本翻译  ----
// ---------------------------------------------
async function translateText(msg, send) {
  try {
    const t = msg.payload || "";
    // 使用精确的语言名称
    const langMap = {
      'en': 'English',
      'zh': '中文',
      'ja': '日本語'
    };
    const targetLang = langMap[msg.targetLanguage] || 'English';

    const p = await LanguageModel.params();
    const cfg = msg.settings;

    const s = await LanguageModel.create({
      temperature: cfg.temperature ?? p.defaultTemperature,
      topK: cfg.topK ?? p.defaultTopK,
      expectedInputs: [{ type: "text" }],
      initialPrompts: [{
        role: "system",
        content: `You are an expert translator. Your only task is to translate the user's text into ${targetLang}. STRICTLY and ONLY output the translated text. Do not include any greetings, commentary, or explanations. The output must be pure translation.`
      }]
    });

    const message = t;

    const res = await s.prompt(message);
    send(escapeHtml(res));
  } catch (e) { send("❌ Translation failed: " + e.message); }
}


// ---- 页面流式 ----
async function summarizePageStreaming(msg) {
  const id = msg.connectionId;
  let cfg;
  try {
    cfg = await getModelSettings();
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { action: "getPageContent" }, async (res) => {
      if (!res || !res.success) { postError(id, "Failed to extract page content."); return; }
      await streamLongText(res.data.text, id, cfg);
    });
  } catch (e) { postError(id, e.message); }
}

// ---- 检查模型可用性  ----
async function checkModelAvailability(send) {
  try {
    const a = await LanguageModel.availability();
    send({ availability: a });
  } catch { send({ availability: "unknown" }); }
}

// ---- 流式处理  ----
async function streamLongText(text, id, cfg) {
  const conn = connections[id];
  if (!conn) return;
  const avail = await LanguageModel.availability();
  if (avail === "unavailable") { postError(id, "Model unavailable"); return; }
  conn.postMessage({ type: "start", message: "Analyzing page..." });
  const p = await LanguageModel.params();

  const s = await LanguageModel.create({
    temperature: cfg.temperature ?? p.defaultTemperature,
    topK: cfg.topK ?? p.defaultTopK,
    expectedInputs: [{ type: "text" }],
    initialPrompts: [{ role: "system", content: `You are a summarizer. Respond in ${cfg.language === "auto" ? "the language of the page content" : cfg.language}.` }]
  });
  const chunks = splitTextIntoChunks(text, 6000);
  for (let i = 0; i < chunks.length; i++) {
    try {
      const stream = await s.promptStreaming(chunks[i]);
      let buf = "", last = Date.now();
      for await (const ch of stream) {
        buf += ch;
        if (Date.now() - last > 100) { conn.postMessage({ type: "chunk", message: escapeHtml(buf) }); buf = ""; last = Date.now(); }
      }
      if (buf) conn.postMessage({ type: "chunk", message: escapeHtml(buf) });

    } catch (e) { console.warn("chunk failed", e); }
  }
  conn.postMessage({ type: "complete", message: "✅ Page analysis complete." });
}