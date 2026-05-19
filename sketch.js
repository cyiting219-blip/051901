let classifier;
// ⚠️ 請務必替換為您在 Teachable Machine 訓練好並匯出上傳的真實網址路徑
let imageModelURL = 'https://teachablemachine.withgoogle.com/models/xxxxxx/'; 
let video;
let label = "等待辨識...";
let isVideoStarted = false; 

// --- 新增遊戲狀態變數 ---
let gameState = 'READY'; // 'READY', 'COUNTDOWN', 'RESULT'
let countdown = 3;
let lastTime = 0;
let playerChoice = "";
let computerChoice = "";
let gameResult = "";
let playAgainBtn;

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

  // 網頁載入後立刻啟動攝影機，以便在開始畫面就能辨識手勢
  video = createCapture(VIDEO, () => {
    isVideoStarted = true;
    classifyVideo();
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
    }
  }

  // --- 遊戲邏輯與畫面繪製 ---
  if (gameState === 'COUNTDOWN') {
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
  resetGame(); // 進入倒數狀態
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
  gameState = 'COUNTDOWN';
  countdown = 3;
  lastTime = millis();
  playAgainBtn.hide();
}