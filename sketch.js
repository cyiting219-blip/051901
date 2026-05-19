let classifier;
// 請替換為您在 Teachable Machine 訓練好的模型網址路徑
let imageModelURL = 'https://teachablemachine.withgoogle.com/models/xxxxxx/'; 
let video;
let flippedVideo;
let label = "等待辨識...";
let isVideoStarted = false; // 紀錄攝影機是否已經啟動

function preload() {
  // 載入手勢影像分類模型
  classifier = ml5.imageClassifier(imageModelURL + 'model.json');
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  // 綁定開始按鈕點擊事件，按下後才啟動攝影機
  let startBtn = document.getElementById('start-btn');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      // 隱藏開始畫面
      document.getElementById('start-screen').classList.add('hidden');
      
      // 建立並啟動攝影機
      video = createCapture(VIDEO, () => {
        isVideoStarted = true;
        flippedVideo = ml5.flipImage(video); // 先產生一次鏡像供分類器使用
        classifyVideo();                     // 準備完畢後開始辨識
      });
      video.size(640, 480);
      video.hide();
    });
  }
}

function draw() {
  background('#e7c6ff');
  
  // 只有當攝影機已啟動，而且影片內容已經載入時，才繪製到畫布上
  if (isVideoStarted && video.loadedmetadata) {
    flippedVideo = ml5.flipImage(video);
    let imgW = width * 0.5;
    let imgH = height * 0.5;
    let imgX = (width - imgW) / 2;
    let imgY = (height - imgH) / 2;
    image(flippedVideo, imgX, imgY, imgW, imgH);
  }

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

// 當視窗大小改變時，自動調整畫布大小
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
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