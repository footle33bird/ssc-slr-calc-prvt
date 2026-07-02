
const MONTHS = [
  { name: "იანვარი",   short: "JAN", hours: 144, rates: [9.28, 9.96] },
  { name: "თებერვალი", short: "FEB", hours: 160, rates: [8.35, 8.97] },
  { name: "მარტი",     short: "MAR", hours: 168, rates: [7.95, 8.54] },
  { name: "აპრილი",    short: "APR", hours: 152, rates: [8.79, 9.44] },
  { name: "მაისი",     short: "MAY", hours: 152, rates: [8.79, 9.44] },
  { name: "ივნისი",    short: "JUN", hours: 176, rates: [7.59, 8.15] },
  { name: "ივლისი",    short: "JUL", hours: 184, rates: [7.26, 7.80] },
  { name: "აგვისტო",   short: "AUG", hours: 160, rates: [8.35, 8.97] },
  { name: "სექტემბერი", short: "SEP", hours: 176, rates: [7.59, 8.15] },
  { name: "ოქტომბერი", short: "OCT", hours: 168, rates: [7.95, 8.54] },
  { name: "ნოემბერი",  short: "NOV", hours: 160, rates: [8.35, 8.97] },
  { name: "დეკემბერი", short: "DEC", hours: 184, rates: [7.26, 7.80] },
];
const PAYMENT_DATES = [
  "12 თებერვალი",
  "12 მარტი",
  "10 აპრილი",
  "12 მაისი",
  "12 ივნისი",
  "10 ივლისი",
  "12 აგვისტო",
  "12 სექტემბერი",
  "12 ოქტომბერი",
  "12 ნოემბერი",
  "11 დეკემბერი",
  "12 იანვარი",
];

const SA_NET = [1335.93, 1434.72],
  SA_GROSS = [1704, 1830];

const SL_NET = 1842.4,
  SL_GROSS = 2350;
const SSL_NET = 2026.64,
  SSL_GROSS = 2585;

const COMPANY_COVERS = 62;
const INS_PREMIUMS = {
  L:  { base: 62,  two: 130, full: 205 },
  XL: { base: 95,  two: 199, full: 314 },
};

let state = {
  role: null,
  months: null,
  monthIdx: null,
  insType: "L",
  insFamilyAddon: null,
  fitpassCount: 0,
  snapCount: 0,
  unpaidLeavesCount: 0,
  adds: {
    night: 0,
    holiday: 0,
    holidaynight: 0,
    ot: 0,
  },
};
let maxVisited = 0;


function applyTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute("data-theme") === "dark";
  html.setAttribute("data-theme", isDark ? "light" : "dark");
  document.getElementById("themeIcon").textContent = isDark ? "☾" : "☀";
  document.getElementById("themeLabel").textContent = isDark ? "DARK" : "LIGHT";
  
  const arrow = isDark
    ? "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%239e7a3f' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")"
    : "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23c8a96e' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")";
  document
    .querySelectorAll("select")
    .forEach((s) => (s.style.backgroundImage = arrow));
}

function toggleTheme() {
  const html = document.documentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  
  if (!document.startViewTransition || reduce) {
    html.classList.add("theme-anim");
    applyTheme();
    window.setTimeout(() => html.classList.remove("theme-anim"), 480);
    return;
  }

  
  const btn = document.getElementById("themeBtn");
  const rect = btn ? btn.getBoundingClientRect() : null;
  const x = rect ? rect.left + rect.width / 2 : window.innerWidth - 56;
  const y = rect ? rect.top + rect.height / 2 : 48;
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );

  html.classList.add("theme-switching");
  const vt = document.startViewTransition(applyTheme);
  vt.ready.then(() => {
    html.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${endRadius}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration: 520,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        pseudoElement: "::view-transition-new(root)",
      },
    );
  });
  vt.finished.finally(() => html.classList.remove("theme-switching"));
}


function getTier(m) {
  return m <= 6 ? 0 : 1;
}
function getTierLabel(m) {
  return m <= 6 ? "0–6 months" : "6+ months";
}

