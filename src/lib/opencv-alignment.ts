import type * as OpenCvModule from "@techstark/opencv-js";

type OpenCvRuntime = typeof OpenCvModule;
type OpenCvLoader = OpenCvRuntime & {
  onRuntimeInitialized?: () => void;
};

type AlignmentResult = {
  alignedDataUrl: string;
  confidence: number;
  matches: number;
  inliers: number;
  width: number;
  height: number;
};

export type DifferenceRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
  area: number;
  score: number;
};

export type DifferenceMapResult = AlignmentResult & {
  highlightedDataUrl: string;
  regions: DifferenceRegion[];
};

let cvPromise: Promise<OpenCvRuntime> | null = null;

/** Carrega OpenCV somente no navegador, evitando executar o WASM durante SSR. */
async function loadOpenCv(): Promise<OpenCvRuntime> {
  if (typeof window === "undefined") {
    throw new Error("O alinhamento de imagens só está disponível no navegador.");
  }
  if (cvPromise) return cvPromise;

  cvPromise = (async () => {
    const loaded = (await import("@techstark/opencv-js")) as unknown as {
      default?: OpenCvLoader | Promise<OpenCvLoader>;
    } & OpenCvLoader;
    const candidate = loaded.default ?? loaded;
    const cv = isPromiseLike(candidate) ? await candidate : candidate;

    if (cv.Mat) return cv as OpenCvRuntime;

    await new Promise<void>((resolve, reject) => {
      const runtime = cv as OpenCvLoader;
      const previous = runtime.onRuntimeInitialized;
      runtime.onRuntimeInitialized = () => {
        previous?.();
        resolve();
      };
      window.setTimeout(() => reject(new Error("OpenCV.js demorou para carregar.")), 15_000);
    });
    return cv as OpenCvRuntime;
  })().catch((error) => {
    cvPromise = null;
    throw error;
  });

  return cvPromise;
}

function isPromiseLike(value: unknown): value is Promise<OpenCvLoader> {
  return (
    typeof value === "object" &&
    value !== null &&
    "then" in value &&
    typeof value.then === "function"
  );
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("Não foi possível carregar uma das fotos para alinhamento."));
    image.src = url;
  });
}

