// ===== Tabs 切换 =====
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");

    document.querySelectorAll(".section").forEach(sec => sec.classList.add("hidden-tab"));
    const target = document.getElementById(`${tab.dataset.tab}-section`);
    target.classList.remove("hidden-tab");
    target.classList.add("active-tab");
  });
});

// ===== Text Analysis =====
document.getElementById("analyzeText").addEventListener("click", () => {
  const input = document.getElementById("textInput").value.trim();
  const resultEl = document.getElementById("textAnalysisResult");

  if (!input) {
    resultEl.innerHTML = "<p>⚠️ Please enter some text.</p>";
    return;
  }

  resultEl.innerHTML = `<div class="loading-dots"><span></span><span></span><span></span></div>`;

  chrome.runtime.sendMessage({ action: "summarizeText", payload: input }, (response) => {
    resultEl.innerHTML = `<button class="copy-btn" data-target="textAnalysisResult">📋 Copy</button><p>${response}</p>`;
    attachCopyHandlers();
  });
});

// ===== Page Analysis with Streaming =====
document.getElementById("analyzePage").addEventListener("click", () => {
  const resultEl = document.getElementById("pageAnalysisResult");
  resultEl.innerHTML = `<div class="loading-dots"><span></span><span></span><span></span></div><p>Getting page content and analyzing...</p>`;//加载动画

  // 建立端口连接用于流式传输
  const port = chrome.runtime.connect({ name: "streaming-connection" });

  port.onMessage.addListener((msg) => {
    if (msg.type === "connectionId") {
      // 获得连接ID后，发送流式分析请求
      chrome.runtime.sendMessage({ 
        action: "summarizePageStreaming", 
        connectionId: msg.id 
      });
    } else if (msg.type === "start") {
      // 显示开始消息
      resultEl.innerHTML =`<p>${msg.message}</p>`;
    } else if (msg.type === "chunk") {
      // 添加新的内容块到结果，确保HTML标签生效
      // 使用 insertAdjacentHTML 替代 createTextNode 来正确渲染HTML
      resultEl.insertAdjacentHTML("beforeend", msg.message);
      // 自动滚动到底部
      // 平滑滚动
      resultEl.scrollTo({
        top: resultEl.scrollHeight,
        behavior: 'smooth'
      });
      attachCopyHandlers(); // 确保复制按钮功能可用
    } else if (msg.type === "complete") {
      // 添加完成消息
      resultEl.insertAdjacentHTML("beforeend", `<p>${msg.message}</p>`+`<button class="copy-btn" data-target="pageAnalysisResult">📋 Copy</button>`);
      attachCopyHandlers();
      // 显式断开端口连接
      port.disconnect();
    } else if (msg.type === "error") {
      // 显示错误
      resultEl.innerHTML = `<p style="color: #ff4757;">❌ ${msg.message}</p>`;
      // 出现错误时也断开端口连接
      port.disconnect();
    }
  });
});

// ===== Image Analysis =====
document.getElementById("captureScreenshot").addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "captureScreenshot" }, (response) => {
    if (response.status === "success") {
      const img = document.createElement("img");
      img.src = response.dataUrl;
      const preview = document.getElementById("screenshotPreview");
      preview.innerHTML = "";
      preview.appendChild(img);
      
      // 启用按钮
      document.getElementById("analyzeImage").disabled = false;
      document.getElementById("downloadScreenshot").disabled = false;
      document.getElementById("cancelScreenshot").disabled = false;

      // 保存截图数据
      window.latestScreenshot = response.dataUrl;
    } else {
      alert("❌ Screenshot failed: " + response.message);
    }
  });
});

document.getElementById("analyzeImage").addEventListener("click", () => {
  const inputquestion = document.getElementById("Image_question").innerText;
  const resultEl = document.getElementById("screenshotPreview");
  resultEl.insertAdjacentHTML("beforeend", `<div class="loading-dots"><span></span><span></span><span></span></div>`);

  chrome.runtime.sendMessage({ action: "analyzeImage", payload: window.latestScreenshot, question: inputquestion }, (response) => {
    if (response.startsWith("❌")) {
      // If it's an error response, just display the error message
      resultEl.innerHTML = `<img src="${window.latestScreenshot}" style="max-width:100%;border-radius:8px;margin-bottom:10px;"/>`;
      resultEl.insertAdjacentHTML("beforeend", `<p>${response}</p>`);
    } else {
      // If it's a successful response, display with copy button
      resultEl.innerHTML = `<img src="${window.latestScreenshot}" style="max-width:100%;border-radius:8px;margin-bottom:10px;"/>`;
      resultEl.insertAdjacentHTML("beforeend", `<button class="copy-btn" data-target="screenshotPreview">📋 Copy</button><p>${response}</p>`);
      attachCopyHandlers();
    }
  });
});

// ===== 下载截图 =====
document.getElementById("downloadScreenshot").addEventListener("click", () => {
  if (!window.latestScreenshot) return;
  const link = document.createElement("a");
  link.href = window.latestScreenshot;
  link.download = "screenshot.png";
  link.click();
});

// ===== 取消截图 =====
document.getElementById("cancelScreenshot").addEventListener("click", () => {
  document.getElementById("screenshotPreview").innerHTML =
    "<p>💡 Capture a screenshot first, then let AI analyze it</p>";
  document.getElementById("analyzeImage").disabled = true;
  document.getElementById("downloadScreenshot").disabled = true;
  document.getElementById("cancelScreenshot").disabled = true;

  window.latestScreenshot = null;
});

// ===== 复制按钮功能 =====
function attachCopyHandlers() {
  document.querySelectorAll(".copy-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      const targetEl = document.getElementById(targetId);

      if (targetEl) {
        const text = targetEl.innerText.replace("📋 Copy", "").trim();
        navigator.clipboard.writeText(text).then(() => {
          btn.textContent = "✅ Copied!";
          setTimeout(() => (btn.textContent = "📋 Copy"), 1500);
        });
      }
    });
  });
}

// 初始化绑定
attachCopyHandlers();