function buildMonthGrid() {
  
  
  const noTier = state.role === "SL" || state.role === "SSL";
  const tf = document.getElementById("tierField");
  if (tf) tf.style.display = noTier ? "none" : "";
  const hint = document.getElementById("detailHint");
  if (hint) hint.textContent = noTier
    ? "Pick the month you're calculating for"
    : "Select your work month and seniority";
  if (noTier) {
    state.months = 1;
    [0, 1].forEach((i) =>
      document.getElementById(`tierBtn${i}`).classList.remove("active"),
    );
  } else {
    
    const t = state.months == null ? -1 : getTier(state.months);
    [0, 1].forEach((i) =>
      document.getElementById(`tierBtn${i}`).classList.toggle("active", i === t),
    );
  }

  const g = document.getElementById("monthGrid");
  g.innerHTML = "";
  MONTHS.forEach((m, i) => {
    const d = document.createElement("div");
    d.className = "month-btn" + (state.monthIdx === i ? " selected" : "");
    d.innerHTML = `${m.short}<span class="hours">${state.role === "PT SA" ? m.hours / 2 : m.hours}h</span>`;
    d.onclick = () => {
      document
        .querySelectorAll(".month-btn")
        .forEach((b) => b.classList.remove("selected"));
      d.classList.add("selected");
      state.monthIdx = i;
    };
    g.appendChild(d);
  });
}

function selectRole(el) {
  document
    .querySelectorAll(".option-card")
    .forEach((c) => c.classList.remove("selected"));
  el.classList.add("selected");
  state.role = el.dataset.role;
  document.getElementById("roleErr").style.display = "none";
}

function getInsuranceDeduction() {
  if (!state.insType) return 0;
  const plan = INS_PREMIUMS[state.insType];
  const raw =
    state.insFamilyAddon === "two"
      ? plan.two
      : state.insFamilyAddon === "full"
        ? plan.full
        : plan.base;
  return raw - COMPANY_COVERS;
}

function selectInsPlan(type) {
  state.insType = type;
  state.insFamilyAddon = null;

  ["insLRow", "insXLRow"].forEach((id) =>
    document.getElementById(id).classList.remove("active"),
  );
  document.getElementById(type === "XL" ? "insXLRow" : "insLRow").classList.add("active");

  syncFamilyMeta();
  ["insNoFamilyRow", "insTwoMemberRow", "insFullFamilyRow"].forEach((id) =>
    document.getElementById(id).classList.remove("active"),
  );
  document.getElementById("insNoFamilyRow").classList.add("active");
}

function selectInsFamilyAddon(addon) {
  state.insFamilyAddon = addon;
  ["insNoFamilyRow", "insTwoMemberRow", "insFullFamilyRow"].forEach((id) =>
    document.getElementById(id).classList.remove("active"),
  );
  const rowId =
    addon === "two"
      ? "insTwoMemberRow"
      : addon === "full"
        ? "insFullFamilyRow"
        : "insNoFamilyRow";
  document.getElementById(rowId).classList.add("active");
}

function syncFamilyMeta() {
  if (!state.insType) return;
  const plan = INS_PREMIUMS[state.insType];
  const baseCost = plan.base - COMPANY_COVERS;
  const twoCost = plan.two - COMPANY_COVERS;
  const fullCost = plan.full - COMPANY_COVERS;
  document.getElementById("insNoFamilyMeta").textContent =
    baseCost === 0 ? "No deduction" : `−33.00 GEL / month`;
  document.getElementById("insTwoMemberMeta").textContent =
    `−${twoCost.toFixed(2)} GEL / month`;
  document.getElementById("insFullFamilyMeta").textContent =
    `−${fullCost.toFixed(2)} GEL / month`;
}


function resSelectInsPlan(type) {
  state.insType = type;
  state.insFamilyAddon = null;
  calculate();
}

function resSelectInsFamilyAddon(addon) {
  state.insFamilyAddon = addon;
  calculate();
}

