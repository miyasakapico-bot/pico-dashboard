/* =========================================================
   Pico Dashboard Ver1
   このファイルは「画面を動かす」「データを保存する」役目です。
   上から順番に読むと、処理の流れを追えるように分けています。
   ========================================================= */

// --- 1. アプリで使う基本設定 ---------------------------------

// localStorageに保存するときの名前です。将来Ver2にしても区別できます。
const STORAGE_KEY = "picoDashboard_v1";

// チェック項目をここにまとめると、後から項目を増やしやすくなります。
const HABITS = [
  { id: "stretch", label: "朝のストレッチ" },
  { id: "weight", label: "体重チェック" },
  { id: "tomako", label: "トマ子チェック" },
  { id: "work", label: "仕事" },
  { id: "itPassport", label: "ITパスポート" },
  { id: "english", label: "英語" },
  { id: "programming", label: "プログラミング" }
];

// 気分も配列にしておくと、将来の追加や並び替えが簡単です。
const MOODS = ["😊", "🙂", "😐", "😵‍💫", "😭", "🔥"];

// 今日を「2026-07-05」のような保存用の文字にします。
// toISOString()は時差で日付がずれる場合があるため、端末の年月日から作ります。
function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const todayKey = getDateKey();

// --- 2. 保存データを読み書きする関数 ---------------------------

// 保存済みデータを読みます。初回利用や壊れたデータの場合は空の形を返します。
function loadAppData() {
  try {
    const savedText = localStorage.getItem(STORAGE_KEY);
    return savedText ? JSON.parse(savedText) : { records: {} };
  } catch (error) {
    console.warn("保存データを読み込めませんでした。", error);
    return { records: {} };
  }
}

let appData = loadAppData();

// 古いデータなどでrecordsが無い場合にも安全に動くよう補います。
if (!appData.records) appData.records = {};

// その日のデータがまだ無ければ、最初の形を作ります。
function createEmptyRecord() {
  return {
    habits: {},
    note: "",
    mood: "",
    illustration: "",
    pofurin: ""
  };
}

if (!appData.records[todayKey]) {
  appData.records[todayKey] = createEmptyRecord();
}

// 何度も使うので、今日の記録に短い名前を付けます。
let todayRecord = appData.records[todayKey];

// データ全体をlocalStorageへ保存します。
function saveAppData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
    return true;
  } catch (error) {
    // 画像が多いと保存容量を超えることがあります。その場合は利用者へ伝えます。
    alert("保存容量がいっぱいのようです。古い画像を削除してから、もう一度お試しください。");
    console.error("データを保存できませんでした。", error);
    return false;
  }
}

// --- 3. 今日の日付を表示する ---------------------------------

function renderTodayDate() {
  const formatted = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short"
  }).format(new Date());

  // 端末によって入る空白を消し、例の「2026年7月5日（日）」に近づけます。
  document.getElementById("todayDate").textContent = formatted.replace(/\s/g, "");
}

// --- 4. 達成チェックを作る -----------------------------------

function renderHabits() {
  const habitList = document.getElementById("habitList");
  habitList.innerHTML = "";

  HABITS.forEach((habit) => {
    const label = document.createElement("label");
    label.className = "habit-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = Boolean(todayRecord.habits[habit.id]);

    const text = document.createElement("span");
    text.textContent = habit.label;

    if (checkbox.checked) label.classList.add("completed");

    checkbox.addEventListener("change", () => {
      todayRecord.habits[habit.id] = checkbox.checked;
      label.classList.toggle("completed", checkbox.checked);
      saveAppData();
      updateProgress();
      renderStudyStats();
      renderHistory();
    });

    label.append(checkbox, text);
    habitList.appendChild(label);
  });

  updateProgress();
}

// チェック数と達成率バーを更新します。
function updateProgress() {
  const completed = HABITS.filter((habit) => todayRecord.habits[habit.id]).length;
  const percent = Math.round((completed / HABITS.length) * 100);

  document.getElementById("achievementCount").textContent = `${completed} / ${HABITS.length} 達成`;
  document.getElementById("progressPercent").textContent = `${percent}%`;
  document.getElementById("progressBar").style.width = `${percent}%`;
  document.querySelector(".progress-track").setAttribute("aria-valuenow", percent);
}

