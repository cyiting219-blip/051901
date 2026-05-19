let classifier;
// 請替換為您在 Teachable Machine 訓練好的模型網址路徑
let imageModelURL = 'https://teachablemachine.withgoogle.com/models/xxxxxx/'; 
let video;
let flippedVideo;
let label = "等待辨識...";

function preload() {
  // 載入手勢影像分類模型
  classifier = ml5.imageClassifier(imageModelURL + 'model.json');
}

function setup() {
  createCanvas(640, 480);
  // 建立並啟動攝影機
  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();

  // 進行鏡像翻轉，優化即時互動體驗
  flippedVideo = ml5.flipImage(video);
  classifyVideo();
}

function draw() {
  background(0);
  
  // 更新鏡像畫面
  flippedVideo = ml5.flipImage(video);
  image(flippedVideo, 0, 0, width, height);

  // 繪製辨識結果文字背景框
  fill(0, 0, 0, 160);
  noStroke();
  rect(0, height - 60, width, 60);

  // 渲染辨識結果標籤
  fill(255);
  textSize(30);
  textAlign(CENTER, CENTER);
  text("辨識結果: " + label, width / 2, height - 30);
}

// 傳送攝影機畫面至模型進行分類
function classifyVideo() {
  classifier.classify(flippedVideo, gotResult);
}

// 分類完成後的回呼函式
function gotResult(error, results) {
  if (error) {
    console.error(error);
    return;
  }
  // 擷取信心度最高的手勢分類結果
  label = results[0].label;
  // 連續執行分類迴圈
  classifyVideo();
}