function renderInsuranceEditRows() {
  const plan = state.insType ? INS_PREMIUMS[state.insType] : null;
  const baseCost = plan ? plan.base - COMPANY_COVERS : 0;
  const twoCost = plan ? plan.two - COMPANY_COVERS : 0;
  const fullCost = plan ? plan.full - COMPANY_COVERS : 0;

  const lA = state.insType === "L" ? "active" : "";
  const xlA = state.insType === "XL" ? "active" : "";
  const noFamilyA = !state.insFamilyAddon ? "active" : "";
  const twoA = state.insFamilyAddon === "two" ? "active" : "";
  const fullA = state.insFamilyAddon === "full" ? "active" : "";
  const noFamilyMeta =
    baseCost === 0 ? "No deduction" : `−${baseCost.toFixed(2)} GEL / month`;

  return `
    <div class="toggle-row ${lA}" onclick="resSelectInsPlan('L')">
      <div class="toggle-left"><span class="toggle-name">L Insurance</span><span class="toggle-meta">Covered by company · 0.00 GEL / month</span></div>
      <div class="ins-radio"></div>
    </div>
    <div class="toggle-row ${xlA}" onclick="resSelectInsPlan('XL')">
      <div class="toggle-left"><span class="toggle-name">XL Insurance</span><span class="toggle-meta">−33.00 GEL / month</span></div>
      <div class="ins-radio"></div>
    </div>
    <div class="ins-family-section">
      <div class="field-label" style="margin-bottom:10px;padding-top:4px;">Family Coverage</div>
      <div class="toggle-row ${noFamilyA}" onclick="resSelectInsFamilyAddon(null)">
        <div class="toggle-left"><span class="toggle-name">Individual Only</span><span class="toggle-meta">${noFamilyMeta}</span></div>
        <div class="ins-radio"></div>
      </div>
      <div class="toggle-row ${twoA}" onclick="resSelectInsFamilyAddon('two')">
        <div class="toggle-left"><span class="toggle-name">Monthly Insurance Premium Per Two-Member Family</span><span class="toggle-meta">−${twoCost.toFixed(2)} GEL / month</span></div>
        <div class="ins-radio"></div>
      </div>
      <div class="toggle-row ${fullA}" onclick="resSelectInsFamilyAddon('full')">
        <div class="toggle-left"><span class="toggle-name">Monthly Insurance Premium Per Family</span><span class="toggle-meta">−${fullCost.toFixed(2)} GEL / month</span></div>
        <div class="ins-radio"></div>
      </div>
    </div>
  `;
}

function incrementFitpass() {
  const input = document.getElementById("fitpassCount");
  const current = parseInt(input.value) || 0;
  input.value = current + 1;
}

function decrementFitpass() {
  const input = document.getElementById("fitpassCount");
  const current = parseInt(input.value) || 0;
  if (current > 0) {
    input.value = current - 1;
  }
}

function incrementFitpassResult() {
  const input = document.getElementById("fitpassCountResult");
  const current = parseInt(input.value) || 0;
  input.value = current + 1;
  syncFitpassAndCalculate();
}

function decrementFitpassResult() {
  const input = document.getElementById("fitpassCountResult");
  const current = parseInt(input.value) || 0;
  if (current > 0) {
    input.value = current - 1;
    syncFitpassAndCalculate();
  }
}

function syncFitpassAndCalculate() {
  const resultInput = document.getElementById("fitpassCountResult");
  const mainInput = document.getElementById("fitpassCount");
  state.fitpassCount = parseInt(resultInput.value) || 0;
  mainInput.value = state.fitpassCount;
  calculate();
}

function incrementSnap() {
  const input = document.getElementById("snapCount");
  const current = parseInt(input.value) || 0;
  input.value = current + 1;
}

function decrementSnap() {
  const input = document.getElementById("snapCount");
  const current = parseInt(input.value) || 0;
  if (current > 0) {
    input.value = current - 1;
  }
}

function incrementSnapResult() {
  const input = document.getElementById("snapCountResult");
  const current = parseInt(input.value) || 0;
  input.value = current + 1;
  syncSnapAndCalculate();
}

function decrementSnapResult() {
  const input = document.getElementById("snapCountResult");
  const current = parseInt(input.value) || 0;
  if (current > 0) {
    input.value = current - 1;
    syncSnapAndCalculate();
  }
}

function syncSnapAndCalculate() {
  const resultInput = document.getElementById("snapCountResult");
  const mainInput = document.getElementById("snapCount");
  state.snapCount = parseInt(resultInput.value) || 0;
  mainInput.value = state.snapCount;
  calculate();
}

function incrementUnpaidLeaves() {
  const input = document.getElementById("unpaidLeavesCount");
  const current = parseInt(input.value) || 0;
  input.value = current + 1;
}

function decrementUnpaidLeaves() {
  const input = document.getElementById("unpaidLeavesCount");
  const current = parseInt(input.value) || 0;
  if (current > 0) {
    input.value = current - 1;
  }
}

