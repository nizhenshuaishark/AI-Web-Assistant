// ====== 禁用/启用分析按钮  ======
function setAnalysisButtonsDisabled(disabled) {
  ["analyzeImage", "analyzeText", "analyzePage"].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      // 特殊处理：重新启用 analyzeImage 时，必须检查截图是否存在
      if (id === 'analyzeImage' && !disabled && !window.latestScreenshot) {
        btn.disabled = true;
      } else {
        btn.disabled = disabled;
      }
    }
  });
  document.querySelectorAll('.btn-translate').forEach(btn => btn.disabled = disabled);
}

// ====== 设置与存储功能  ======
function getSettings() {
  return new Promise(r => chrome.storage.local.get({
    temperature: 1.0,
    topK: 20,
    language: "auto",
    toast: "on"
  }, r));
}

async function loadSettingsToUI() {
  const settings = await getSettings();

  // 仅在元素存在时更新 UI
  const tempRange = document.getElementById("temperatureRange");
  const topKRange = document.getElementById("topKRange");
  const langSelect = document.getElementById("languageSelect");
  const toastSelect = document.getElementById("toastSelect");
  const tempValue = document.getElementById("tempValue");
  const topKValue = document.getElementById("topKValue");

  if (tempRange) tempRange.value = settings.temperature;
  if (tempValue) tempValue.textContent = settings.temperature;
  if (topKRange) topKRange.value = settings.topK;
  if (topKValue) topKValue.textContent = settings.topK;
  if (langSelect) langSelect.value = settings.language;
  if (toastSelect) toastSelect.value = settings.toast;
}

// 事件监听器：保存设置
document.getElementById("saveSettings")?.addEventListener("click", async () => {
  const temperature = parseFloat(document.getElementById("temperatureRange").value);
  const topK = parseInt(document.getElementById("topKRange").value, 10);
  const language = document.getElementById("languageSelect").value;
  const toastSetting = document.getElementById("toastSelect").value;

  await chrome.storage.local.set({ temperature, topK, language, toast: toastSetting });
  showToast("💾 Settings saved!");
});

// 事件监听器：更新设置滑块的值显示
document.getElementById("temperatureRange")?.addEventListener("input", (e) => {
  document.getElementById("tempValue").textContent = e.target.value;
});

document.getElementById("topKRange")?.addEventListener("input", (e) => {
  document.getElementById("topKValue").textContent = e.target.value;
});


// ======= 清空内容函数  =======
function clearSectionContent(sectionId) {
  hideToast();

  if (sectionId === "image-section") {
    // 1. Image Assistant
    const preview = document.getElementById("screenshotPreview");
    const textContent = document.getElementById("imageAnalysisTextContent");

    if (textContent) {
      textContent.innerHTML = "💡 Capture first";
      delete textContent.dataset.originalText;
    }
    // 移除截图 
    const img = preview?.querySelector("img");
    if (img) img.remove();

    ["analyzeImage", "downloadScreenshot", "cancelScreenshot"].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.disabled = true;
    });
    window.latestScreenshot = null;

    document.getElementById("copyImageResult")?.classList.add("hidden");
    document.getElementById("translateControls_image")?.classList.add("hidden");

  } else if (sectionId === "text-section") {
    // 2. Text Assistant
    const resBox = document.getElementById("textAnalysisResult");
    const textContent = document.getElementById("textAnalysisTextContent");

    document.getElementById("textInput").value = "";
    if (textContent) {
      textContent.innerHTML = "💡 Result will appear here";
      delete textContent.dataset.originalText;
    }

    document.getElementById("copyTextResult")?.classList.add("hidden");
    document.getElementById("translateControls_text")?.classList.add("hidden");

  } else if (sectionId === "page-section") {
    // 3. Page Assistant
    const el = document.getElementById("pageAnalysisResult");
    const textContainer = document.getElementById("pageAnalysisTextContent");

    if (textContainer) {
      textContainer.innerHTML = "💡 Click above to summarize";
      delete textContainer.dataset.originalText;
    }

    document.getElementById("copyPageResult")?.classList.add("hidden");
    document.getElementById("translateControls_page")?.classList.add("hidden");
  }
}

// ======= Tab 切换  =======
let activeTabId = "image-section";

