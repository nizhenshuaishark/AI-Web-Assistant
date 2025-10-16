
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getPageContent") {
    const pageContent = {
      title: document.title,
      url: window.location.href,
      text: document.body.innerText
    };
    sendResponse({ success: true, data: pageContent });
    return true; 
  }
});
