// 维护连接的端口映射
const connections = {};

// 建立连接时的处理
chrome.runtime.onConnect.addListener((port) => {
  console.log("建立连接:", port.name);

  // 根据端口名称区分不同的连接目的
  if (port.name === "streaming-connection") {
    // 为流式传输创建唯一ID
    const connectionId = Date.now().toString();
    connections[connectionId] = port;

    // 当连接断开时清理映射
    port.onDisconnect.addListener(() => {
      delete connections[connectionId];
      console.log("连接断开:", connectionId);
    });

    // 将连接ID发送回popup以便识别
    port.postMessage({ type: "connectionId", id: connectionId });
  }
});

// ===== 消息监听 =====
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 截图
  if (message.action === "captureScreenshot") {
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        sendResponse({ status: "error", message: chrome.runtime.lastError.message });
      } else {
        sendResponse({ status: "success", dataUrl });
      }
    });
    return true;
  }

  // 分析截图
  if (message.action === "analyzeImage") {
    const dataUrl = message.payload;
    const question=message.question;
    console.log(dataUrl);
    (async () => {
      try {
        // Convert data URL to Blob
        const blob = await dataUrlToBlob(dataUrl);
        
        // Create ImageBitmap from Blob
        const imageBitmap = await createImageBitmap(blob);
        
        const params = await LanguageModel.params();
        // Create session without specifying expectedInputs since image is already in initialPrompts
        const session = await LanguageModel.create({
          temperature: Math.max(params.defaultTemperature * 1.2, 2.0),
          topK: params.defaultTopK,
          expectedInputs: [
            { type: "image" }
          ],
          initialPrompts: [
            {
              role: 'system',
              content: 'You are a skilled analyst who correlates patterns across multiple images. When providing responses, use line breaks (<br>) forparagraph separation to improve readability.',
            },
          ],             
        });

        const result = await session.prompt([{
              role: 'user',
              content: [
                { type: 'image', value: imageBitmap },
                { type: 'text', value: question||"analyze the Image"},
              ],
              
            }]);
        sendResponse(`🤖 Gemini Vision 分析结果：${result}`);
      } catch (err) {
        console.error("分析截图失败:", err);
        sendResponse("❌ AI 调用失败: " + err.message);
      }
    })();
    return true;
  }

  // 文本分析
  if (message.action === "summarizeText") {
    const text = message.payload || "";
    (async () => {
      try {
        const params = await LanguageModel.params();
        const session = await LanguageModel.create({
        temperature: Math.max(params.defaultTemperature * 1.2, 2.0),
        topK: params.defaultTopK,
        initialPrompts: [
          {
            role: 'system',
            content:
              'You are a skilled analyst who can analyze text, please analyse the text, When providing responses, use line breaks (<br>) forparagraph separation to improve readability.',
          },
        ],
        expectedInputs: [{ type: 'text' }],
      });
      const result = await session.prompt(text);
      console.log(result);
      sendResponse(`${result}`);
      } catch (err) {
        // console.error("text analyze fail:", err);
        sendResponse("❌ Prompt API failure: " + err.message);
      }
    })();
    return true;
  }

  // 页面分析流式传输
  if (message.action === "summarizePageStreaming") {
    const connectionId = message.connectionId;
    
    (async () => {
      try {
        // 获取当前活动标签页
        const tabs = await chrome.tabs.query({active: true, currentWindow: true});
        const activeTab = tabs[0];
        
        // 向内容脚本请求页面内容
        chrome.tabs.sendMessage(activeTab.id, {action: "getPageContent"}, (response) => {
          if (response && response.success) {
            // 发送开始消息
            if (connectionId && connections[connectionId]) {}

            
            // 执行流式摘要处理
            summary_AI_LongText_Streaming(response.data.text, connectionId)
              .then(() => {
                // 发送完成消息
                if (connectionId && connections[connectionId]) {
                  connections[connectionId].postMessage({ 
                    type: "complete", 
                    message: "√ page analyze finish！" 
                  });
                }
              })
              .catch(err => {
                console.error("页面分析失败:", err);
                if (connectionId && connections[connectionId]) {
                  connections[connectionId].postMessage({ 
                    type: "error", 
                    message: `页面分析失败: ${err.message}` 
                  });
                }
              });
          } else {
            console.error("获取页面内容失败:", response);
            if (connectionId && connections[connectionId]) {
              connections[connectionId].postMessage({ 
                type: "error", 
                message: "获取页面内容失败" 
              });
            }
          }
        });
      } catch (err) {
        console.error("获取活动标签页失败:", err);
        const connectionId = message.connectionId;
        if (connectionId && connections[connectionId]) {
          connections[connectionId].postMessage({ 
            type: "error", 
            message: `获取活动标签页失败: ${err.message}` 
          });
        }
      }
    })();
    // return true;
  }
});