document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    const previousSectionId = activeTabId;
    const targetId = `${tab.dataset.tab}-section`;

    if (targetId !== previousSectionId) {
      clearSectionContent(previousSectionId);
    }

    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".section").forEach(sec => {
      sec.classList.add("hidden-tab");
      sec.classList.remove("active-tab");
    });
    tab.classList.add("active");

    const section = document.getElementById(targetId);
    if (section) {
      section.classList.remove("hidden-tab");
      section.classList.add("active-tab");
    }

    activeTabId = targetId;
  });
});

// ======= Toast 提示  =======
const toast = document.getElementById("toast");
let toastTimeout;

function showToast(message, type = "ok") {
  // Check if toast is disabled
  if (document.getElementById("toastSelect")?.value === "off") return;

  toast.textContent = message;
  toast.className = `toast show ${type}`;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => hideToast(), 2500);
}
function hideToast() { toast.className = "toast hidden"; }
function showProcessingToast() {
  if (document.getElementById("toastSelect")?.value === "off") return;
  toast.textContent = "⚙️ Processing...";
  toast.className = "toast show loading";
}
function hideToastWithMessage(msg = "✅ Done") {
  if (document.getElementById("toastSelect")?.value === "off") return;
  toast.textContent = msg;
  toast.className = "toast show ok";
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => hideToast(), 1800);
}

// ======= Copy 功能  =======
function enableCopyFeature(buttonId, containerId, textElementId) {
  const btn = document.getElementById(buttonId);
  const container = document.getElementById(containerId);
  if (!btn || !container) return;

  let tooltip = document.querySelector('.tooltip');
  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.className = "tooltip";
    document.body.appendChild(tooltip);
  }

  const isEmptyContent = () => {
    const contentContainer = document.getElementById(textElementId) || container;
    const contentToCopy = contentContainer.innerText;

    const cleaned = contentToCopy.trim().replace(/\n+/g, "").replace(/\s+/g, " ");
    const emptyHints = [
      "💡 Result will appear here",
      "💡 Capture first",
      "💡 Click above to summarize",
      "💡",
      "⏳ Starting page analysis..."
    ];
    return !cleaned || emptyHints.some(h => cleaned.includes(h));
  };

  const updateCopyState = () => {
    const empty = isEmptyContent();
    btn.disabled = empty;
    btn.dataset.tooltip = empty ? "⚠️ 无内容可复制" : "📋 复制到剪贴板";
    btn.style.opacity = empty ? "0.5" : "1";
    btn.style.cursor = empty ? "not-allowed" : "pointer";

    if (empty) {
      btn.classList.add("hidden");
    } else {
      btn.classList.remove("hidden");
    }
  };

  // 监视内容容器
  const contentElement = document.getElementById(textElementId) || container;
  if (!btn.hasEventListener) {
    const observer = new MutationObserver(updateCopyState);
    observer.observe(contentElement, { childList: true, subtree: true, characterData: true });

    btn.onmouseenter = (e) => {
      if (btn.disabled) return;
      tooltip.textContent = btn.dataset.tooltip;
      tooltip.classList.add("show");
      tooltip.style.top = `${e.clientY - 40}px`;
      tooltip.style.left = `${e.clientX - tooltip.offsetWidth / 2}px`;
    };
    btn.onmousemove = (e) => {
      if (btn.disabled) return;
      tooltip.style.top = `${e.clientY - 40}px`;
      tooltip.style.left = `${e.clientX - tooltip.offsetWidth / 2}px`;
    };
    btn.onmouseleave = () => {
      tooltip.classList.remove("show");
    };

    btn.onclick = () => {
      if (btn.disabled) return;

      const contentContainer = document.getElementById(textElementId) || container;
      const text = contentContainer.innerText.trim();

      if (isEmptyContent()) return showToast("⚠️ 无有效内容可复制", "error");
      navigator.clipboard.writeText(text);
      showToast("✅ 已复制到剪贴板");
      btn.classList.add("copied");
      setTimeout(() => btn.classList.remove("copied"), 500);
    };
    btn.hasEventListener = true;
  }
  updateCopyState();
}