function handleSnapArrowKeys(event) {
  const input = document.getElementById("snapCount");
  const current = parseInt(input.value) || 0;

  if (event.key === "ArrowUp" || event.key === "ArrowRight") {
    event.preventDefault();
    input.value = current + 1;
  } else if (event.key === "ArrowDown" || event.key === "ArrowLeft") {
    event.preventDefault();
    if (current > 0) {
      input.value = current - 1;
    }
  }
}

function handleUnpaidLeavesArrowKeys(event) {
  const input = document.getElementById("unpaidLeavesCount");
  const current = parseInt(input.value) || 0;

  if (event.key === "ArrowUp") {
    event.preventDefault();
    input.value = current + 1;
  } else if (event.key === "ArrowDown") {
    event.preventDefault();
    if (current > 0) {
      input.value = current - 1;
    }
  }
}

function incrementUnpaidLeavesResult() {
  const input = document.getElementById("unpaidLeavesCountResult");
  const current = parseInt(input.value) || 0;
  input.value = current + 1;
  syncUnpaidLeavesAndCalculate();
}

function decrementUnpaidLeavesResult() {
  const input = document.getElementById("unpaidLeavesCountResult");
  const current = parseInt(input.value) || 0;
  if (current > 0) {
    input.value = current - 1;
    syncUnpaidLeavesAndCalculate();
  }
}

function syncUnpaidLeavesAndCalculate() {
  const resultInput = document.getElementById("unpaidLeavesCountResult");
  const mainInput = document.getElementById("unpaidLeavesCount");
  state.unpaidLeavesCount = parseInt(resultInput.value) || 0;
  mainInput.value = state.unpaidLeavesCount;
  calculate();
}

function selectTier(tier) {
  const canonical = [1, 7]; 
  state.months = canonical[tier];
  [0, 1].forEach((i) =>
    document.getElementById(`tierBtn${i}`).classList.toggle("active", i === tier),
  );
}


function dotClick(n) {
  
  if (n <= maxVisited) setStep(n);
}

function goStep(n) {
  if (n === 1) {
    if (!state.role) {
      document.getElementById("roleErr").style.display = "block";
      return;
    }
    buildMonthGrid();
  }
  if (n === 2) {
    if (state.months === null || state.monthIdx === null) {
      document.getElementById("detailErr").style.display = "block";
      return;
    }
    document.getElementById("detailErr").style.display = "none";
  }
  if (n > maxVisited) maxVisited = n;
  setStep(n);
}

function setStep(n) {
  document
    .querySelectorAll(".step")
    .forEach((s, i) => s.classList.toggle("active", i === n));
  [0, 1, 2, 3].forEach((i) => {
    const dot = document.getElementById("dot" + i),
      lbl = document.getElementById("lbl" + i);
    dot.classList.remove("active", "done", "clickable");
    lbl.classList.remove("active", "clickable");

    if (i < n) {
      dot.classList.add("done");
      dot.textContent = "✓";
      if (i <= maxVisited) {
        dot.classList.add("clickable");
        lbl.classList.add("clickable");
      }
    } else if (i === n) {
      dot.classList.add("active");
      dot.textContent = String(i + 1).padStart(2, "0");
      lbl.classList.add("active");
    } else {
      dot.textContent = String(i + 1).padStart(2, "0");
      if (i <= maxVisited) {
        dot.classList.add("clickable");
        lbl.classList.add("clickable");
      }
    }

    if (i < 3)
      document.getElementById("line" + i).classList.toggle("done", i < n);
  });
}


function getHourlyRate() {
  const tier = getTier(state.months),
    m = MONTHS[state.monthIdx];
  if (state.role === "SA" || state.role === "PT SA") return m.rates[tier];
  if (state.role === "SSL") return SSL_NET / m.hours;
  return SL_NET / m.hours; 
}
function getBaseSalary() {
  const tier = getTier(state.months);
  if (state.role === "SA") return SA_NET[tier];
  if (state.role === "PT SA") return SA_NET[tier] * 0.5;
  if (state.role === "SSL") return SSL_NET;
  return SL_NET; 
}
function getGrossSalary() {
  const tier = getTier(state.months);
  if (state.role === "SA") return SA_GROSS[tier];
  if (state.role === "PT SA") return SA_GROSS[tier] * 0.5;
  if (state.role === "SSL") return SSL_GROSS;
  if (state.role === "SL") return SL_GROSS;
  return null;
}

