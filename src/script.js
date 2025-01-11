// script.js
let examData;
let userAnswers = [];
let timer;
let timeRemaining = 25 * 60; // 默认时间 25分钟
let lastAnswerTime = []; // 用于记录每个问题的最后答案时间
let descriptions;
// 通过url参数获取考试id
const urlParams = new URLSearchParams(window.location.search);
const examId = urlParams.get("id");
if (!examId) {
  window.location.href = "index.html";
}
// 加载 JSON 数据
fetch("exams/data/exam_" + examId + ".json")
  .then((response) => response.json())
  .then((data) => {
    examData = data;
    document.getElementById("title").innerText = examData.title;
    document.getElementById("title").style.display = "block";

    document.getElementById("description").innerText = data.description;
    document.getElementById("description").style.display = "block";

    // 解析考试时间
    if (examData.time) {
      timeRemaining = examData.time;
    }
  })
  .catch((error) => {
    console.error(error);
    Qmsg.error(
      "加载考试数据失败，请检查网络连接或联系管理员 错误代码:ER_LOAD_EXAM_DATA_FAILED（1002）"
    );
  });

function startExam() {
  document.getElementById("startButton").style.display = "none";
  document.getElementById("questionsContainer").style.display = "block";
  loadAllQuestions();

  // 开始倒计时
  startTimer();
}

function startTimer() {
  timer = setInterval(() => {
    if (timeRemaining <= 0) {
      Qmsg.info("考试时间到，系统将自动提交！");
      clearInterval(timer);
      showResults((isforced = true)); // 时间到后自动提交
    } else {
      const minutes = Math.floor(timeRemaining / 60);
      const seconds = timeRemaining % 60;
      document.getElementById("timerCount").innerText = `${minutes}:${
        seconds < 10 ? "0" : ""
      }${seconds}`;
      timeRemaining--;
    }
  }, 1000);
}

function loadAllQuestions() {
  const questionsContainer = document.getElementById("questionsContainer");
  questionsContainer.innerHTML = "";
  examData.topic.forEach((questionData, index) => {
    lastAnswerTime[index] = 0;
    const questionDiv = document.createElement("div");
    questionDiv.className = "question-container";

    questionDiv.innerHTML = `<p>${index + 1}. ${questionData.question}</p>`;

    if (questionData.type === "判断题") {
      questionDiv.innerHTML += `
                <mdui-radio-group>
                    <div class="answer-option">
                        <mdui-radio type="radio" name="question${index}" value="T" onchange="selectAnswer('T', ${index})"> 对</mdui-radio>
                    </div>
                    <div class="answer-option">
                        <mdui-radio type="radio" name="question${index}" value="F" onchange="selectAnswer('F', ${index})"> 错</mdui-radio>
                    </div>
                </mdui-radio-group>
            `;
    } else if (questionData.type === "选择题") {
      const radioGroupHTML = createRadioGroup(questionData.options, index);
      questionDiv.innerHTML += radioGroupHTML;
    } else if (questionData.type === "填空题") {
      questionDiv.innerHTML += `
                <mdui-text-field 
                    type="text" 
                    id="fillInAnswer${index}" 
                    class="mdui-textfield-input" 
                    label="填写你的答案" 
                    onblur="selectAnswer(document.getElementById('fillInAnswer${index}').value, ${index})"
                    required
                />
            `;
    }

    questionsContainer.appendChild(questionDiv);
  });

  document.getElementById("submitButton").style.display = "block";
}

function createRadioGroup(options, questionIndex) {
  const radioOptionsHTML = options
    .map(
      (option) => `
        <div class="answer-option">
            <mdui-radio type="radio" value="${option}" onchange="selectAnswer('${option}', ${questionIndex})">${option}</mdui-radio>
        </div>
    `
    )
    .join("");

  return `<mdui-radio-group name="question${questionIndex}">${radioOptionsHTML}</mdui-radio-group>`;
}

function selectAnswer(answer, index) {
  console.log("调用selectAnswer函数");
  const currentTime = Date.now();
  if (currentTime - lastAnswerTime[index] < 100) {
    console.log("忽略此次答案更新");
    return;
  }
  userAnswers[index] = answer;
  Qmsg.success(
    `答案已经被记录，你回答了第${index + 1}题，你的答案是：${answer}`
  );
  lastAnswerTime[index] = currentTime;
}

