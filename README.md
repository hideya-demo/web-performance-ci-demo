# web-performance-ci-demo

GitHub Actions と Lighthouse を使って、  
Webページの変更がパフォーマンスに与える影響を Pull Request の段階で自動計測・比較するためのハンズオン用リポジトリです。

## 目的

Webページを変更して Pull Request を作成したときに、

1. GitHub Actions を起動
2. Self-hosted Runner 上で `main` と Pull Request の両方を起動
3. Lighthouse をそれぞれ複数回実行
4. 測定結果の中央値を算出
5. `main` と Pull Request の性能差・変化率を比較
6. GitHub Actions Summary に結果を表示
7. Performance Budget を超えた場合は CI を失敗させる

という仕組みを構築します。

目標は、

> この変更によってWebページの性能がどの程度変化したか

を、マージ前に確認できるようにすることです。

---

## 構成

```text
Pull Request
     |
     v
GitHub Actions
     |
     v
Self-hosted Runner
(WSL / Ubuntu)
     |
     +------------------------------+
     |                              |
     v                              v
main を checkout                PR を checkout
     |                              |
     v                              v
localhost:18001                localhost:18002
     |                              |
     v                              v
Lighthouse x 5                Lighthouse x 5
     |                              |
     v                              v
中央値を算出                    中央値を算出
     |                              |
     +--------------+---------------+
                    |
                    v
          main と PR を比較
                    |
                    v
        GitHub Actions Summary
                    |
                    v
          Performance Budget 判定
```

---

## 使用技術

- GitHub Actions
- GitHub Self-hosted Runner
- WSL2 / Ubuntu
- Google Chrome
- Lighthouse
- Node.js
- Python HTTP Server

---

## ディレクトリ構成

```text
web-performance-ci-demo/
├── site/
│   └── index.html
│
├── scripts/
│   ├── measure.sh
│   ├── render-summary.js
│   └── compare.js
│
├── .github/
│   └── workflows/
│       └── performance.yml
│
├── package.json
├── package-lock.json
└── README.md
```

### `site/`

性能測定対象となるWebページです。

GitHub Actions は `site/**` 配下に変更がある Pull Request のときだけ自動実行されます。

### `scripts/measure.sh`

Lighthouseを複数回実行し、各指標の中央値を算出します。

現在は5回測定しています。

主な測定項目:

- Performance Score
- FCP (First Contentful Paint)
- LCP (Largest Contentful Paint)
- Speed Index
- TBT (Total Blocking Time)
- CLS (Cumulative Layout Shift)
- TTFB

### `scripts/render-summary.js`

Lighthouseの測定結果をGitHub Actions Summary用のMarkdownに変換します。

### `scripts/compare.js`

`main` と Pull Request の測定結果を比較し、変化率を表示します。

また、Performance Budget の判定も行います。

---

## ローカルでの実行

### 1. Webサーバーを起動

```bash
python3 -m http.server 8000 \
  --bind 127.0.0.1 \
  --directory site
```

ブラウザから以下にアクセスできます。

```text
http://127.0.0.1:8000
```

### 2. Lighthouseを実行

別のターミナルから実行します。

```bash
./scripts/measure.sh
```

Lighthouseを5回実行し、中央値を表示します。

例:

```text
===== Lighthouse run 1/5 =====
===== Lighthouse run 2/5 =====
===== Lighthouse run 3/5 =====
===== Lighthouse run 4/5 =====
===== Lighthouse run 5/5 =====

===== Median of runs =====
Performance : 100
FCP         : 620 ms
LCP         : 620 ms
Speed Index : 620 ms
TBT         : 0 ms
CLS         : 0.000
TTFB        : 4 ms
```

---

## GitHub Actions

Pull Request で `site/**` 配下が変更されると、GitHub Actions が実行されます。

```text
site/ を変更
      |
      v
git push
      |
      v
Pull Request
      |
      v
GitHub Actions
      |
      v
Self-hosted Runner
      |
      +--> main を Lighthouse x 5
      |
      +--> PR を Lighthouse x 5
      |
      v
中央値を比較
      |
      v
変化率を表示
      |
      v
Performance Budget 判定
```

Self-hosted Runner はローカルPCのWSL上で動作します。

Webサーバーも GitHub Actions 内で自動起動・停止するため、Actions実行時に別ターミナルでWebサーバーを起動しておく必要はありません。

---

## 測定結果の比較

GitHub Actions Summary では、`main` と Pull Request の測定結果を横並びで比較します。

例:

```text
Metric        main      PR       Change
-----------------------------------------
Performance   100       100       0.0%
FCP           623 ms    622 ms   -0.2%
LCP           623 ms    622 ms   -0.2%
Speed Index   623 ms    622 ms   -0.2%
TBT             0 ms      0 ms    0
CLS           0.000     0.000     0
TTFB            7 ms      6 ms  -12.8%
```

`main` の過去の測定結果を保存して再利用するのではなく、Pull Request 実行時に `main` と PR の両方を同じ環境で測定します。

これにより、同じPC・同じLighthouseバージョン・ほぼ同じタイミングで比較できます。

---

## なぜ5回測定するのか

Webパフォーマンスの測定値は、

- CPU負荷
- OSのバックグラウンド処理
- Chromeの状態
- キャッシュ
- ディスクI/O

などの影響を受け、毎回完全に同じ値になるとは限りません。

そのため1回だけの値ではなく、複数回測定した**中央値**を利用しています。

---

## Performance Budget

現在は LCP の悪化率を Performance Budget として利用しています。

```text
LCP が main 比で 20%以上悪化
        ↓
Performance Budget 超過
        ↓
CI Failed
```

閾値は GitHub Actions の環境変数で設定します。

```yaml
env:
  LCP_BUDGET_PERCENT: 20
```

これにより、性能劣化を Pull Request の段階で検知できます。

---

## 現在の進捗

- [x] Lighthouseをローカルで実行
- [x] Lighthouseを5回実行して中央値を算出
- [x] GitHub ActionsからSelf-hosted Runnerを実行
- [x] `site/**` の変更をトリガーに性能測定
- [x] GitHub Actions Summaryへ測定結果を表示
- [x] `main` とPull Requestの性能を比較
- [x] 性能の変化率を表示
- [x] Performance Budgetを設定
- [ ] Performance Budget超過時にCIが失敗することを実際に確認

---

## 次に確認すること

意図的に性能を悪化させる変更を `site/` に加え、Performance Budget が正しく機能することを確認します。

例:

```html
<script>
const start = performance.now();

while (performance.now() - start < 1500) {
  // 意図的にメインスレッドをブロック
}
</script>
```

期待する動作:

```text
main
  LCP: 620 ms

PR
  LCP: 2000 ms
       |
       v
main比で20%以上悪化
       |
       v
CI Failed
```

---

## このリポジトリで試したいこと

Webパフォーマンスを、

> リリース後に問題が起きてから調べるもの

ではなく、

> コード変更時に継続的に確認するもの

として扱えるかを試します。