function getVal(id) {
  return parseFloat(document.getElementById(id).value) || 0;
}

function calculate() {
  state.adds.night = getVal("add_night");
  state.adds.holiday = getVal("add_holiday");
  state.adds.holidaynight = getVal("add_holidaynight");
  state.adds.ot = getVal("add_ot");
  state.fitpassCount =
    parseInt(document.getElementById("fitpassCount").value) || 0;
  state.snapCount = parseInt(document.getElementById("snapCount").value) || 0;
  state.unpaidLeavesCount =
    parseInt(document.getElementById("unpaidLeavesCount").value) || 0;

  const base = getBaseSalary(),
    hourly = getHourlyRate(),
    m = MONTHS[state.monthIdx],
    gross = getGrossSalary();

  const nightAmt = state.adds.night * hourly * 1.4;
  const holidayAmt = state.adds.holiday * hourly * 1.25;
  const holidaynightAmt = state.adds.holidaynight * hourly * 1.5;
  const otAmt = state.adds.ot * hourly * 2.0;

  
  const dailyRate = hourly * (m.hours / 22);
  const unpaidLeavesAmt = state.unpaidLeavesCount * dailyRate;

  const totalAdds = nightAmt + holidayAmt + holidaynightAmt + otAmt;
  const deductions =
    getInsuranceDeduction() +
    state.fitpassCount * 88 +
    state.snapCount * 149 +
    unpaidLeavesAmt;
  const total = base + totalAdds - deductions;

  renderResult(base, gross, hourly, totalAdds, deductions, total, m, {
    nightAmt,
    holidayAmt,
    holidaynightAmt,
    otAmt,
    unpaidLeavesAmt,
  });
  if (3 > maxVisited) maxVisited = 3;
  setStep(3);
}