function showResults(isforced = false) {
  // 计算未作答题目数量
  let unansweredQuestions = examData.topic.length;
  let unansweredQuestionlist = [];
  let answeredQuestions = 0;
  for (let i = 0; i < examData.topic.length; i++) {
    if (userAnswers[i] === undefined) {
      unansweredQuestions--;
      unansweredQuestionlist.push(i + 1);
    } else {
      answeredQuestions++;
    }
  }
  unansweredQuestions = examData.topic.length - answeredQuestions;

  if (unansweredQuestions > 0 && !isforced) {
    Qmsg.info(`还有${unansweredQuestions}道题目未作答，请先完成后再提交！`);
    return;
  }

  if (!isforced) {
    //暂停倒计时在窗口关闭后恢复
    // 使用 SweetAlert2 的 input 功能
    Swal.fire({
      title: '帮助我们战胜机器人',
      text: '请输入验证码',
      html: `
        <iframe src="captcha.html" width="215px" height="75px" frameborder="0"></iframe>
        <input type="text" id="captchaInput" class="swal2-input" placeholder="请输入验证码">
      `,
      focusConfirm: false,
      preConfirm: () => {
        const userInput = document.getElementById('captchaInput').value;
        const verifyCode = document.cookie.replace(/(?:(?:^|.*;\s*)verifyCode\s*=\s*([^;]*).*$)|^.*$/, "$1");
        if (!userInput) {
          Swal.fire("验证码不能为空！", "请重新输入！", "error")
          return false;
        }
        if (userInput !== verifyCode) {
          Swal.fire("验证码错误！", "请重新输入！", "error")
          return false;
        }
        return true;
      }
    }).then((result) => {
      Swal.fire("你战胜了机器人","验证码正确","success")
      showResults(true);  
    });
    return;
  }
  // 让页面返回最顶
  
  window.scrollTo(0, 0);
  // 以下为提交逻辑
  document.getElementById("submitButton").style.display = "none";
  clearInterval(timer);
  document.getElementById("questionsContainer").style.display = "none";

  // 计算得分
  let totalScore = 0;
  let a_topic_point = examData.a_topic_point;
  examData.topic.forEach((question, index) => {
    const userAnswer = userAnswers[index] || "未作答";
    const correctAnswer = question.answer;
    if (userAnswer === correctAnswer) {
      totalScore += a_topic_point;
    }
  });

  // 显示分数
  document.getElementById("scoreDisplay").innerText = totalScore;

  // 显示答题情况
  const resultContainer = document.getElementById("resultContainer");
  resultContainer.innerHTML = "";
  examData.topic.forEach((question, index) => {
    const userAnswer = userAnswers[index] || "未作答";
    const correctAnswer = question.answer;
    let resultText = `第${index + 1}题: 你的答案是 ${userAnswer}，正确答案是 ${correctAnswer}。`;
    let resultColor;
    if (userAnswer === correctAnswer) {
      resultColor = "#29B929"; // 绿色
      resultText += " [正确]";
    } else if (userAnswer === "未作答") {
      resultColor = "#d60f0f"; // 红色
      resultText += " [未作答]";
    } else {
      resultColor = "#cecc4e"; // 黄色
      resultText += " [错误]";
    }

    const resultDiv = document.createElement("div");
    resultDiv.innerText = resultText;
    resultDiv.style.color = resultColor;
    resultContainer.appendChild(resultDiv);
  });

  // 显示结果区域
  document.getElementById("result").style.display = "block";

  // 添加答案解析链接
  const analysisLink = document.createElement("a");
  analysisLink.href = `analysis.html?id=${examId}`;
  analysisLink.innerText = "查看答案解析";
  analysisLink.className = "mdui-btn mdui-ripple mdui-btn-raised mdui-color-theme-accent";
  analysisLink.style.marginTop = "20px";
  document.getElementById("analysisLinkContainer").appendChild(analysisLink);
}


function animateScore(finalScore) {
  const scoreDisplay = document.getElementById("scoreDisplay");
  let currentScore = 0;

  const increment = Math.ceil(finalScore / 100);
  const duration = 2000;
  const interval = duration / 100;

  const timer = setInterval(() => {
    currentScore += increment;
    if (currentScore >= finalScore) {
      currentScore = finalScore;
      clearInterval(timer);
    }
    scoreDisplay.innerText = currentScore;
  }, interval);
}
