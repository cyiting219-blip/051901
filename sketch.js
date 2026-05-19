let classifier;

// ⚠️ 換成你自己的 Teachable Machine 模型網址
let imageModelURL = 'https://teachablemachine.withgoogle.com/models/xxxxxx/';

let video;
let label = "等待辨識...";
let isVideoStarted = false;

// --- 遊戲狀態 ---
let gameState = 'READY'; // READY / WAITING_FOR_GUN / COUNTDOWN / RESULT
let countdown = 3;
let lastTime = 0;

let playerChoice = "";
let computerChoice = "";
let gameResult = "";

let playAgainBtn;

// --- MediaPipe Hands ---
let hands;
let handLandmarks = [];

function preload() {
  classifier = ml5.imageClassifier(imageModelURL + 'model.json');
}

function setup() {

  createCanvas(windowWidth, windowHeight);

  // 再來一局按鈕
  playAgainBtn = createButton('再來一局');

  playAgainBtn.style('font-size', '24px');
  playAgainBtn.style('padding', '10px 20px');
  playAgainBtn.style('border-radius', '8px');
  playAgainBtn.style('cursor', 'pointer');

  playAgainBtn.hide();

  playAgainBtn.mousePressed(resetGame);

  // MediaPipe Hands 初始化
  hands = new Hands({
    locateFile: (file) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    }
  });

  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });

  hands.onResults((results) => {
    handLandmarks = results.multiHandLandmarks || [];
  });

  // 啟動攝影機
  video = createCapture(VIDEO, () => {

    isVideoStarted = true;

    classifyVideo();

    const camera = new Camera(video.elt, {

      onFrame: async () => {
        await hands.send({ image: video.elt });
      },

      width: 640,
      height: 480

    });

    camera.start();

  });

  video.hide();
}

function draw() {

  background('#e7c6ff');

  // ===============================
  // 顯示攝影機
  // ===============================

  if (isVideoStarted && video) {

    let imgW = width * 0.5;
    let imgH = height * 0.5;

    let imgX = (width - imgW) / 2;
    let imgY = (height - imgH) / 2;

    push();

    // 鏡像翻轉
    translate(width, 0);
    scale(-1, 1);

    image(video, imgX, imgY, imgW, imgH);

    // ===============================
    // 畫藍色骨架
    // ===============================

    if (handLandmarks.length > 0) {

      const connections = [

        [0,1],[1,2],[2,3],[3,4],
        [0,5],[5,6],[6,7],[7,8],
        [5,9],[9,10],[10,11],[11,12],
        [9,13],[13,14],[14,15],[15,16],
        [13,17],[17,18],[18,19],[19,20],
        [0,17]

      ];

      for (let i = 0; i < handLandmarks.length; i++) {

        let landmarks = handLandmarks[i];

        // 畫骨架線
        stroke(0,0,255);
        strokeWeight(4);

        for (let j = 0; j < connections.length; j++) {

          let pA = landmarks[connections[j][0]];
          let pB = landmarks[connections[j][1]];

          line(
            imgX + pA.x * imgW,
            imgY + pA.y * imgH,
            imgX + pB.x * imgW,
            imgY + pB.y * imgH
          );
        }

        // 畫關節點
        fill(0,0,255);
        noStroke();

        for (let j = 0; j < landmarks.length; j++) {

          circle(
            imgX + landmarks[j].x * imgW,
            imgY + landmarks[j].y * imgH,
            10
          );
        }
      }
    }

    pop();
  }

  // ===============================
  // 顯示辨識資訊
  // ===============================

  fill(0,0,0,160);
  noStroke();

  rect(0, height - 60, width, 60);

  fill(255);

  textSize(30);
  textAlign(CENTER, CENTER);

  text("目前手勢: " + label, width / 2, height - 30);

  // ===============================
  // 顯示是否偵測到手
  // ===============================

  if (handLandmarks.length > 0) {

    fill(0,255,0);

    textSize(32);

    text("已偵測到手勢", width/2, 50);
  }

  // ===============================
  // MediaPipe 手勢控制
  // ===============================

  if (handLandmarks.length > 0) {

    let hand = handLandmarks[0];

    // 👍 + ☝️ 開始
    if (isStartGesture(hand)) {

      if (gameState === 'READY') {

        startGame();
      }

      else if (gameState === 'WAITING_FOR_GUN') {

        gameState = 'COUNTDOWN';

        countdown = 3;

        lastTime = millis();
      }
    }

    // 👍 + 🤟 結束
    if (isEndGesture(hand)) {

      endGame();
    }
  }

  // ===============================
  // 遊戲畫面
  // ===============================

  if (gameState === 'WAITING_FOR_GUN') {

    fill(0,0,0,150);

    rect(0,0,width,height);

    fill(255);

    textSize(40);

    text("請比 👍 + ☝️ 開始遊戲", width/2, height/2);
  }

  else if (gameState === 'COUNTDOWN') {

    fill(0,0,0,150);

    rect(0,0,width,height);

    fill(255);

    textSize(120);

    text(countdown, width/2, height/2 - 40);

    textSize(40);

    text("準備出拳！", width/2, height/2 + 60);

    // 倒數
    if (millis() - lastTime > 1000) {

      countdown--;

      lastTime = millis();

      if (countdown <= 0) {

        gameState = 'RESULT';

        playerChoice = label;

        computerChoice = random(["石頭","剪刀","布"]);

        evaluateGame();

        playAgainBtn.position(width/2 - 75, height/2 + 100);

        playAgainBtn.show();
      }
    }
  }

  else if (gameState === 'RESULT') {

    fill(0,0,0,200);

    rect(0,0,width,height);

    fill(255);

    textSize(40);

    text(
      "你出: " + playerChoice +
      " VS 電腦出: " + computerChoice,
      width/2,
      height/2 - 80
    );

    textSize(80);

    if (gameResult === "遊戲成功") {

      fill(100,255,100);

    } else if (gameResult === "遊戲失敗") {

      fill(255,100,100);

    } else {

      fill(255,255,100);
    }

    text(gameResult, width/2, height/2 + 10);
  }
}