// ======= 翻译功能  =======
function setupTranslation() {
  document.querySelectorAll('.btn-translate').forEach(btn => {
    btn.addEventListener('click', async () => {
      const targetId = btn.dataset.target; // e.g., "pageAnalysisTextContent"
      const textElement = document.getElementById(targetId);
      const originalText = textElement.dataset.originalText;


      if (!originalText || originalText.trim() === "") {
        return showToast("⚠️ No original text to translate", "error");
      }

      const controls = btn.closest('.translate-controls');
      const select = controls.querySelector('.translate-select');
      const targetLanguage = select.value;

      showProcessingToast();
      setAnalysisButtonsDisabled(true);

      chrome.runtime.sendMessage({
        action: "translateText",
        payload: originalText,
        targetLanguage: targetLanguage,
        settings: await getSettings()
      }, (translatedText) => {
        hideToast();
        setAnalysisButtonsDisabled(false);

        if (translatedText.startsWith("❌")) {
          showToast(translatedText, "error");
        } else {
          textElement.innerText = translatedText;
          showToast("✅ Translation complete");
        }
      });
    });
  });
}


// ======= 截图、分析与控制  =======
document.getElementById("captureScreenshot").addEventListener("click", () => {
  showProcessingToast();
  chrome.runtime.sendMessage({ action: "captureScreenshot" }, (res) => {
    hideToast();
    const prev = document.getElementById("screenshotPreview");
    const textContent = document.getElementById("imageAnalysisTextContent");

    // 清除旧的截图 
    const oldImg = prev.querySelector("img");
    if (oldImg) oldImg.remove();

    if (res.status === "success") {
      const img = document.createElement('img');
      img.src = res.dataUrl;
      img.style = "max-width:100%;border-radius:8px;margin-bottom:10px;";
      prev.prepend(img);

      textContent.innerText = "💡 Image captured. Ask a question above and click Analyze.";

      ["analyzeImage", "downloadScreenshot", "cancelScreenshot"].forEach(id => document.getElementById(id).disabled = false);
      window.latestScreenshot = res.dataUrl;
      showToast("✅ Screenshot captured");
    } else {
      textContent.innerText = "❌ Screenshot failed";
      showToast("❌ Screenshot failed", "error");
    }
  });
});

document.getElementById("cancelScreenshot").addEventListener("click", () => {
  clearSectionContent("image-section");
});

document.getElementById("downloadScreenshot").addEventListener("click", () => {
  if (!window.latestScreenshot) return;
  const link = document.createElement("a");
  link.href = window.latestScreenshot;
  link.download = "screenshot.png";
  link.click();
});

document.getElementById("analyzeImage").addEventListener("click", async () => {
  if (!window.latestScreenshot) return showToast("⚠️ No image captured", "error");
  const q = document.getElementById("Image_question").innerText || "Analyze this image.";
  const el = document.getElementById("screenshotPreview");
  const textContent = document.getElementById("imageAnalysisTextContent");
  const settings = await getSettings();

  showProcessingToast();
  setAnalysisButtonsDisabled(true);

  chrome.runtime.sendMessage({ action: "analyzeImage", payload: window.latestScreenshot, question: q, settings }, (res) => {
    hideToast();
    setAnalysisButtonsDisabled(false);

    textContent.innerText = res;
    textContent.dataset.originalText = res;

    document.getElementById("copyImageResult")?.classList.remove("hidden");
    document.getElementById("translateControls_image")?.classList.remove("hidden");
  });
});

// ======= Text 分析 =======
document.getElementById("analyzeText").addEventListener("click", async () => {
  const txt = document.getElementById("textInput").value.trim();
  if (!txt) return showToast("⚠️ 请输入文本", "error");
  const resBox = document.getElementById("textAnalysisResult");
  const textContent = document.getElementById("textAnalysisTextContent");

  showProcessingToast();
  setAnalysisButtonsDisabled(true);

  chrome.runtime.sendMessage({ action: "analyzeText", payload: txt, settings: await getSettings() }, (r) => {
    hideToast();
    setAnalysisButtonsDisabled(false);

    textContent.innerText = r || "No response";
    textContent.dataset.originalText = r;

    document.getElementById("copyTextResult")?.classList.remove("hidden");
    document.getElementById("translateControls_text")?.classList.remove("hidden");
  });
});