function imageCanvas(image: HTMLImageElement, maxDimension = 1600): HTMLCanvasElement {
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Não foi possível preparar a foto para alinhamento.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/**
 * Alinha a imagem posterior ao enquadramento da imagem de referência usando
 * ORB, teste de razão de Lowe, RANSAC e homografia. Todo o processamento é local.
 */
export async function alignImagesInBrowser(
  referenceUrl: string,
  targetUrl: string,
): Promise<AlignmentResult> {
  const cv = await loadOpenCv();
  const [referenceImage, targetImage] = await Promise.all([
    loadImage(referenceUrl),
    loadImage(targetUrl),
  ]);
  const referenceCanvas = imageCanvas(referenceImage);
  const targetCanvas = imageCanvas(targetImage);

  const reference = cv.imread(referenceCanvas);
  const target = cv.imread(targetCanvas);
  const referenceGray = new cv.Mat();
  const targetGray = new cv.Mat();
  const referenceKeypoints = new cv.KeyPointVector();
  const targetKeypoints = new cv.KeyPointVector();
  const referenceDescriptors = new cv.Mat();
  const targetDescriptors = new cv.Mat();
  const emptyMask = new cv.Mat();
  const matches = new cv.DMatchVectorVector();
  const sourcePoints: number[] = [];
  const destinationPoints: number[] = [];
  const goodMatches: Array<{ queryIdx: number; trainIdx: number; distance: number }> = [];
  let homography: ReturnType<typeof cv.findHomography> | null = null;
  let inlierMask: InstanceType<typeof cv.Mat> | null = null;
  let alignedTarget: InstanceType<typeof cv.Mat> | null = null;

  try {
    cv.cvtColor(reference, referenceGray, cv.COLOR_RGBA2GRAY);
    cv.cvtColor(target, targetGray, cv.COLOR_RGBA2GRAY);

    const orb = new cv.ORB(1800, 1.2, 8, 31, 0, 2, cv.ORB_HARRIS_SCORE, 31, 20);
    try {
      orb.detectAndCompute(referenceGray, emptyMask, referenceKeypoints, referenceDescriptors);
      orb.detectAndCompute(targetGray, emptyMask, targetKeypoints, targetDescriptors);
    } finally {
      orb.delete();
    }

    if (referenceDescriptors.rows < 8 || targetDescriptors.rows < 8) {
      throw new Error("As fotos não possuem pontos suficientes para alinhamento.");
    }

    const matcher = new cv.BFMatcher(cv.NORM_HAMMING, false);
    try {
      matcher.knnMatch(targetDescriptors, referenceDescriptors, matches, 2);
    } finally {
      matcher.delete();
    }

    for (let index = 0; index < matches.size(); index += 1) {
      const pair = matches.get(index);
      if (pair.size() < 2) continue;
      const first = pair.get(0) as { queryIdx: number; trainIdx: number; distance: number };
      const second = pair.get(1) as { distance: number };
      if (first.distance < 0.72 * second.distance) {
        goodMatches.push(first);
        const targetPoint = targetKeypoints.get(first.queryIdx).pt;
        const referencePoint = referenceKeypoints.get(first.trainIdx).pt;
        sourcePoints.push(targetPoint.x, targetPoint.y);
        destinationPoints.push(referencePoint.x, referencePoint.y);
      }
    }

    if (goodMatches.length < 8) {
      throw new Error("As fotos não possuem correspondências suficientes para alinhamento.");
    }

    const sourceMat = cv.matFromArray(goodMatches.length, 1, cv.CV_32FC2, sourcePoints);
    const destinationMat = cv.matFromArray(goodMatches.length, 1, cv.CV_32FC2, destinationPoints);
    inlierMask = new cv.Mat();
    try {
      homography = cv.findHomography(
        sourceMat,
        destinationMat,
        cv.RANSAC,
        5,
        inlierMask,
        2000,
        0.995,
      );
    } finally {
      sourceMat.delete();
      destinationMat.delete();
    }

    if (!homography || homography.empty()) {
      throw new Error("Não foi possível calcular a transformação entre as fotos.");
    }

    let inliers = 0;
    for (let index = 0; index < inlierMask.rows; index += 1) {
      if (inlierMask.ucharAt(index, 0) !== 0) inliers += 1;
    }
    const confidence = inliers / goodMatches.length;
    if (inliers < 8 || confidence < 0.35) {
      throw new Error(
        "O alinhamento ficou pouco confiável. Use fotos com enquadramento semelhante.",
      );
    }

    alignedTarget = new cv.Mat();
    cv.warpPerspective(
      target,
      alignedTarget,
      homography,
      new cv.Size(reference.cols, reference.rows),
      cv.INTER_LINEAR,
      cv.BORDER_CONSTANT,
      new cv.Scalar(255, 255, 255, 255),
    );
    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = reference.cols;
    outputCanvas.height = reference.rows;
    cv.imshow(outputCanvas, alignedTarget);

    return {
      alignedDataUrl: outputCanvas.toDataURL("image/jpeg", 0.9),
      confidence,
      matches: goodMatches.length,
      inliers,
      width: reference.cols,
      height: reference.rows,
    };
  } finally {
    reference.delete();
    target.delete();
    referenceGray.delete();
    targetGray.delete();
    referenceKeypoints.delete();
    targetKeypoints.delete();
    referenceDescriptors.delete();
    targetDescriptors.delete();
    emptyMask.delete();
    matches.delete();
    inlierMask?.delete();
    homography?.delete();
    alignedTarget?.delete();
  }
}

/**
 * Alinha duas fotos e cria um mapa visual das diferenças mais consistentes.
 * A detecção é determinística e local: diferença absoluta, limiarização,
 * operações morfológicas e componentes conectados. Não interpreta a causa
 * clínica da diferença.
 */
export async function highlightImageDifferencesInBrowser(
  referenceUrl: string,
  targetUrl: string,
): Promise<DifferenceMapResult> {
  const alignment = await alignImagesInBrowser(referenceUrl, targetUrl);
  const cv = await loadOpenCv();
  const [referenceImage, alignedImage] = await Promise.all([
    loadImage(referenceUrl),
    loadImage(alignment.alignedDataUrl),
  ]);
  const referenceCanvas = imageCanvas(referenceImage);
  const alignedCanvas = imageCanvas(alignedImage);
  const reference = cv.imread(referenceCanvas);
  const aligned = cv.imread(alignedCanvas);
  const referenceGray = new cv.Mat();
  const alignedGray = new cv.Mat();
  const difference = new cv.Mat();
  const blurred = new cv.Mat();
  const mask = new cv.Mat();
  const kernel = cv.Mat.ones(5, 5, cv.CV_8U);
  const labels = new cv.Mat();
  const stats = new cv.Mat();
  const centroids = new cv.Mat();
  try {
    cv.cvtColor(reference, referenceGray, cv.COLOR_RGBA2GRAY);
    cv.cvtColor(aligned, alignedGray, cv.COLOR_RGBA2GRAY);
    cv.absdiff(referenceGray, alignedGray, difference);
    cv.GaussianBlur(difference, blurred, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);
    cv.threshold(blurred, mask, 28, 255, cv.THRESH_BINARY);
    cv.morphologyEx(mask, mask, cv.MORPH_OPEN, kernel);
    cv.morphologyEx(mask, mask, cv.MORPH_CLOSE, kernel);

    const componentCount = cv.connectedComponentsWithStats(
      mask,
      labels,
      stats,
      centroids,
      8,
      cv.CV_32S,
    );
    const minArea = Math.max(120, Math.round(aligned.rows * aligned.cols * 0.001));
    const regions: DifferenceRegion[] = [];
    for (let label = 1; label < componentCount; label += 1) {
      const area = stats.intAt(label, cv.CC_STAT_AREA);
      const x = stats.intAt(label, cv.CC_STAT_LEFT);
      const y = stats.intAt(label, cv.CC_STAT_TOP);
      const width = stats.intAt(label, cv.CC_STAT_WIDTH);
      const height = stats.intAt(label, cv.CC_STAT_HEIGHT);
      const touchesEdge =
        x <= 2 || y <= 2 || x + width >= aligned.cols - 2 || y + height >= aligned.rows - 2;
      if (area < minArea || touchesEdge) continue;
      regions.push({
        x,
        y,
        width,
        height,
        area,
        score: Math.min(1, area / (aligned.rows * aligned.cols * 0.08)),
      });
    }
    regions.sort((left, right) => right.area - left.area);
    const selectedRegions = regions.slice(0, 8);

    const selectedMask = cv.Mat.zeros(mask.rows, mask.cols, cv.CV_8UC1);
    try {
      for (const region of selectedRegions) {
        cv.rectangle(
          selectedMask,
          new cv.Point(region.x, region.y),
          new cv.Point(region.x + region.width, region.y + region.height),
          new cv.Scalar(255),
          -1,
        );
      }
      const highlight = new cv.Mat(
        aligned.rows,
        aligned.cols,
        aligned.type(),
        new cv.Scalar(30, 150, 255, 255),
      );
      const overlay = aligned.clone();
      const highlighted = new cv.Mat();
      try {
        highlight.copyTo(overlay, selectedMask);
        cv.addWeighted(aligned, 0.72, overlay, 0.28, 0, highlighted);
        const outputCanvas = document.createElement("canvas");
        outputCanvas.width = aligned.cols;
        outputCanvas.height = aligned.rows;
        cv.imshow(outputCanvas, highlighted);
        return {
          ...alignment,
          highlightedDataUrl: outputCanvas.toDataURL("image/jpeg", 0.9),
          regions: selectedRegions,
        };
      } finally {
        highlight.delete();
        overlay.delete();
        highlighted.delete();
      }
    } finally {
      selectedMask.delete();
    }
  } finally {
    reference.delete();
    aligned.delete();
    referenceGray.delete();
    alignedGray.delete();
    difference.delete();
    blurred.delete();
    mask.delete();
    kernel.delete();
    labels.delete();
    stats.delete();
    centroids.delete();
  }
}