function windowResized() {

  resizeCanvas(windowWidth, windowHeight);

  if (playAgainBtn) {

    playAgainBtn.position(width/2 - 75, height/2 + 100);
  }
}

// ===============================
// TM 辨識
// ===============================

function classifyVideo() {

  classifier.classify(video, gotResult);
}

function gotResult(error, results) {

  if (error) {

    console.error(error);

    return;
  }

  label = results[0].label;

  classifyVideo();
}

// ===============================
// 遊戲流程
// ===============================

function startGame() {

  if (gameState !== 'READY') return;

  gameState = 'WAITING_FOR_GUN';

  playAgainBtn.hide();
}

function endGame() {

  gameState = 'READY';

  playAgainBtn.hide();
}

function resetGame() {

  gameState = 'WAITING_FOR_GUN';

  playAgainBtn.hide();
}

// ===============================
// 勝負判定
// ===============================

function evaluateGame() {

  if (!["石頭","剪刀","布"].includes(playerChoice)) {

    gameResult = "無效手勢";

    return;
  }

  if (playerChoice === computerChoice) {

    gameResult = "平手";
  }

  else if (

    (playerChoice === "石頭" && computerChoice === "剪刀") ||
    (playerChoice === "剪刀" && computerChoice === "布") ||
    (playerChoice === "布" && computerChoice === "石頭")

  ) {

    gameResult = "遊戲成功";
  }

  else {

    gameResult = "遊戲失敗";
  }
}

// ===============================
// 手勢判定
// ===============================

// 手指是否伸直
function isFingerUp(tip, pip) {

  return tip.y < pip.y;
}

// 👍 + ☝️
function isStartGesture(landmarks) {

  let thumbUp = landmarks[4].x < landmarks[3].x;

  let indexUp = isFingerUp(
    landmarks[8],
    landmarks[6]
  );

  let middleDown = !isFingerUp(
    landmarks[12],
    landmarks[10]
  );

  let ringDown = !isFingerUp(
    landmarks[16],
    landmarks[14]
  );

  let pinkyDown = !isFingerUp(
    landmarks[20],
    landmarks[18]
  );

  return (
    thumbUp &&
    indexUp &&
    middleDown &&
    ringDown &&
    pinkyDown
  );
}

// 👍 + 🤟
function isEndGesture(landmarks) {

  let thumbUp = landmarks[4].x < landmarks[3].x;

  let pinkyUp = isFingerUp(
    landmarks[20],
    landmarks[18]
  );

  let indexDown = !isFingerUp(
    landmarks[8],
    landmarks[6]
  );

  let middleDown = !isFingerUp(
    landmarks[12],
    landmarks[10]
  );

  let ringDown = !isFingerUp(
    landmarks[16],
    landmarks[14]
  );

  return (
    thumbUp &&
    pinkyUp &&
    indexDown &&
    middleDown &&
    ringDown
  );
}