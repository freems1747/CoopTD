(() => {
  const units = ["검귀","고블린","빙결기사","고대청룡","우주병사","코인맨","마스터캣","오멘"];

  const rules = {
    0:{baseChance:100,cost:300}, 1:{baseChance:50,cost:30}, 2:{baseChance:40,cost:30},
    3:{baseChance:30,cost:30}, 4:{baseChance:20,cost:30}, 5:{baseChance:15,cost:30},
    6:{baseChance:15,cost:30}, 7:{baseChance:10,cost:30}, 8:{baseChance:5,cost:30},
    9:{baseChance:5,cost:30}, 10:{baseChance:100,cost:500},
    11:{baseChance:40,cost:50}, 12:{baseChance:30,cost:50},
    13:{baseChance:20,cost:50}, 14:{baseChance:15,cost:50},
    15:{baseChance:15,cost:50}, 16:{baseChance:10,cost:50},
    17:{baseChance:10,cost:50}, 18:{baseChance:5,cost:50},
    19:{baseChance:5,cost:50}
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
  const $startFail = document.getElementById("startFailField");
  const $applyStart = document.getElementById("applyStartLvBtn");

  const $lv = document.getElementById("lvField");
  const $stones = document.getElementById("stoneField");
  const $chance = document.getElementById("chanceField");
  const $fails = document.getElementById("failField");

  const $btn = document.getElementById("enhanceBtn");
  const $auto = document.getElementById("autoEnhanceBtn");
  const $sim = document.getElementById("simBtn");
  const $reset = document.getElementById("resetBtn");

  const $log = document.getElementById("logBox");
  const $info = document.getElementById("chanceInfo");
  const $attemptList = document.getElementById("attemptList");

  const $sumAttempts = document.getElementById("sumAttempts");
  const $sumSuccess = document.getElementById("sumSuccess");
  const $sumFail = document.getElementById("sumFail");

  // 도움말 패널 토글
  const $helpBtn = document.getElementById("helpBtn");
  const $helpPanel = document.getElementById("helpPanel");
  const $helpCloseBtn = document.getElementById("helpCloseBtn");

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

  function getFailCount(lv) { return failCount[lv] || 0; }
  function getBonus(lv) { return Math.min(5, failBonus[lv] || 0); }

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

  function setLogOnly(text, cls) {
    $log.textContent = "";
    log(text, cls);
  }

  function clearLog() {
    $log.textContent = "";
    $attemptList.textContent = "";
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

    // 자동강화 중이면 시작/시뮬 관련 조작 막기
    const locked = (autoTimerId !== null);
    $startLv.disabled = locked;
    $startFail.disabled = locked;
    $applyStart.disabled = locked;
    $sim.disabled = locked;

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

    const trimmed = String(input).trim();
    if (trimmed === "" || !Number.isInteger(Number(trimmed))) {
      alert("목표 수치는 정수로 입력하세요.");
      return;
    }
    const target = clampInt(Number(trimmed), 0, 20);
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
    }, 10);

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

    $attemptList.textContent = "아직 시도 없음";
    $log.textContent = "준비 완료";

    currentLv = nextLv;
  }

  function applyStartLv() {
    if (autoTimerId !== null) return;

    const lvTrim = String($startLv.value).trim();
    const failTrim = String($startFail.value).trim();

    const v = clampInt(Number(lvTrim), 0, 20);
    const f = Number.isFinite(Number(failTrim)) ? Math.max(0, Math.trunc(Number(failTrim))) : 0;

    $startLv.value = String(v);
    $startFail.value = String(f);

    clearAllStateExceptLv(v);

    if (v < 20) {
      failCount[v] = f;
      failBonus[v] = Math.min(5, f);
    }

    log(`시작 LV 적용: ${v} / 시작 실패횟수: ${f} (보정 +${Math.min(5, f)}%)`);
    render();
  }

  function resetAll() {
    if (autoTimerId !== null) {
      clearInterval(autoTimerId);
      autoTimerId = null;
      autoTargetLv = null;
    }

    $startLv.value = "0";
    $startFail.value = "0";

    clearAllStateExceptLv(0);
    $log.textContent = "리셋 완료";
    render();
  }

  // ---- 시뮬레이션 (핵심) ----
  function simulateOnce(fromLv, toLv, initFailCount, initFailBonus) {
    // 로컬 시뮬레이션 상태(실제 UI 상태를 건드리지 않음)
    let lv = fromLv;
    let stones = 0;

    const sFailCount = { ...initFailCount };
    const sFailBonus = { ...initFailBonus };

    let tries = 0;
    let succ = 0;
    let fail = 0;

    while (lv < toLv && lv < 20) {
      // 현재 구간 1회 시도
      tries++;

      const base = rules[lv].baseChance;
      const bonus = Math.min(5, sFailBonus[lv] || 0);
      const chance = Math.min(100, base + bonus);

      stones += rules[lv].cost;

      const roll = Math.random() * 100;
      if (roll < chance) {
        succ++;
        // 성공 시 해당 구간 보정 초기화 후 레벨업
        sFailCount[lv] = 0;
        sFailBonus[lv] = 0;
        lv++;
      } else {
        fail++;
        sFailCount[lv] = (sFailCount[lv] || 0) + 1;
        sFailBonus[lv] = Math.min(5, (sFailBonus[lv] || 0) + 1);
      }
    }

    return { stones, tries, succ, fail, reachedLv: lv };
  }

  function runSimulation() {
    if (autoTimerId !== null) return;

    const t1 = prompt(`목표 레벨을 입력하세요 (현재 ${currentLv}, 0~20)`);
    if (t1 === null) return;

    const t1s = String(t1).trim();
    if (t1s === "" || !Number.isInteger(Number(t1s))) {
      alert("목표 레벨은 정수로 입력하세요.");
      return;
    }
    const targetLv = clampInt(Number(t1s), 0, 20);
    if (targetLv <= currentLv) {
      alert("목표 레벨은 현재 레벨보다 커야 합니다.");
      return;
    }

    const t2 = prompt("반복 횟수를 입력하세요 (1~1000)");
    if (t2 === null) return;

    const t2s = String(t2).trim();
    if (t2s === "" || !Number.isInteger(Number(t2s))) {
      alert("반복 횟수는 정수로 입력하세요.");
      return;
    }
    const loops = clampInt(Number(t2s), 1, 1000);

    // 현재 “실제 상태”를 시작점으로 복제해서 시뮬 시작
    const initFailCount = { ...failCount };
    const initFailBonus = { ...failBonus };

    let sumStones = 0;
    let sumTries = 0;
    let sumSucc = 0;
    let sumFail = 0;

    for (let i = 0; i < loops; i++) {
      const r = simulateOnce(currentLv, targetLv, initFailCount, initFailBonus);
      sumStones += r.stones;
      sumTries += r.tries;
      sumSucc += r.succ;
      sumFail += r.fail;
    }

    const avgStones = sumStones / loops;
    const avgTries = sumTries / loops;

    // 로그는 최종 결과 한 줄만 남김
    clearLog();
    log(`사용된 해방석 평균 : ${avgStones.toFixed(1)}개 (평균 시도 ${avgTries.toFixed(1)}회)`);
    log(`LV${currentLv}에서 목표LV${targetLv}까지 ${loops}회 시뮬레이션 결과:`, "success");

    // UI 상태(현재LV/누적재화/통계)는 그대로 두고, 로그만 결과로 정리
    // 필요하면 여기서 통계 영역도 "시뮬 통계"로 바꾸는 옵션도 가능
  }
  // 이벤트
  $btn.addEventListener("click", enhanceOnce);
  $auto.addEventListener("click", startOrStopAutoEnhance);
  $sim.addEventListener("click", runSimulation);
  $reset.addEventListener("click", resetAll);
  $applyStart.addEventListener("click", applyStartLv);

  $startLv.addEventListener("keydown", (e) => { if (e.key === "Enter") applyStartLv(); });
  $startFail.addEventListener("keydown", (e) => { if (e.key === "Enter") applyStartLv(); });
  $helpBtn.addEventListener("click", () => {
    $helpPanel.classList.toggle("open");
  });

  $helpCloseBtn.addEventListener("click", () => {
    $helpPanel.classList.remove("open");
  });

  render();
})();
