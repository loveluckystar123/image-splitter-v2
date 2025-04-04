# 图片切割工具

这是一个基于Next.js开发的纯前端图片切割工具，用户可以上传图片，按预设场景或自定义比例进行等分切割，支持调整切割区域、预览效果，并提供无损批量下载。

## 核心功能

1. **图片上传与预处理**
   - 支持JPG/PNG/WebP格式，大小限制10MB
   - 支持图片旋转（90°倍数调整）
   - 自动识别横版/竖版图片，允许手动修正

2. **场景模板与切割规则**
   - 预设场景：朋友圈（1:1）、小红书（3:4）
   - 自定义宽高比
   - 支持切割数量：1、2、4、6、9
   - 多种切割模式：横向、纵向、网格排列
   - 智能裁剪区域：根据切割数量自动调整裁剪比例（例如选择比例3:4，横向切割为2时，裁剪区域自动变为6:4）

3. **交互与调整**
   - 裁剪功能：当需要切割的比例与原图不一致时，可在原图范围内框选要处理的区域
   - 区域调整：支持拖拽/缩放裁剪区域
   - 实时预览：设置变更后即时显示裁剪区域

4. **输出与下载**
   - 保持原图格式与质量
   - 支持单张下载或批量下载

## 技术实现

- 纯前端实现，使用Canvas完成图片处理
- 使用Web Worker处理大图，避免主线程阻塞
- 响应式设计，适配各种设备

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 运行生产版本
npm start
```

## 浏览器兼容性

支持所有现代浏览器，包括：
- Chrome
- Firefox
- Safari
- Edge

## 项目特点

1. 所有处理在浏览器中完成，不上传服务器
2. 高性能图片处理，使用Web Worker和Canvas优化
3. 无损输出，保持原始图片质量 