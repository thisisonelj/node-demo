import { workerData, parentPort } from "worker_threads";
import sharp from "sharp";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync, mkdirSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 模拟图片处理函数（使用sharp库进行图片处理）
async function processImage(imageName, config) {
  // 在实际应用中，这里会读取真实的图片文件
  // 为了演示，我们创建一个模拟的图片处理过程

  // 模拟处理时间（100ms - 500ms）
  const processingTime = Math.random() * 400 + 100;

  // 模拟图片处理工作
  // await new Promise((resolve) => setTimeout(resolve, processingTime));
  const afterImageName = imageName.replace("svg", "jpg");

  await sharp(`${__dirname}/input-image/${imageName}`)
    .resize(config.width, config.height)
    .toFormat("jpg")
    .jpeg({ quality: config.quality })
    .toFile(`${__dirname}/output-image/${afterImageName}`);
  const outputFileName = `resized_${afterImageName}`;

  return {
    input: imageName,
    output: outputFileName,
    processingTime: Math.round(processingTime),
    status: "success",
  };
}

async function main() {
  const { images, config } = workerData;
  const results = [];

  console.log(`🔄 工作线程启动，需要处理 ${images.length} 张图片`);

  for (let i = 0; i < images.length; i++) {
    const image = images[i];

    try {
      const result = await processImage(image, config);
      results.push(result);

      // 发送进度更新
      parentPort.postMessage({
        type: "progress",
        processed: i + 1,
        total: images.length,
        current: image,
      });
    } catch (error) {
      results.push({
        input: image,
        output: null,
        error: error.message,
        status: "failed",
      });
    }
  }

  // 发送最终结果
  parentPort.postMessage({
    type: "result",
    results: results,
  });
}

main().catch((error) => {
  console.error("Worker error:", error);
});