// ======= Page 分析  =======
document.getElementById("analyzePage").addEventListener("click", async () => {
  const el = document.getElementById("pageAnalysisResult");
  const copyBtn = document.getElementById("copyPageResult");
  const translateControls = document.getElementById("translateControls_page");

  let textContainer = document.getElementById("pageAnalysisTextContent");
  if (!textContainer) {
    textContainer = document.createElement("p");
    textContainer.id = "pageAnalysisTextContent";
    // 插入到 copyBtn 和 translateControls 之前
    el.prepend(textContainer);
  }

  textContainer.innerHTML = "⏳ Starting page analysis...";
  delete textContainer.dataset.originalText;
  copyBtn.classList.add("hidden");
  translateControls.classList.add("hidden");

  showProcessingToast();
  setAnalysisButtonsDisabled(true);

  try {
    // 1. 获取当前活动的标签页
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // 2. 注入 content.js 脚本
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['js/content.js']
    });

  } catch (e) {
    hideToastWithMessage("❌ Page analysis initialization failed.");
    setAnalysisButtonsDisabled(false);
    textContainer.innerHTML = `❌ Error initializing analysis: ${e.message}`;
    return;
  }

  const port = chrome.runtime.connect({ name: "streaming-connection" });
  let connectionId = null;
  let fullResult = "";

  port.onMessage.addListener((msg) => {
    if (msg.type === "connectionId") {
      connectionId = msg.id;
      // 3. 脚本注入成功后，发送消息到 background.js 开始分析
      chrome.runtime.sendMessage({
        action: "summarizePageStreaming",
        connectionId: connectionId,
      });
    } else if (msg.type === "start") {
      textContainer.innerHTML = msg.message;
    } else if (msg.type === "chunk") {
      fullResult += msg.message;
      textContainer.innerHTML = fullResult;
    } else if (msg.type === "complete") {
      hideToastWithMessage("✅ Page analysis complete.");
      setAnalysisButtonsDisabled(false);
      textContainer.innerHTML = fullResult;
      textContainer.dataset.originalText = fullResult;
      copyBtn.classList.remove("hidden");
      translateControls.classList.remove("hidden");
      port.disconnect();
    } else if (msg.type === "error") {
      hideToastWithMessage("❌ Page analysis failed.");
      setAnalysisButtonsDisabled(false);
      textContainer.innerHTML = `❌ Error: ${msg.message}`;
      port.disconnect();
    }
  });

  port.onDisconnect.addListener(() => {
    const currentToastText = toast.textContent;
    if (currentToastText === "⚙️ Processing...") {
      hideToastWithMessage("⚠️ Connection lost.");
    }
    setAnalysisButtonsDisabled(false);
  });
});

// ======= 模型状态  =======
function checkModelStatus() {
  chrome.runtime.sendMessage({ action: "checkModelAvailability" }, (res) => {
    const bar = document.getElementById("statusBar");
    if (res?.availability === "available") {
      bar.textContent = "✅ Model available";
      bar.className = "status-bar ok";
    } else if (res?.availability === "unavailable") {
      bar.textContent = "❌ Model unavailable";
      bar.className = "status-bar error";
      showToast("❌ Model unavailable", "error");
    } else bar.textContent = "⚠️ Model status unknown";
  });
}

// ======= 初始化 =======
(async () => {
  // Wait for settings to load and UI to update
  await loadSettingsToUI();

  // Now we can check model status
  checkModelStatus();

  // 1. 确保 Page Assistant 的文本容器创建
  const el = document.getElementById("pageAnalysisResult");
  let textContainer = document.getElementById("pageAnalysisTextContent");
  if (!textContainer && el) {
    textContainer = document.createElement("p");
    textContainer.id = "pageAnalysisTextContent";
    // 插入到第一个子元素 (即 copy 按钮) 之前
    el.prepend(textContainer);
  }

  // 2. 绑定 Copy 功能 
  enableCopyFeature("copyTextResult", "textAnalysisResult", "textAnalysisTextContent");
  enableCopyFeature("copyPageResult", "pageAnalysisResult", "pageAnalysisTextContent");
  enableCopyFeature("copyImageResult", "screenshotPreview", "imageAnalysisTextContent");

  // 3. 绑定翻译功能 
  setupTranslation();

  // 4. 确保所有内容都被清空到初始状态
  clearSectionContent("image-section");
  clearSectionContent("text-section");
  clearSectionContent("page-section");

})();