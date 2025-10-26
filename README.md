# AI-Web-Assistant

AI-Web-Assistant 是一个基于浏览器的AI助手扩展，利用google的 built-in ai模型来帮助用户处理各种网络任务，包括信息检索、内容总结、翻译等。

## 功能列表

- **AI 图片分析功能**：通过用户的截图和提问对图片进行分析。
-  **文本分析功能**:用户可以对ai助手发起提问，AI会回答他们所提问的问题
- **web页面分析与总结功能**：对当前用户所在的页面进行AI分析，（Google官方的页面除外），会对页面所存在的内容进行摘要和解析
- **翻译功能**：将AI分析的结果按照要求转换为对应的语言
- **个性化设置**：在setting界面，用户可以按照自己的需求对ai的相关配置进行修改。

## 使用方法

### 从源代码安装
前提条件：
1）打开 chrome://flags 找到 prompt-api-for-gemini-nano 设置为“Enabled”【注意有提示重启浏览器，但不要点，等下一步完成再重启】

2）然后找到 optimization-guide-on-device-model 设置为“Enabled BypassPerfRequirement”，重启浏览器。

3）进到 chrome://components/ 找到 Optimization Guide On Device Model ，如果版本显示是0.0.0.0，就后点击“Check for update”。然后就会开始下载模型，模型大约2GB，下载所需时间跟你的网络有关系，我等了几分钟。

1. 克隆或下载项目到本地：
   ```bash
   git clone https://github.com/nizhenshuaishark/AI-Web-Assistant.git
   ```
   或者直接下载代码压缩包，并进行解压。
2. 打开浏览器（使用Chrome）并导航到 `chrome://extensions/` 页面

3. 启用"开发者模式"（在页面右上角）

4. 点击"加载已解压的扩展程序"

5. 选择你下载的 `AI-Web-Assistant` 文件夹
## 使用说明

1. 安装完成后，在浏览器工具栏中点击AI-Web-Assistant图标，并选择将图标固定在拓展栏
<img width="1815" height="529" alt="image" src="https://github.com/user-attachments/assets/f9498fb4-1064-43be-8a87-f06dce1691ad" />
2. 在弹出的窗口中输入您想要咨询的问题或需要处理的文本点击

4. 点击"发送"按钮获取AI的回复

5. 使用设置面板调整AI模型参数或选择不同语言

## 测试步骤

### 基础功能测试

1. **安装验证**
   - 输入：正常安装扩展
   - 预期输出：扩展图标出现在浏览器工具栏，可以正常点击打开

2. **image Assistant test**
   - 输入：在想要进行分析的页面下点击Capture Screenshrot，并且在your question区域输入想要提问的问题，再点击popup页面右下角的analyze按钮。
   - 预期输出：AI会根据图片和问题给出他的分析。

3. **text Assistant test**
   - 输入：输入明确的生成请求（如"写一篇关于秋天的短文"）
   - 预期输出：AI生成符合要求的文本内容

4.**Page Assistant test**
   - 点击analyze current page，对当前浏览器页面进行AI分析。
   - 预期输出：AI生成符合要求的文本内容

### 高级功能测试

1. **长网页内容总结**
   - 选择一个内容多的网页进行page analyze。
   - 预期输出：AI生成当前网页内容的分析。

2. **多语言支持**
   - 输入：切换到不同语言后输入问题
   - 预期输出：AI以对应语言提供回复
3.  **翻译功能**
   - 输入：在任一页面得到ai的回答后，选择想要翻译的目标语言，点击翻译按钮将AI回答的内容翻译为目标语言。
   - 预期输出：AI返回对应的语言翻译。

3. **设置保存**
   - 修改：更改设置选项（如语言偏好）
   - 预期输出：设置被正确保存并在下次打开时保持

## 依赖说明

- Chrome 或 Edge 浏览器（版本 80 或更高）
- 活跃的互联网连接
- AI模型API访问权限（需配置API密钥）

## 配置文件

### manifest.json

此文件定义了扩展的基本信息，包括：
- 扩展名称和版本
- 权限设置
- 图标路径
- 脚本文件位置


### 代码结构

- `assets/`: 包含所有图像和图标文件
- `js/`: JavaScript源代码文件
- `popup/`: 扩展弹出窗口的HTML、CSS和JS文件
- `manifest.json`: 扩展配置文件
- `README.md`: 项目说明文档


### 常见问题

1. **扩展无法加载**
   - 检查是否启用了开发者模式
   - 确认所有文件都在正确的位置

2. **AI无响应**
   检查浏览器是否已经安装built-in model,并且检查prompt API是否可用。

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件。
