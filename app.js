const App = {
    // 状態管理
    state: {
        darkMode: false,
        currentSetId: null,
        currentQuestionIndex: 0,
        isFlipped: false,
        progress: {} // { setId: lastIndex }
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
            this.state.progress = parsed.progress || {};
        }
    },

    // ストレージへ保存
    saveState() {
        localStorage.setItem('taxi_study_state', JSON.stringify({
            darkMode: this.state.darkMode,
            progress: this.state.progress
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
        
        // ヘッダータイトルの更新
        const titleEl = document.getElementById('screen-title');
        if (screenId === 'study-screen') {
            const set = studyData.find(d => d.id === this.state.currentSetId);
            titleEl.textContent = set ? set.title : "学習中";
        } else {
            titleEl.textContent = "タクシー法令対策";
        }
    },

    // セットリストの描画
    renderSetList() {
        const container = document.getElementById('set-list');
        container.innerHTML = '';
        
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

    // 学習開始
    startStudy(setId) {
        this.state.currentSetId = setId;
        this.state.currentQuestionIndex = this.state.progress[setId] || 0;
        this.state.isFlipped = false;
        
        this.updateQuestionUI();
        this.switchScreen('study-screen');
    },

    // 問題表示の更新
    updateQuestionUI() {
        const set = studyData.find(d => d.id === this.state.currentSetId);
        const q = set.questions[this.state.currentQuestionIndex];
        
        // カードの初期化
        const card = document.getElementById('question-card');
        card.classList.remove('is-flipped');
        this.state.isFlipped = false;

        // 問題文の挿入
        document.getElementById('question-number').textContent = `問 ${q.n}`;
        document.getElementById('question-text').innerHTML = q.q;
        document.getElementById('question-type').textContent = q.style === 'fill' ? "穴埋め問題" : "⚪︎×問題";

        // 解答の挿入
        const iconEl = document.getElementById('answer-icon');
        const labelEl = document.getElementById('answer-text');
        
        iconEl.textContent = q.a;
        iconEl.className = 'answer-icon ' + (q.a === 'O' ? 'is-o' : (q.a === 'X' ? 'is-x' : ''));
        labelEl.textContent = q.a === 'O' ? "正解：正しい" : (q.a === 'X' ? "正解：誤り" : "解答");
        
        document.getElementById('explanation-text').innerHTML = q.ex || "解説はありません。";

        // 進捗バー
        const total = set.questions.length;
        const current = this.state.currentQuestionIndex + 1;
        document.getElementById('progress-bar').style.width = `${(current / total) * 100}%`;
        document.getElementById('progress-text').textContent = `${current}/${total}`;

        // ナビゲーションボタンの管理
        document.getElementById('prev-btn').disabled = this.state.currentQuestionIndex === 0;
        document.getElementById('next-btn').textContent = current === total ? "完了" : "次へ";

        // 進捗保存
        this.state.progress[this.state.currentSetId] = this.state.currentQuestionIndex;
        this.saveState();
    },

    // イベントバインド
    bindEvents() {
        // ダークモード
        document.getElementById('dark-mode-toggle').onclick = () => {
            this.state.darkMode = !this.state.darkMode;
            this.applyDarkMode();
            this.saveState();
        };

        // カードめくり
        document.getElementById('question-card').onclick = () => {
            this.state.isFlipped = !this.state.isFlipped;
            document.getElementById('question-card').classList.toggle('is-flipped');
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
            const set = studyData.find(d => d.id === this.state.currentSetId);
            if (this.state.currentQuestionIndex < set.questions.length - 1) {
                this.state.currentQuestionIndex++;
                this.updateQuestionUI();
            } else {
                alert("お疲れ様でした！このセットは完了です。");
                this.switchScreen('set-selection-screen');
                this.renderSetList();
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