// --- 5. 今日の一言を保存する ---------------------------------

const dailyNote = document.getElementById("dailyNote");
const noteCount = document.getElementById("noteCount");
const saveMessage = document.getElementById("saveMessage");

function prepareNote() {
  dailyNote.value = todayRecord.note || "";
  updateNoteCount();
}

function updateNoteCount() {
  noteCount.textContent = `${dailyNote.value.length} / 120`;
}

dailyNote.addEventListener("input", updateNoteCount);

document.getElementById("saveNoteButton").addEventListener("click", () => {
  todayRecord.note = dailyNote.value.trim();
  if (saveAppData()) {
    saveMessage.textContent = "保存しました ✓";
    renderHistory();
    window.setTimeout(() => { saveMessage.textContent = ""; }, 2200);
  }
});

// --- 6. 気分ボタンを作る -------------------------------------

function renderMoods() {
  const moodList = document.getElementById("moodList");
  moodList.innerHTML = "";

  MOODS.forEach((mood) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "mood-button";
    button.textContent = mood;
    button.setAttribute("aria-label", `気分 ${mood}`);
    button.classList.toggle("selected", todayRecord.mood === mood);

    button.addEventListener("click", () => {
      // 選択済みの同じ気分を押すと、選択を解除できます。
      todayRecord.mood = todayRecord.mood === mood ? "" : mood;
      saveAppData();
      renderMoods();
      renderHistory();
    });

    moodList.appendChild(button);
  });
}

// --- 7. 画像を縮小して保存する -------------------------------

// 大きな写真をそのまま保存するとlocalStorageが満杯になります。
// Canvas（画像を加工できる仕組み）で最大1200px、JPEG形式に縮小します。
function resizeImage(file, maxSize = 1200, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("画像を読み込めませんでした。"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("この画像形式には対応していません。"));
      image.onload = () => {
        let width = image.width;
        let height = image.height;
        const scale = Math.min(1, maxSize / Math.max(width, height));
        width = Math.round(width * scale);
        height = Math.round(height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");

        // 透過PNGが黒くならないよう、背景を白くしてから画像を描きます。
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// 画像欄は2つあるため、同じ処理を使い回せる関数にしています。
function setupImageArea({ inputId, previewId, removeId, dataField, emptyText }) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  const removeButton = document.getElementById(removeId);

  function renderPreview() {
    const imageData = todayRecord[dataField];
    preview.innerHTML = "";

    if (imageData) {
      const image = document.createElement("img");
      image.src = imageData;
      image.alt = dataField === "illustration" ? "今日のイラスト" : "今日のぽふりん";
      image.addEventListener("click", () => openModal(imageData));
      preview.appendChild(image);
      preview.classList.remove("empty");
      removeButton.classList.remove("hidden");
    } else {
      const text = document.createElement("span");
      text.textContent = emptyText;
      preview.appendChild(text);
      preview.classList.add("empty");
      removeButton.classList.add("hidden");
    }
  }

  input.addEventListener("change", async () => {
    const file = input.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("画像ファイルを選んでください。");
      input.value = "";
      return;
    }

    try {
      todayRecord[dataField] = await resizeImage(file);
      if (saveAppData()) {
        renderPreview();
        renderHistory();
      }
    } catch (error) {
      alert(error.message);
    } finally {
      // 同じ画像をもう一度選んでも反応できるよう入力欄を空にします。
      input.value = "";
    }
  });

  removeButton.addEventListener("click", () => {
    if (!confirm("この画像を削除しますか？")) return;
    todayRecord[dataField] = "";
    saveAppData();
    renderPreview();
    renderHistory();
  });

  renderPreview();
}

// --- 8. 画像を大きく表示する ---------------------------------

const imageModal = document.getElementById("imageModal");
const modalImage = document.getElementById("modalImage");

function openModal(imageData) {
  modalImage.src = imageData;
  imageModal.hidden = false;
  document.body.style.overflow = "hidden";
  document.getElementById("closeModal").focus();
}

function closeModal() {
  imageModal.hidden = true;
  modalImage.src = "";
  document.body.style.overflow = "";
}

document.getElementById("closeModal").addEventListener("click", closeModal);
imageModal.addEventListener("click", (event) => {
  if (event.target === imageModal) closeModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !imageModal.hidden) closeModal();
});

