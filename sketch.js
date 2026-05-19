let classifier;
// ⚠️ 請務必替換為您在 Teachable Machine 訓練好並匯出上傳的真實網址路徑
let imageModelURL = 'https://teachablemachine.withgoogle.com/models/xxxxxx/'; 
let video;
let label = "等待辨識...";
let isVideoStarted = false; 

// --- 新增遊戲狀態變數 ---
let gameState = 'READY'; // 'READY', 'WAITING_FOR_GUN', 'COUNTDOWN', 'RESULT'
let countdown = 3;
let lastTime = 0;
let playerChoice = "";
let computerChoice = "";
let gameResult = "";
let playAgainBtn;

// --- MediaPipe Hands 變數 ---
let hands;
let handLandmarks = [];

function preload() {
  classifier = ml5.imageClassifier(imageModelURL + 'model.json');
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  // 建立「再來一局」按鈕
  playAgainBtn = createButton('再來一局');
  playAgainBtn.style('font-size', '24px');
  playAgainBtn.style('padding', '10px 20px');
  playAgainBtn.style('border-radius', '8px');
  playAgainBtn.style('cursor', 'pointer');
  playAgainBtn.hide(); // 預設先隱藏
  playAgainBtn.mousePressed(resetGame);

  let startBtn = document.getElementById('start-btn');
  if (startBtn) {
    startBtn.addEventListener('click', startGame);
  }

  // 建立並初始化 MediaPipe Hands 模型
  hands = new Hands({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
  }});
  hands.setOptions({
    maxNumHands: 2,           // 最多辨識幾隻手
    modelComplexity: 1,       // 模型複雜度
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });
  // 當 MediaPipe 辨識完成後，將結果存入 handLandmarks 陣列
  hands.onResults((results) => {
    handLandmarks = results.multiHandLandmarks;
  });

  // 網頁載入後立刻啟動攝影機，以便在開始畫面就能辨識手勢
  video = createCapture(VIDEO, () => {
    isVideoStarted = true;
    classifyVideo();
    
    // 初始化 MediaPipe Camera 自動傳送影像給 hands 模型
    const camera = new Camera(video.elt, {
      onFrame: async () => {
        await hands.send({image: video.elt});
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
  
  if (isVideoStarted && video) {
    let imgW = width * 0.5;
    let imgH = height * 0.5;
    let imgX = (width - imgW) / 2;
    let imgY = (height - imgH) / 2;
    
    push();
    translate(width, 0);
    scale(-1, 1);
    image(video, imgX, imgY, imgW, imgH);
    
    // --- 繪製藍色手部骨骼 ---
    if (handLandmarks && handLandmarks.length > 0) {
      const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4],
        [0, 5], [5, 6], [6, 7], [7, 8],
        [5, 9], [9, 10], [10, 11], [11, 12],
        [9, 13], [13, 14], [14, 15], [15, 16],
        [13, 17], [17, 18], [18, 19], [19, 20],
        [0, 17]
      ];

      for (let i = 0; i < handLandmarks.length; i++) {
        let landmarks = handLandmarks[i];

        // 畫連線
        stroke(0, 0, 255);
        strokeWeight(4);
        for (let j = 0; j < connections.length; j++) {
          let pA = landmarks[connections[j][0]];
          let pB = landmarks[connections[j][1]];
          line(imgX + pA.x * imgW, imgY + pA.y * imgH, imgX + pB.x * imgW, imgY + pB.y * imgH);
        }

        // 畫關節點
        fill(0, 0, 255);
        noStroke();
        for (let j = 0; j < landmarks.length; j++) {
          circle(imgX + landmarks[j].x * imgW, imgY + landmarks[j].y * imgH, 10);
        }
      }
    }
    pop();
  }

  fill(0, 0, 0, 160);
  noStroke();
  rect(0, height - 60, width, 60);

  fill(255);
  textSize(30);
  textAlign(CENTER, CENTER);
  text("目前手勢: " + label, width / 2, height - 30);

  // --- 手勢控制遊戲狀態 ---
  if (gameState === 'READY') {
    // 若在開始畫面中，比出手槍即開始遊戲
    if (label === '手槍' || label === '槍') {
      startGame();
    }
  } else {
    // 若在遊戲進行中或結果畫面，比出「六」就強制結束遊戲，回到開始畫面
    if (label === '六' || label === '6') {
      endGame();
    } else if (gameState === 'WAITING_FOR_GUN' && (label === '手槍' || label === '槍')) {
      // 若正在等待開局，且辨識到手槍，就進入倒數狀態
      gameState = 'COUNTDOWN';
      countdown = 3;
      lastTime = millis();
    }
  }

  // --- 遊戲邏輯與畫面繪製 ---
  if (gameState === 'WAITING_FOR_GUN') {
    fill(0, 0, 0, 150);
    rect(0, 0, width, height); // 半透明黑色背景
    
    fill(255);
    textSize(40);
    text("請比出「手槍」手勢來開始倒數", width / 2, height / 2);
  } else if (gameState === 'COUNTDOWN') {
    fill(0, 0, 0, 150);
    rect(0, 0, width, height); // 半透明黑色背景
    
    fill(255);
    textSize(120);
    text(countdown, width / 2, height / 2 - 40);
    
    textSize(40);
    text("準備出拳！", width / 2, height / 2 + 60);

    // 處理每秒倒數
    if (millis() - lastTime > 1000) {
      countdown--;
      lastTime = millis();
      if (countdown <= 0) {
        // 倒數結束，判定輸贏
        gameState = 'RESULT';
        playerChoice = label; // 抓取當下的辨識結果
        computerChoice = random(["石頭", "剪刀", "布"]); // 電腦隨機出拳
        evaluateGame();
        
        // 顯示再來一局按鈕，定位在畫面正中央下方
        playAgainBtn.position(width / 2 - 75, height / 2 + 100);
        playAgainBtn.show();
      }
    }
  } else if (gameState === 'RESULT') {
    fill(0, 0, 0, 200);
    rect(0, 0, width, height);
    
    fill(255);
    textSize(40);
    text("你出: " + playerChoice + "  VS  電腦出: " + computerChoice, width / 2, height / 2 - 80);
    
    textSize(80);
    if (gameResult === "遊戲成功") {
      fill(100, 255, 100); // 綠色代表贏
    } else if (gameResult === "遊戲失敗") {
      fill(255, 100, 100); // 紅色代表輸
    } else {
      fill(255, 255, 100); // 黃色代表平手或無效
    }
    text(gameResult, width / 2, height / 2 + 10);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (playAgainBtn) {
    playAgainBtn.position(width / 2 - 75, height / 2 + 100);
  }
}

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

// --- 遊戲流程控制 ---
function startGame() {
  if (gameState !== 'READY') return; // 防止重複觸發
  
  let startScreen = document.getElementById('start-screen');
  if (startScreen) {
      startScreen.classList.add('hidden');
  }
  resetGame(); // 進入等待比出手槍狀態
}

function endGame() {
  if (gameState === 'READY') return; // 防止重複觸發
  
  gameState = 'READY';
  let startScreen = document.getElementById('start-screen');
  if (startScreen) {
      startScreen.classList.remove('hidden');
  }
  playAgainBtn.hide();
}

// --- 遊戲判定邏輯 ---
function evaluateGame() {
  if (!["石頭", "剪刀", "布"].includes(playerChoice)) {
    gameResult = "無效手勢";
    return;
  }
  
  if (playerChoice === computerChoice) {
    gameResult = "平手";
  } else if (
    (playerChoice === "石頭" && computerChoice === "剪刀") ||
    (playerChoice === "剪刀" && computerChoice === "布") ||
    (playerChoice === "布" && computerChoice === "石頭")
  ) {
    gameResult = "遊戲成功";
  } else {
    gameResult = "遊戲失敗";
  }
}

function resetGame() {
  gameState = 'WAITING_FOR_GUN';
  playAgainBtn.hide();
}