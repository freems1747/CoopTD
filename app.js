(() => {
  const units = ["검귀","고블린","빙결기사","고대청룡","우주병사","코인맨","마스터캣","오멘"];

  const rules = {
    0: { baseChance: 100, cost: 300 },
    1: { baseChance: 50, cost: 30 },
    2: { baseChance: 40, cost: 30 },
    3: { baseChance: 30, cost: 30 },
    4: { baseChance: 20, cost: 30 },
    5: { baseChance: 15, cost: 30 },
    6: { baseChance: 15, cost: 30 },
    7: { baseChance: 10, cost: 30 },
    8: { baseChance: 5, cost: 30 },
    9: { baseChance: 5, cost: 30 },
    10: { baseChance: 100, cost: 500 },
    11: { baseChance: 40, cost: 50 },
    12: { baseChance: 30, cost: 50 },
    13: { baseChance: 20, cost: 50 },
    14: { baseChance: 15, cost: 50 },
    15: { baseChance: 15, cost: 50 },
    16: { baseChance: 10, cost: 50 },
    17: { baseChance: 10, cost: 50 },
    18: { baseChance: 5, cost: 50 },
    19: { baseChance: 5, cost: 50 },
  };

  let currentLv = 0;
  let totalStones = 0;

  // 실패 횟수 무한 / 보정 0~5
  const failCount = {}; // fromLv
  const failBonus = {}; // fromLv (0~5)

  // 구간별 시도횟수
  const attempts = {}; // fromLv

  // 총계
  let totalAttempts = 0;
  let totalSuccess = 0;
  let totalFail = 0;

  // 자동강화
  let autoTimerId = null;
  let autoTargetLv = null;

  const $unit = document.getElementById("unitSelect");
  const $startLv = document.getElementById("startLvField");
  const $applyStart = document.getElementById("applyStartLvBtn");

  const $lv = document.getElementById("lvField");
  const $stones = document.getElementById("stoneField");
  const $chance = document.getElementById("chanceField");
  const $fails = document.getElementById("failField");

  const $btn = document.getElementById("enhanceBtn");
  const $auto = document.getElementById("autoEnhanceBtn");
  const $reset = document.getElementById("resetBtn");

  const $log = document.getElementById("logBox");
  const $info = document.getElementById("chanceInfo");
  const $attemptList = document.getElementById("attemptList");

  const $sumAttempts = document.getElementById("sumAttempts");
  const $sumSuccess = document.getElementById("sumSuccess");
  const $sumFail = document.getElementById("sumFail");

  // 콤보 초기화
  units.forEach(u => {
    const o = document.createElement("option");
    o.textContent = u;
    $unit.appendChild(o);
  });

  function clampInt(n, min, max) {
    if (!Number.isFinite(n)) return min;
    n = Math.trunc(n);
    return Math.min(max, Math.max(min, n));
  }

  function getFailCount(lv) {
    return failCount[lv] || 0;
  }

  function getBonus(lv) {
    return Math.min(5, failBonus[lv] || 0);
  }

  function getChance(lv) {
    if (lv >= 20) return 0;
    return Math.min(100, rules[lv].baseChance + getBonus(lv));
  }

  function log(text, cls) {
    const div = document.createElement("div");
    div.textContent = text;
    div.className = cls || "";
    $log.prepend(div);
  }

  function renderAttempts() {
    const lines = [];
    for (let from = 0; from <= 19; from++) {
      const cnt = attempts[from] || 0;
      if (cnt > 0) lines.push(`${from}→${from+1} : ${cnt}회 시도`);
    }
    $attemptList.textContent = lines.length ? lines.join("\n") : "아직 시도 없음";
  }

  function renderSummary() {
    $sumAttempts.textContent = String(totalAttempts);
    $sumSuccess.textContent = String(totalSuccess);
    $sumFail.textContent = String(totalFail);
  }

  function stopAuto(reasonText) {
    if (autoTimerId !== null) {
      clearInterval(autoTimerId);
      autoTimerId = null;
    }
    autoTargetLv = null;
    if (reasonText) log(reasonText);
    render();
  }

  function render() {
    $lv.value = String(currentLv);
    $stones.value = String(totalStones);
    $fails.value = String(getFailCount(currentLv));

    renderAttempts();
    renderSummary();

    // 자동강화 중이면 시작LV 적용 막기
    $startLv.disabled = (autoTimerId !== null);
    $applyStart.disabled = (autoTimerId !== null);

    if (currentLv >= 20) {
      $chance.value = "MAX";
      $btn.disabled = true;
      $auto.disabled = true;
      $auto.textContent = "자동강화";
      $info.textContent = "LV 20 도달 (강화 종료)";
      if (autoTimerId !== null) stopAuto("자동강화 종료: LV 20 도달");
      return;
    }

    const r = rules[currentLv];
    const chance = getChance(currentLv);

    $chance.value = chance + "%";
    $info.textContent =
      `${currentLv} → ${currentLv + 1} | 기본 ${r.baseChance}% + 보정 ${getBonus(currentLv)}% = ${chance}% | 소모 ${r.cost}`;

    // 자동강화 중: 수동강화 막고, 자동 버튼은 "중지"
    if (autoTimerId !== null) {
      $btn.disabled = true;
      $auto.disabled = false;
      $auto.textContent = "중지";
    } else {
      $btn.disabled = false;
      $auto.disabled = false;
      $auto.textContent = "자동강화";
    }

    $reset.disabled = false;
  }

  function enhanceOnce() {
    if (currentLv >= 20) return;

    attempts[currentLv] = (attempts[currentLv] || 0) + 1;
    totalAttempts++;

    const chance = getChance(currentLv);
    const roll = Math.random() * 100;

    totalStones += rules[currentLv].cost;

    if (roll < chance) {
      totalSuccess++;
      log(`성공 : ${currentLv} → ${currentLv + 1}`, "success");
      failCount[currentLv] = 0;
      failBonus[currentLv] = 0;
      currentLv++;
    } else {
      totalFail++;
      failCount[currentLv] = (failCount[currentLv] || 0) + 1;
      failBonus[currentLv] = Math.min(5, (failBonus[currentLv] || 0) + 1);
      log(`실패 : LV ${currentLv} 유지`, "fail");
    }

    render();
  }

  function startOrStopAutoEnhance() {
    if (autoTimerId !== null) {
      stopAuto("자동강화 중지");
      return;
    }

    if (currentLv >= 20) return;

    const input = prompt(`목표 강화 수치를 입력하세요 (현재 ${currentLv}, 0~20)`);
    if (input === null) return;

    const target = clampInt(Number(String(input).trim()), 0, 20);
    if (String(input).trim() === "" || !Number.isInteger(Number(String(input).trim()))) {
      alert("목표 수치는 정수로 입력하세요.");
      return;
    }
    if (target <= currentLv) {
      alert("목표 수치는 현재 레벨보다 커야 합니다.");
      return;
    }

    autoTargetLv = target;
    log(`자동강화 시작: 목표 LV ${autoTargetLv}`);

    autoTimerId = setInterval(() => {
      if (currentLv >= autoTargetLv) {
        stopAuto(`자동강화 완료: 목표 LV ${autoTargetLv} 달성`);
        return;
      }
      if (currentLv >= 20) {
        stopAuto("자동강화 종료: LV 20 도달");
        return;
      }
      enhanceOnce();
    }, 500);

    render();
  }

  function clearAllStateExceptLv(nextLv) {
    totalStones = 0;

    Object.keys(failCount).forEach(k => delete failCount[k]);
    Object.keys(failBonus).forEach(k => delete failBonus[k]);
    Object.keys(attempts).forEach(k => delete attempts[k]);

    totalAttempts = 0;
    totalSuccess = 0;
    totalFail = 0;

    $log.textContent = "준비 완료";
    currentLv = nextLv;
  }

  function applyStartLv() {
    if (autoTimerId !== null) return;

    const vRaw = Number(String($startLv.value).trim());
    const v = clampInt(vRaw, 0, 20);

    // input 값을 정규화(예: 999 입력해도 20으로)
    $startLv.value = String(v);

    clearAllStateExceptLv(v);
    log(`시작 LV 적용: ${v}`);
    render();
  }

  function resetAll() {
    if (autoTimerId !== null) {
      clearInterval(autoTimerId);
      autoTimerId = null;
      autoTargetLv = null;
    }

    $startLv.value = "0";
    clearAllStateExceptLv(0);

    $log.textContent = "리셋 완료";
    render();
  }

  $btn.addEventListener("click", enhanceOnce);
  $auto.addEventListener("click", startOrStopAutoEnhance);
  $reset.addEventListener("click", resetAll);
  $applyStart.addEventListener("click", applyStartLv);

  // Enter로도 적용
  $startLv.addEventListener("keydown", (e) => {
    if (e.key === "Enter") applyStartLv();
  });

  render();
})();
