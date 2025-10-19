import { Worker, isMainThread, parentPort } from "worker_threads";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readdir } from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 模拟图片文件列表
const imageFiles = [
  "image1.svg",
  "image2.svg",
  "image3.svg",
  "image4.svg",
  "image5.svg",
  "image6.svg",
];

// 图片处理配置
const processingConfig = {
  width: 800,
  height: 600,
  quality: 80,
};

async function processSingleWorker() {
  console.log("🚀 开始处理图片（单工作线程）...");
  console.time("单工作线程处理时间");

  const worker = new Worker(join(__dirname, "worker.js"), {
    workerData: {
      images: imageFiles,
      config: processingConfig,
    },
  });

  // 监听工作线程的消息
  worker.on("message", (message) => {
    if (message.type === "progress") {
      console.log(`📊 处理进度: ${message.processed}/${message.total}`);
    } else if (message.type === "result") {
      console.log("✅ 所有图片处理完成！");
      console.log("处理结果:", message.results);
      console.timeEnd("单工作线程处理时间");
      worker.terminate();
    }
  });

  worker.on("error", (error) => {
    console.error("❌ 工作线程错误:", error);
  });

  worker.on("exit", (code) => {
    if (code !== 0) {
      console.error(`工作线程异常退出，退出码: ${code}`);
    }
  });
}

// 多工作线程版本
async function processMultipleWorkers() {
  console.log("\n🚀 开始处理图片（多工作线程）...");
  console.time("多工作线程处理时间");

  // 将图片列表分成多个批次（每个worker处理一部分）
  const numWorkers = 3; // 使用3个工作线程
  const imagesPerWorker = Math.ceil(imageFiles.length / numWorkers);

  const workers = [];
  const promises = [];

  for (let i = 0; i < numWorkers; i++) {
    const startIdx = i * imagesPerWorker;
    const endIdx = startIdx + imagesPerWorker;
    const workerImages = imageFiles.slice(startIdx, endIdx);

    if (workerImages.length === 0) continue;

    const promise = new Promise((resolve, reject) => {
      const worker = new Worker(join(__dirname, "worker.js"), {
        workerData: {
          images: workerImages,
          config: processingConfig,
        },
      });

      worker.on("message", (message) => {
        if (message.type === "progress") {
          console.log(
            `Worker ${i + 1} 进度: ${message.processed}/${message.total}`
          );
        } else if (message.type === "result") {
          resolve(message.results);
        }
      });

      worker.on("error", reject);
      worker.on("exit", (code) => {
        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });

      workers.push(worker);
    });

    promises.push(promise);
  }

  try {
    const results = await Promise.all(promises);
    const allResults = results.flat();

    console.log("✅ 所有图片处理完成！");
    console.log("处理结果:", allResults);
    console.timeEnd("多工作线程处理时间");

    // 清理worker
    workers.forEach((worker) => worker.terminate());
  } catch (error) {
    console.error("❌ 处理失败:", error);
    workers.forEach((worker) => worker.terminate());
  }
}

// 运行示例
async function main() {
  console.log("🖼️  Node.js 多线程图片处理器\n");

  // 先运行单工作线程版本
  await processSingleWorker();

  // 然后运行多工作线程版本进行对比
  await processMultipleWorkers();
}

main().catch(console.error);
