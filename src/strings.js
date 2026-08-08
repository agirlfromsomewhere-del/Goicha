// Centralized Japanese UI text. Every user-facing string in the app lives
// here so translations can be reviewed and fixed in one place.

export const appName = 'たんごカード';

export const t = {
  // Shared
  backToDecks: '← デッキ一覧',
  deckNameLabel: 'デッキ名',

  // Home / deck list
  home: {
    title: appName,
    installLink: 'iPhoneへのインストール方法',
    dictLink: '辞書で調べる',
    createDeckHeading: '新しいデッキを作成',
    createDeckAriaLabel: '新しいデッキを作成',
    createDeckButton: 'デッキを作成',
    deckCreated: (name) => `デッキ「${name}」を作成しました`,
    decksHeading: 'デッキ一覧',
    noDecks: 'デッキがまだありません。上で作成してください。',
    deckMeta: (cardCount, dueCount) => `カード${cardCount}枚、復習${dueCount}枚`,
  },

  // Deck detail
  deckDetail: {
    notFound: 'デッキが見つかりません。',
    status: (cardCount, dueCount) => `カード${cardCount}枚、復習${dueCount}枚`,
    addCard: 'カードを追加',
    startReview: (dueCount) => `復習を開始（${dueCount}枚）`,
    reviewAnyway: '復習する（期限のカードなし）',
    renameHeading: 'デッキ名を変更',
    renameAriaLabel: 'デッキ名を変更',
    saveName: '名前を保存',
    renamed: (name) => `デッキ名を「${name}」に変更しました`,
    deleteDeck: 'このデッキを削除',
    confirmDeleteDeck: (name) => `「${name}」とすべてのカードを削除しますか？この操作は取り消せません。`,
    cardsHeading: 'カード一覧',
    noCards: 'カードがまだありません。',
    deleteCard: '削除',
    deleteCardAriaLabel: (front) => `カードを削除: ${front}`,
    confirmDeleteCard: (front) => `このカードを削除しますか？\n\n${front}`,
    cardDeleted: 'カードを削除しました',
  },

  // Card editor
  cardEditor: {
    editHeading: 'カードを編集',
    addHeading: '新しいカードを追加',
    frontLabel: '表（質問・単語）',
    backLabel: '裏（答え・意味）',
    exampleLabel: '例文（任意）',
    saveChanges: '変更を保存',
    addCard: 'カードを追加',
    cardUpdated: 'カードを更新しました',
    cardAdded: 'カードを追加しました',
    sourceLink: '元の動画を見る',
  },

  // YouTube video capture
  youtubeCapture: {
    navLink: '動画からカードを作成',
    heading: '動画からカードを作成',
    urlLabel: 'YouTubeの動画URL',
    loadButton: '動画を読み込む',
    invalidUrl: '有効なYouTubeの動画URLを入力してください。',
    videoLoaded: '動画を読み込みました。',
    grabTimeButton: '現在の時間を記録',
    timeRecorded: (time) => `${time}を記録しました`,
    timeLabel: (time) => `記録した時間: ${time}`,
    noTimeYet: '時間はまだ記録されていません。',
    saveButton: 'カードを保存',
    cardSaved: 'カードを保存しました。動画はそのままです。続けて他の場面を保存できます。',
  },

  // Review session
  review: {
    heading: (deckName) => `復習中: ${deckName}`,
    frontSrHeading: '表',
    backSrHeading: '裏',
    progress: (current, total) => `${current}枚目 / ${total}枚`,
    nothingHeading: '復習するカードがありません',
    completeHeading: '復習完了',
    nothingMessage: 'このデッキには今復習が必要なカードがありません。',
    completeMessage: (count) => `${count}枚のカードを復習しました。`,
    backToDeck: 'デッキに戻る',
    completeAnnounce: (count) => `復習完了。${count}枚のカードを復習しました。`,
    showAnswer: '答えを見る',
    gradeGroupLabel: 'このカードを評価',
    grades: {
      again: 'もう一度',
      hard: '難しい',
      good: '普通',
      easy: '簡単',
    },
    marked: (label) => `「${label}」と評価しました`,
  },

  // Install instructions
  install: {
    heading: 'iPhoneへのインストール方法',
    intro:
      'ホーム画面に追加すると、専用アイコンのあるアプリのようにフルスクリーンで開けるようになり、インターネットに接続していなくても使えます。',
    steps: [
      'このページをSafariで開いてください（Chromeなど他のブラウザでは、iPhoneのホーム画面に追加できません）。',
      '画面下部にある「共有」ボタン（四角から矢印が上に伸びたアイコン）をタップします。',
      '表示されたメニューを下にスクロールし、「ホーム画面に追加」をタップします。',
      '右上の「追加」をタップします。',
      `Safariを閉じて、ホーム画面に追加された「${appName}」のアイコンを探してください。次回からはそこから開けます。`,
    ],
  },

  // Dictionary search
  dictSearch: {
    heading: '辞書',
    searchLabel: '調べたい言葉',
    prompt: '言葉を入力すると検索できます。',
    results: (count) => `${count}件見つかりました`,
    noResults: '見つかりませんでした',
  },

  // Dictionary entry
  dictEntry: {
    backToSearch: '← 辞書',
    definitionsHeading: '意味',
    exampleLabel: '例：',
    notFound: 'この言葉は見つかりませんでした。',
  },
};