// 分块处理文本的工具函数（支持中英文）
function splitTextIntoChunks(text, maxChunkSize = 6000) {
  // 同时支持中英文句子分割：句号、感叹号、问号（包括中文标点）
  const sentences = text.match(/[^\\.!?。！？\\n]+[\\.!?。！？\\n]+/g) || [text];
  const chunks = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length <= maxChunkSize) {
      currentChunk += sentence;
    } else {
      if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim());
      }
      // 如果单个句子就超过最大长度，则按字符分割
      if (sentence.length > maxChunkSize) {
        const subChunks = splitLongSentence(sentence, maxChunkSize);
        chunks.push(...subChunks);//使用展开运算符 ... 将这些小块逐个添加到主 chunks 数组中
        currentChunk = "";
      } else {
        currentChunk = sentence;
      }
    }
  }

  // 添加最后的块
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

// 辅助函数：处理超长句子
function splitLongSentence(sentence, maxChunkSize) {
  const chunks = [];
  for (let i = 0; i < sentence.length; i += maxChunkSize) {
    chunks.push(sentence.substring(i, i + maxChunkSize));
  }
  return chunks;
}

// 将数据图片的URL转换为Blob对象的工具函数
async function dataUrlToBlob(dataUrl) {
  const response = await fetch(dataUrl);
  return await response.blob();
}

// 使用流式摘要处理长文本（流式传输到前端）
async function summary_AI_LongText_Streaming(pageContent, connectionId) {
  const availability = await LanguageModel.availability();
  if (availability === 'unavailable') {
    if (connectionId && connections[connectionId]) {
      connections[connectionId].postMessage({ type: "error", message: 'this model is not available' }); 
    }
    return;
  }
  connections[connectionId].postMessage({ 
                type: "start", 
                message: "begin to summary the page，if your web is too long please wait it finish..." 
      });
  const params = await LanguageModel.params();
  const session = await LanguageModel.create({
    temperature: Math.max(params.defaultTemperature * 1.2, 2.0),
    topK: params.defaultTopK,
    initialPrompts: [
      { 
        role: 'system', 
        content: 'You are a web content analysis AI. Please analyze user input. Be sure AI output language is English . Critical HTML Tag Rule: Always ensure HTML tags (e.g., <div>, <h1>) are sent as COMPLETE units in a single response chunk. NEVER split opening and closing tags across different chunks. Content analysis and summarization: Please carefully analyze and understand the content provided, then summarize it using concise and appropriate language. Output format: Please output your response using HTML tags, ensuring a clear structure. Length control: The output should be of moderate length, conveying key information effectively without being overly verbose.' 
      },
  ],
  expectedOutputs: [
    { type: "text", languages: ["en"] }
  ],
  "response_format": {"type": "json_object"}
  });
  const longText = pageContent; // 传入的已经是文本内容，不是对象
  {
    // 检查文本长度是否需要分块
    if (longText.length > 6000) { // 假设2000字符是单次处理的限制
      const chunks = splitTextIntoChunks(longText, 6000); // 使用1500作为安全长度
      console.log(`Text is too long, splitting into ${chunks.length} chunks`);
      // 为每个块生成摘要
      for (let i = 0; i < chunks.length; i++) {
        console.log(`Processing chunk ${i + 1}/${chunks.length}`);
        try {
          const chunkPrompt =await session.promptStreaming("What is this webpage about?"+chunks[i]);
          for await (const chunk of chunkPrompt) {
              // 直接发送每个块的结果到前端
              if (connectionId && connections[connectionId]) {
                // 创建文本节点并追加
                let processedChunk = `${chunk}`;
                if (chunk.trim().startsWith('#')) {
                  processedChunk = `<br>`;
                }
                connections[connectionId].postMessage({ type: "chunk", message: processedChunk });
              }
          }
        } catch (error) {
          console.error(`Error processing chunk ${i + 1}:`, error);
          // 如果单个块失败，继续处理下一个
          continue;
        }
      }
      
    } else {
      const chunkPrompt = await session.promptStreaming(longText);
      for await (const chunk of chunkPrompt) {
              // 直接发送每个块的结果到前端
            if (connectionId && connections[connectionId]) {
                // 如果chunk以*开头，在前面添加换行符
                let processedChunk = chunk;
                if (chunk.trim().startsWith('#')) {
                  processedChunk = '<br>' + chunk;
                }
                connections[connectionId].postMessage({ type: "chunk", message: processedChunk });
            }
            
        }
      
    }
  }

}