function renderResult(
  base,
  gross,
  hourly,
  totalAdds,
  deductions,
  total,
  m,
  adds,
) {
  const payDate = PAYMENT_DATES[state.monthIdx];
  const tierStr = getTierLabel(state.months);
  const hoursUsed = state.role === "PT SA" ? m.hours / 2 : m.hours;

  const grossLine = gross
    ? `<div class="result-gross">GROSS ₾${gross.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · before tax</div>`
    : "";

  const addDefs = [
    { label: "🌙 Night", val: adds.nightAmt },
    { label: "🎌 Bank Holiday", val: adds.holidayAmt },
    { label: "🌙🎌 Holiday Night", val: adds.holidaynightAmt },
    { label: "⏱ Overtime", val: adds.otAmt },
  ];
  const addRows = addDefs
    .filter((a) => a.val > 0)
    .map(
      (a) =>
        `<div class="result-row"><span class="result-row-label">${a.label}</span><span class="result-row-val positive">+${a.val.toFixed(2)} ₾</span></div>`,
    )
    .join("");

  document.getElementById("resultContent").innerHTML = `
      <div class="step-title" style="margin-bottom:6px">Your Salary</div>
      <div class="step-hint" style="margin-bottom:20px">For ${m.name} — paid on ${payDate}</div>

      <div class="summary-chips">
        <span class="chip accent">${state.role}</span>
        <span class="chip">${tierStr}</span>
        <span class="chip">${m.name} · ${hoursUsed}h</span>
        <span class="chip">${hourly.toFixed(4)} ₾/h</span>
      </div>

      <div class="payment-info">
        <span class="payment-icon">📅</span>
        <div>
          <div class="payment-date">${payDate}</div>
          <div class="payment-desc">Expected payment date · may shift if weekend or Georgian public holiday</div>
        </div>
      </div>

      <div class="result-card">
        <div class="result-header">
          <div>
            <div class="result-label">Net Pay</div>
            <div class="result-net-amount"><span class="result-net-currency">₾</span><span id="netAmt">${total.toFixed(2)}</span></div>
            ${grossLine}
          </div>
          <div style="text-align:right">
            <div class="result-label">Base (net)</div>
            <div style="font-family:'Nunito',sans-serif;font-weight:600;font-size:16px;color:var(--text)">${base.toFixed(2)} ₾</div>
          </div>
        </div>
        <div class="result-body">
          <div class="result-row"><span class="result-row-label">Base Salary</span><span class="result-row-val">${base.toFixed(2)} ₾</span></div>
          ${addRows}
          ${totalAdds > 0 ? `<div class="result-row"><span class="result-row-label">Total Additions</span><span class="result-row-val positive">+${totalAdds.toFixed(2)} ₾</span></div>` : ""}
          ${(() => {
            const insDed = getInsuranceDeduction();
            if (!state.insType || insDed === 0) return "";
            const familyLabel =
              state.insFamilyAddon === "two"
                ? "Two-Member Family · "
                : state.insFamilyAddon === "full"
                  ? "Full Family · "
                  : "";
            return `<div class="result-row"><span class="result-row-label">${familyLabel}${state.insType} Insurance</span><span class="result-row-val negative">−${insDed.toFixed(2)} ₾</span></div>`;
          })()}
          ${state.fitpassCount > 0 ? `<div class="result-row"><span class="result-row-label">FitPass (${state.fitpassCount}x)</span><span class="result-row-val negative">−${(state.fitpassCount * 88).toFixed(2)} ₾</span></div>` : ""}
          ${state.snapCount > 0 ? `<div class="result-row"><span class="result-row-label">Snap (${state.snapCount}x)</span><span class="result-row-val negative">−${(state.snapCount * 149).toFixed(2)} ₾</span></div>` : ""}
          ${state.unpaidLeavesCount > 0 ? `<div class="result-row"><span class="result-row-label">Unpaid Leaves (${state.unpaidLeavesCount}d)</span><span class="result-row-val negative">−${adds.unpaidLeavesAmt.toFixed(2)} ₾</span></div>` : ""}
          <div class="result-final-row">
            <span class="result-final-label">Final Amount</span>
            <span class="result-final-value" id="finalAmt">₾${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div class="edit-section">
        <div class="edit-section-title">Edit Deductions</div>
        ${renderInsuranceEditRows()}
        <div class="toggle-row">
          <div class="toggle-left">
            <span class="toggle-name">FitPass Subscriptions</span><span class="toggle-meta">−88.00 GEL / subscription / month</span>
          </div>
          <div class="fitpass-control">
            <button class="fitpass-btn" onclick="decrementFitpassResult()">−</button>
            <input
              type="number"
              id="fitpassCountResult"
              value="${state.fitpassCount}"
              placeholder="0"
              min="0"
              style="
                width: 50px;
                flex-shrink: 0;
                border: 1px solid var(--border2);
                border-radius: 6px;
                padding: 8px 4px;
                background: var(--input-bg);
                color: var(--text);
                font-family: 'Nunito', sans-serif; font-weight: 600;
                text-align: center;
              "
              onchange="syncFitpassAndCalculate()"
            />
            <button class="fitpass-btn" onclick="incrementFitpassResult()">+</button>
          </div>
        </div>
        <div class="toggle-row">
          <div class="toggle-left">
            <span class="toggle-name">Snap Subscriptions</span><span class="toggle-meta">−149.00 GEL / subscription / month</span>
          </div>
          <div class="fitpass-control">
            <button class="fitpass-btn" onclick="decrementSnapResult()">−</button>
            <input
              type="number"
              id="snapCountResult"
              value="${state.snapCount}"
              placeholder="0"
              min="0"
              style="
                width: 50px;
                flex-shrink: 0;
                border: 1px solid var(--border2);
                border-radius: 6px;
                padding: 8px 4px;
                background: var(--input-bg);
                color: var(--text);
                font-family: 'Nunito', sans-serif; font-weight: 600;
                text-align: center;
              "
              onchange="syncSnapAndCalculate()"
            />
            <button class="fitpass-btn" onclick="incrementSnapResult()">+</button>
          </div>
        </div>
        <div class="toggle-row">
          <div class="toggle-left">
            <span class="toggle-name">Unpaid Leave Days</span><span class="toggle-meta">−1 day / month</span>
          </div>
          <div class="fitpass-control">
            <button class="fitpass-btn" onclick="decrementUnpaidLeavesResult()">−</button>
            <input
              type="number"
              id="unpaidLeavesCountResult"
              value="${state.unpaidLeavesCount}"
              placeholder="0"
              min="0"
              style="
                width: 50px;
                flex-shrink: 0;
                border: 1px solid var(--border2);
                border-radius: 6px;
                padding: 8px 4px;
                background: var(--input-bg);
                color: var(--text);
                font-family: 'Nunito', sans-serif; font-weight: 600;
                text-align: center;
              "
              onchange="syncUnpaidLeavesAndCalculate()"
            />
            <button class="fitpass-btn" onclick="incrementUnpaidLeavesResult()">+</button>
          </div>
        </div>
      </div>

      <div class="note-box">
        ✦ Payment date may be moved earlier if it falls on a Saturday, Sunday, or Georgian public holiday.
      </div>

      <div class="btn-row">
        <button class="btn btn-ghost" onclick="setStep(2)">← Edit Additions</button>
        <button class="btn btn-primary" onclick="resetAll()">New Calculation ✦</button>
      </div>
    `;

  
  
  const from = lastTotalShown;
  countUp(document.getElementById("netAmt"), from, total, "", 2);
  countUp(document.getElementById("finalAmt"), from, total, "₾", 2);
  lastTotalShown = total;
}

