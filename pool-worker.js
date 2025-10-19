import { parentPort, workerData } from "worker_threads";
import sharp from "sharp";

// 模拟图片处理
async function processImage(imageName, config) {
  const processingTime = Math.random() * 400 + 100;
  await new Promise((resolve) => setTimeout(resolve, processingTime));

  const outputFileName = `resized_${imageName}`;

  return {
    input: imageName,
    output: outputFileName,
    processingTime: Math.round(processingTime),
    workerId: process.threadId,
    status: "success",
  };
}

// 告诉主线程准备就绪
parentPort.postMessage({ type: "ready" });

// 监听任务
parentPort.on("message", async (message) => {
  if (message.type === "process_image") {
    const { taskId, image, config } = message;

    try {
      const result = await processImage(image, config);

      parentPort.postMessage({
        type: "task_complete",
        taskId,
        result,
      });
    } catch (error) {
      parentPort.postMessage({
        type: "task_complete",
        taskId,
        result: {
          input: image,
          output: null,
          error: error.message,
          status: "failed",
        },
      });
    }
  }
});