// --- 9. 勉強の累計と連続記録を計算する -------------------------

function countCompletedDays(habitId) {
  return Object.values(appData.records).filter((record) => record.habits?.[habitId]).length;
}

// 連続記録は「今日から過去へ」調べます。
// 今日がまだ未達なら、昨日からの連続を表示するようにしています。
function calculateStudyStreak() {
  let streak = 0;
  const date = new Date();
  const todayHasStudy = ["itPassport", "english", "programming"]
    .some((id) => todayRecord.habits[id]);

  if (!todayHasStudy) date.setDate(date.getDate() - 1);

  while (true) {
    const record = appData.records[getDateKey(date)];
    const studied = record && ["itPassport", "english", "programming"]
      .some((id) => record.habits?.[id]);
    if (!studied) break;
    streak += 1;
    date.setDate(date.getDate() - 1);
  }
  return streak;
}

function renderStudyStats() {
  const stats = [
    { icon: "📘", value: countCompletedDays("itPassport"), label: "ITパスポート達成日数" },
    { icon: "🌎", value: countCompletedDays("english"), label: "英語達成日数" },
    { icon: "💻", value: countCompletedDays("programming"), label: "プログラミング達成日数" },
    { icon: "🔥", value: calculateStudyStreak(), label: "勉強の連続記録" }
  ];

  const container = document.getElementById("studyStats");
  container.innerHTML = stats.map((stat) => `
    <div class="stat-item">
      <span class="stat-icon">${stat.icon}</span>
      <strong class="stat-value">${stat.value}<small>日</small></strong>
      <span class="stat-label">${stat.label}</span>
    </div>
  `).join("");
}

// --- 10. 過去7日分の履歴を表示する -----------------------------

function renderHistory() {
  const container = document.getElementById("historyList");
  container.innerHTML = "";

  for (let daysAgo = 0; daysAgo < 7; daysAgo += 1) {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    const key = getDateKey(date);
    const record = appData.records[key] || createEmptyRecord();
    const completed = HABITS.filter((habit) => record.habits?.[habit.id]).length;
    const percent = Math.round((completed / HABITS.length) * 100);

    const row = document.createElement("div");
    row.className = "history-row";

    const dateText = new Intl.DateTimeFormat("ja-JP", {
      month: "numeric", day: "numeric", weekday: "short"
    }).format(date).replace(/\s/g, "");

    // textContentを使うことで、一言に記号が入っても安全に表示できます。
    const dateElement = document.createElement("span");
    dateElement.className = "history-date";
    dateElement.textContent = `${dateText} ${record.mood || ""}`;

    const rateElement = document.createElement("span");
    rateElement.className = "history-rate";
    rateElement.textContent = `${completed} / ${HABITS.length}（${percent}%）`;

    const noteElement = document.createElement("span");
    noteElement.className = "history-note";
    noteElement.textContent = record.note || "一言はまだありません";

    const imageArea = document.createElement("div");
    if (record.illustration) {
      const image = document.createElement("img");
      image.className = "history-thumb";
      image.src = record.illustration;
      image.alt = `${dateText}のイラスト`;
      image.addEventListener("click", () => openModal(record.illustration));
      imageArea.appendChild(image);
    } else {
      imageArea.className = "no-image";
      imageArea.textContent = "画像なし";
    }

    row.append(dateElement, rateElement, noteElement, imageArea);
    container.appendChild(row);
  }
}

// --- 11. アプリ起動時に画面を整える -----------------------------

renderTodayDate();
renderHabits();
prepareNote();
renderMoods();

setupImageArea({
  inputId: "illustrationInput",
  previewId: "illustrationPreview",
  removeId: "removeIllustration",
  dataField: "illustration",
  emptyText: "まだ画像がありません"
});

setupImageArea({
  inputId: "pofurinInput",
  previewId: "pofurinPreview",
  removeId: "removePofurin",
  dataField: "pofurin",
  emptyText: "ぽふりんを保存しよう"
});

renderStudyStats();
renderHistory();

// 今日の空データも保存しておくことで、初回から安定して動きます。
saveAppData();
