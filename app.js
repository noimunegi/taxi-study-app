const App = {
    // 状態管理
    state: {
        darkMode: false,
        currentSetId: null,
        currentQuestionIndex: 0,
        isFlipped: false,
        shuffleMode: false,
        isTestMode: false,
        testScore: 0,
        questions: [], // 現在の問題リスト
        progress: {}, // { setId: lastIndex }
        reviewQuestionIds: [], // ["setId_questionN", ...]
        testHistory: [] // [{date: 'MM/DD', percent: 85}, ...]
    },

    // 初期化
    init() {
        this.loadState();
        this.renderSetList();
        this.applyDarkMode();
        this.bindEvents();
        console.log("App initialized");
    },

    // ストレージから読み込み
    loadState() {
        const saved = localStorage.getItem('taxi_study_state');
        if (saved) {
            const parsed = JSON.parse(saved);
            this.state.darkMode = parsed.darkMode || false;
            this.state.shuffleMode = parsed.shuffleMode || false;
            this.state.progress = parsed.progress || {};
            this.state.reviewQuestionIds = parsed.reviewQuestionIds || [];
            this.state.testHistory = parsed.testHistory || [];
        }
    },

    // ストレージへ保存
    saveState() {
        localStorage.setItem('taxi_study_state', JSON.stringify({
            darkMode: this.state.darkMode,
            shuffleMode: this.state.shuffleMode,
            progress: this.state.progress,
            reviewQuestionIds: this.state.reviewQuestionIds,
            testHistory: this.state.testHistory
        }));
    },

    // ダークモード適用
    applyDarkMode() {
        const toggleBtn = document.getElementById('dark-mode-toggle');
        if (this.state.darkMode) {
            document.body.classList.add('dark-mode');
            toggleBtn.innerHTML = '<span class="icon">☀️</span>';
        } else {
            document.body.classList.remove('dark-mode');
            toggleBtn.innerHTML = '<span class="icon">🌙</span>';
        }
    },

    // 画面切り替え
    switchScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
        
        // テストモードクラスの着脱
        if (this.state.isTestMode) {
            document.body.classList.add('is-test-mode');
            document.getElementById('test-controls').style.display = 'grid';
        } else {
            document.body.classList.remove('is-test-mode');
            document.getElementById('test-controls').style.display = 'none';
        }

        // ヘッダータイトルの更新
        const titleEl = document.getElementById('screen-title');
        if (screenId === 'study-screen') {
            if (this.state.isTestMode) {
                titleEl.textContent = "実力テスト";
            } else if (this.state.currentSetId === 'review') {
                titleEl.textContent = "復習問題";
            } else {
                const set = studyData.find(d => d.id === this.state.currentSetId);
                titleEl.textContent = set ? set.title : "学習中";
            }
        } else {
            titleEl.textContent = "タクシー法令対策";
        }
    },

    // セットリストの描画
    renderSetList() {
        this.renderHistoryGraph(); // グラフを描画

        const container = document.getElementById('set-list');
        container.innerHTML = '';
        
        // 1. 復習問題セットを最初に追加（あれば）
        if (this.state.reviewQuestionIds.length > 0) {
            const reviewItem = document.createElement('div');
            reviewItem.className = 'set-item review-set';
            reviewItem.style.border = '2px solid #ef4444';
            reviewItem.innerHTML = `
                <div class="set-info">
                    <h3 style="color:#ef4444;">🔥 復習問題</h3>
                    <p>間違えた・自信がない問題 (${this.state.reviewQuestionIds.length}問)</p>
                </div>
                <div class="chevron">›</div>
            `;
            reviewItem.onclick = () => this.startStudy('review');
            container.appendChild(reviewItem);
        }

        // 2. 通常のセットを追加
        studyData.forEach(set => {
            const lastIndex = this.state.progress[set.id] || 0;
            const progressPercent = Math.round((lastIndex / (set.questions.length - 1)) * 100);
            
            const item = document.createElement('div');
            item.className = 'set-item';
            item.innerHTML = `
                <div class="set-info">
                    <h3>${set.title}</h3>
                    <p>${set.description}</p>
                    <p class="progress-info">${progressPercent}% 完了 (前回: 問${lastIndex + 1})</p>
                </div>
                <div class="chevron">›</div>
            `;
            item.onclick = () => this.startStudy(set.id);
            container.appendChild(item);
        });
    },

    // テスト開始
    startTest() {
        this.state.isTestMode = true;
        this.state.testScore = 0;
        this.state.currentSetId = 'test';
        
        // 全問題から○×問題を抽出
        let allOxQuestions = [];
        studyData.forEach(set => {
            set.questions.forEach(q => {
                if (q.a === 'O' || q.a === 'X') {
                    // IDを付与してコピー
                    allOxQuestions.push({
                        ...q,
                        _setId: set.id,
                        _uid: `${set.id}_${q.n}`
                    });
                }
            });
        });

        // シャッフルして40問選ぶ
        this.shuffleArray(allOxQuestions);
        this.state.questions = allOxQuestions.slice(0, 40);
        this.state.currentQuestionIndex = 0;
        this.state.isFlipped = false;

        this.updateQuestionUI();
        this.switchScreen('study-screen');
    },

    // 学習開始
    startStudy(setId) {
        this.state.isTestMode = false;
        this.state.currentSetId = setId;
        
        if (setId === 'review') {
            // 復習問題リストを作成
            const reviewQuestions = [];
            this.state.reviewQuestionIds.forEach(uid => {
                const parts = uid.split('_');
                const sId = parts[0];
                const qN = parts.slice(1).join('_'); // 問2-1などの形式に対応
                const set = studyData.find(d => d.id === sId);
                if (set) {
                    const q = set.questions.find(item => String(item.n) === qN);
                    if (q) {
                        reviewQuestions.push({
                            ...q,
                            _setId: sId,
                            _uid: uid
                        });
                    }
                }
            });
            this.state.questions = reviewQuestions;
        } else {
            const set = studyData.find(d => d.id === setId);
            this.state.questions = set.questions.map(q => ({
                ...q,
                _setId: setId,
                _uid: `${setId}_${q.n}`
            }));
        }

        if (this.state.shuffleMode && setId !== 'review') {
            this.shuffleArray(this.state.questions);
        }

        this.state.currentQuestionIndex = (setId === 'review' || this.state.shuffleMode) ? 0 : (this.state.progress[setId] || 0);
        this.state.isFlipped = false;
        
        document.getElementById('shuffle-toggle').checked = this.state.shuffleMode;
        
        this.updateQuestionUI();
        this.switchScreen('study-screen');
    },

    // 回答処理 (テストモード)
    handleTestAnswer(userChoice) {
        if (!this.state.isTestMode) return;

        const q = this.state.questions[this.state.currentQuestionIndex];
        const isCorrect = userChoice === q.a;

        if (isCorrect) {
            this.state.testScore++;
        } else {
            // 間違い、または「？」なら復習リストに追加
            this.addToReview(q._uid);
        }

        // 次の問題へ
        if (this.state.currentQuestionIndex < this.state.questions.length - 1) {
            this.state.currentQuestionIndex++;
            this.updateQuestionUI();
        } else {
            this.showTestResult();
        }
    },

    // 復習リストに追加
    addToReview(uid) {
        if (!this.state.reviewQuestionIds.includes(uid)) {
            this.state.reviewQuestionIds.push(uid);
            this.saveState();
        }
    },

    // 復習リストから削除
    removeFromReview(uid) {
        this.state.reviewQuestionIds = this.state.reviewQuestionIds.filter(id => id !== uid);
        this.saveState();
        
        if (this.state.currentSetId === 'review') {
            // 復習モード中なら表示を更新
            if (this.state.reviewQuestionIds.length === 0) {
                this.switchScreen('set-selection-screen');
                this.renderSetList();
            } else {
                // 現在の問題をリストから取り除き、インデックスを調整
                this.state.questions = this.state.questions.filter(q => q._uid !== uid);
                if (this.state.currentQuestionIndex >= this.state.questions.length) {
                    this.state.currentQuestionIndex = Math.max(0, this.state.questions.length - 1);
                }
                this.updateQuestionUI();
            }
        }
    },

    // 結果表示
    showTestResult() {
        const score = this.state.testScore;
        const total = this.state.questions.length;
        const percent = Math.round((score / total) * 100);

        // 履歴に保存
        const today = new Date();
        const dateStr = `${today.getMonth() + 1}/${today.getDate()}`;
        this.state.testHistory.push({ date: dateStr, percent: percent });
        // 最大15件まで保持
        if (this.state.testHistory.length > 15) {
            this.state.testHistory.shift();
        }
        this.saveState();

        document.getElementById('result-score').textContent = `${percent}%`;
        document.getElementById('result-correct').textContent = score;
        document.getElementById('result-total').textContent = total;
        
        const msg = percent === 100 ? "素晴らしい！満点です！" : (percent >= 80 ? "合格圏内です！その調子！" : "あと少し！間違えた問題を復習しましょう。");
        document.getElementById('result-message').textContent = msg;

        document.getElementById('test-result-overlay').style.display = 'flex';
    },

    // グラフの描画
    renderHistoryGraph() {
        const container = document.getElementById('history-graph-container');
        const barsContainer = document.getElementById('history-graph-bars');
        
        if (!this.state.testHistory || this.state.testHistory.length === 0) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'block';
        barsContainer.innerHTML = '';

        this.state.testHistory.forEach(record => {
            const barItem = document.createElement('div');
            barItem.className = 'bar-item';
            
            const isPerfect = record.percent === 100;
            const fillClass = isPerfect ? 'bar-fill perfect' : 'bar-fill';
            
            barItem.innerHTML = `
                <div class="bar-value">${record.percent}%</div>
                <div class="${fillClass}" style="height: ${record.percent}%;"></div>
                <div class="bar-date">${record.date}</div>
            `;
            barsContainer.appendChild(barItem);
        });

        // 常に最新（右側）にスクロールしておく
        setTimeout(() => {
            barsContainer.scrollLeft = barsContainer.scrollWidth;
        }, 50);
    },

    // 配列のシャッフル
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    },

    // 問題表示の更新
    updateQuestionUI() {
        const q = this.state.questions[this.state.currentQuestionIndex];
        if (!q) return;
        
        const card = document.getElementById('question-card');
        card.classList.remove('is-flipped');
        this.state.isFlipped = false;

        document.getElementById('question-number').textContent = `問 ${q.n}`;
        document.getElementById('question-text').innerHTML = q.q;
        document.getElementById('question-type').textContent = q.style === 'fill' ? "穴埋め問題" : "⚪︎×問題";

        // 解答（裏面）の更新
        const iconEl = document.getElementById('answer-icon');
        const labelEl = document.getElementById('answer-text');
        const explanationEl = document.getElementById('explanation-text');
        
        iconEl.textContent = q.a;
        iconEl.className = 'answer-icon ' + (q.a === 'O' ? 'is-o' : (q.a === 'X' ? 'is-x' : ''));
        if (q.a.length > 5) iconEl.classList.add('is-small'); else iconEl.classList.remove('is-small');

        labelEl.textContent = q.a === 'O' ? "正解：正しい" : (q.a === 'X' ? "正解：誤り" : "解答");
        explanationEl.innerHTML = q.ex || "解説はありません。";

        // 復習削除ボタンの表示制御
        const reviewArea = document.getElementById('review-action-area');
        if (this.state.currentSetId === 'review') {
            reviewArea.style.display = 'block';
        } else {
            reviewArea.style.display = 'none';
        }

        // 進捗バー
        const total = this.state.questions.length;
        const current = this.state.currentQuestionIndex + 1;
        document.getElementById('progress-bar').style.width = `${(current / total) * 100}%`;
        document.getElementById('progress-text').textContent = `${current}/${total}`;

        // ナビゲーションボタン
        document.getElementById('prev-btn').disabled = this.state.currentQuestionIndex === 0;
        document.getElementById('next-btn').textContent = current === total ? "完了" : "次へ";

        // 進捗保存
        if (!this.state.shuffleMode && !this.state.isTestMode && this.state.currentSetId !== 'review') {
            this.state.progress[this.state.currentSetId] = this.state.currentQuestionIndex;
            this.saveState();
        }
    },

    // イベントバインド
    bindEvents() {
        // ダークモード
        document.getElementById('dark-mode-toggle').onclick = () => {
            this.state.darkMode = !this.state.darkMode;
            this.applyDarkMode();
            this.saveState();
        };

        // テスト開始ボタン
        document.getElementById('start-test-btn').onclick = () => this.startTest();

        // カードめくり (テストモード以外)
        document.getElementById('question-card').onclick = () => {
            if (this.state.isTestMode) return;
            this.state.isFlipped = !this.state.isFlipped;
            document.getElementById('question-card').classList.toggle('is-flipped');
        };

        // テスト回答ボタン
        document.querySelectorAll('.test-answer-btn').forEach(btn => {
            btn.onclick = (e) => {
                const choice = e.currentTarget.getAttribute('data-answer');
                this.handleTestAnswer(choice);
            };
        });

        // 復習リストから外すボタン
        document.getElementById('remove-review-btn').onclick = (e) => {
            e.stopPropagation();
            const q = this.state.questions[this.state.currentQuestionIndex];
            if (q) this.removeFromReview(q._uid);
        };

        // 結果を閉じる
        document.getElementById('close-result-btn').onclick = () => {
            document.getElementById('test-result-overlay').style.display = 'none';
            this.switchScreen('set-selection-screen');
            this.renderSetList();
        };

        // 前へ
        document.getElementById('prev-btn').onclick = (e) => {
            e.stopPropagation();
            if (this.state.currentQuestionIndex > 0) {
                this.state.currentQuestionIndex--;
                this.updateQuestionUI();
            }
        };

        // 次へ
        document.getElementById('next-btn').onclick = (e) => {
            e.stopPropagation();
            if (this.state.currentQuestionIndex < this.state.questions.length - 1) {
                this.state.currentQuestionIndex++;
                this.updateQuestionUI();
            } else {
                this.switchScreen('set-selection-screen');
                this.renderSetList();
            }
        };

        // シャッフル切り替え
        document.getElementById('shuffle-toggle').onchange = (e) => {
            this.state.shuffleMode = e.target.checked;
            this.saveState();
            this.startStudy(this.state.currentSetId);
        };

        // リスタート
        document.getElementById('restart-btn').onclick = () => {
            if (confirm("最初からやり直しますか？")) {
                this.state.currentQuestionIndex = 0;
                this.updateQuestionUI();
            }
        };

        // メニューに戻る
        document.getElementById('back-to-menu').onclick = () => {
            this.switchScreen('set-selection-screen');
            this.renderSetList();
        };
    }
};

// 起動
document.addEventListener('DOMContentLoaded', () => {
    try {
        App.init();
    } catch (e) {
        console.error("App init error:", e);
        const main = document.getElementById('main-content');
        if (main) {
            main.innerHTML = `<div style="padding:2rem;color:red;background:white;margin:1rem;border-radius:1rem;">
                <h3>起動エラー</h3>
                <p>アプリの初期化に失敗しました。</p>
                <p style="font-size:0.8rem;">${e.message}</p>
                <button onclick="localStorage.clear();location.reload();">データをリセットして再試行</button>
            </div>`;
        }
    }
});