let lastTotalShown = 0;


function countUp(el, from, to, prefix, decimals) {
  if (!el) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || from === to) {
    el.textContent = prefix + to.toFixed(decimals);
    return;
  }
  const dur = 900;
  const start = performance.now();
  function frame(now) {
    const t = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - t, 3); 
    el.textContent = prefix + (from + (to - from) * eased).toFixed(decimals);
    if (t < 1) requestAnimationFrame(frame);
    else el.textContent = prefix + to.toFixed(decimals);
  }
  requestAnimationFrame(frame);
}

function resetAll() {
  state = {
    role: null,
    months: null,
    monthIdx: null,
    insType: "L",
    insFamilyAddon: null,
    fitpassCount: 0,
    snapCount: 0,
    unpaidLeavesCount: 0,
    adds: {},
  };
  maxVisited = 0;
  lastTotalShown = 0; 
  document
    .querySelectorAll(".option-card")
    .forEach((c) => c.classList.remove("selected"));
  [0, 1, 2].forEach((i) =>
    document.getElementById(`tierBtn${i}`).classList.remove("active"),
  );
  ["insLRow", "insXLRow"].forEach((id) =>
    document.getElementById(id).classList.remove("active"),
  );
  document.getElementById("insLRow").classList.add("active");
  ["insNoFamilyRow", "insTwoMemberRow", "insFullFamilyRow"].forEach((id) =>
    document.getElementById(id).classList.remove("active"),
  );
  document.getElementById("insNoFamilyRow").classList.add("active");
  document.getElementById("fitpassCount").value = "";
  document.getElementById("snapCount").value = "";
  document.getElementById("unpaidLeavesCount").value = "";
  ["add_night", "add_holiday", "add_holidaynight", "add_ot"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  setStep(0);
}


window.addEventListener("DOMContentLoaded", () => {
  const intro = document.getElementById("intro");
  if (!intro) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) {
    intro.classList.add("done");
    return;
  }
  intro.addEventListener("animationend", (e) => {
    if (e.animationName === "introLift") intro.classList.add("done");
  });
  setTimeout(() => intro.classList.add("done"), 2600); 
});

(function(){
  var EDITABLE_TAGS = ['INPUT','TEXTAREA','SELECT'];
  function isEditable(t){
    if(!t) return false;
    if(t.isContentEditable) return true;
    if(EDITABLE_TAGS.indexOf((t.tagName||'').toUpperCase())>=0) return true;
    if(t.closest && (t.closest('.CodeMirror') || t.closest('.cmp-ai-log'))) return true;
    return false;
  }
  document.addEventListener('contextmenu', function(e){
    if(isEditable(e.target)) return;
    e.preventDefault();
  });
  document.addEventListener('keydown', function(e){
    var k = (e.key||'').toLowerCase();
    if(e.key === 'F12'){ e.preventDefault(); return; }
    var mod = e.ctrlKey || e.metaKey;
    if(mod && e.shiftKey && (k==='i'||k==='j'||k==='c')){ e.preventDefault(); return; }
    if(mod && e.altKey  && (k==='i'||k==='j'||k==='c')){ e.preventDefault(); return; }
    if(mod && k==='u'){ e.preventDefault(); return; }
  });
})();
