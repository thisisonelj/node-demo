import { Worker, isMainThread } from "worker_threads";
import { cpus } from "os";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 简单的线程池实现
class WorkerPool {
  constructor(workerPath, numWorkers = cpus().length) {
    this.workerPath = workerPath;
    this.numWorkers = numWorkers;
    this.workers = [];
    this.tasks = [];
    this.workerStatus = new Map(); // 跟踪worker状态

    this.init();
  }

  init() {
    for (let i = 0; i < this.numWorkers; i++) {
      this.createWorker(i);
    }
  }

  createWorker(id) {
    const worker = new Worker(this.workerPath);
    this.workers.push(worker);
    this.workerStatus.set(worker, "idle");

    worker.on("message", (message) => {
      if (message.type === "ready") {
        this.processNextTask(worker);
      } else if (message.type === "task_complete") {
        const { taskId, result } = message;
        const task = this.tasks.find((t) => t.id === taskId);

        if (task) {
          task.resolve(result);
          this.tasks = this.tasks.filter((t) => t.id !== taskId);
        }

        this.workerStatus.set(worker, "idle");
        this.processNextTask(worker);
      }
    });

    worker.on("error", (error) => {
      console.error(`Worker ${id} 错误:`, error);
    });
  }

  processNextTask(worker) {
    if (this.tasks.length > 0 && this.workerStatus.get(worker) === "idle") {
      const task = this.tasks.shift();
      this.workerStatus.set(worker, "busy");
      worker.postMessage({
        type: "process_image",
        taskId: task.id,
        image: task.image,
        config: task.config,
      });
    }
  }

  addTask(image, config) {
    return new Promise((resolve, reject) => {
      const taskId = Date.now() + Math.random();
      this.tasks.push({
        id: taskId,
        image,
        config,
        resolve,
        reject,
      });

      // 查找空闲worker
      const idleWorker = this.workers.find(
        (worker) => this.workerStatus.get(worker) === "idle"
      );

      if (idleWorker) {
        this.processNextTask(idleWorker);
      }
    });
  }

  async terminate() {
    for (const worker of this.workers) {
      worker.terminate();
    }
  }
}

// 使用线程池处理图片
async function processWithWorkerPool() {
  const imageFiles = [
    "image1.jpg",
    "image2.jpg",
    "image3.jpg",
    "image4.jpg",
    "image5.jpg",
    "image6.jpg",
    "image7.jpg",
    "image8.jpg",
  ];

  const config = {
    width: 800,
    height: 600,
    quality: 80,
  };

  console.log("🚀 开始使用线程池处理图片...");
  console.time("线程池处理时间");

  const pool = new WorkerPool(join(__dirname, "pool-worker.js"), 4);

  try {
    const tasks = imageFiles.map((image) => pool.addTask(image, config));

    const results = await Promise.all(tasks);
    console.log("✅ 线程池处理完成！");
    console.log("处理结果:", results);
    console.timeEnd("线程池处理时间");

    await pool.terminate();
  } catch (error) {
    console.error("❌ 处理失败:", error);
    await pool.terminate();
  }
}

if (isMainThread) {
  processWithWorkerPool().catch(console.error);
}
