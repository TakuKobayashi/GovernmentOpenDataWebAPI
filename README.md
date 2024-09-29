# GovernmentOpenDataWebAPI

政府がオープンデータとして公開しているデータを集めてWebAPIとして公開しているプロジェクト
公開しているAPIについては [こちら](https://takukobayashi.github.io/GovernmentOpenDataWebAPI/) のドキュメントを参照してください

* [行政オープンデータを収集して取得できるAPI一覧](https://takukobayashi.github.io/GovernmentOpenDataWebAPI/)

またAPI化する元となったデータは [こちら](https://github.com/TakuKobayashi/GovernmentOpenDataOrigin) のリポジトリにて管理しています。元データのダウンロードなどはこちらより行ってください(なお元データとなっているファイルの文字コードはできる限り `UTF-8` に変換していますファイルにしています)

* [GovernmentOpenDataOrigin](https://github.com/TakuKobayashi/GovernmentOpenDataOrigin)

# モチベーション

政府が公開しているデータは自治体ごとにフォーマットや文字コードがバラバラであるため
データをそのまま利用することは困難であるという課題があります。
そのため活用しやすいように文字コードを極力 `UTF-8` に統一して変換し、フォーマットをJSONの形にして `WebAPI` として取得できるようにしました。
さらに元データである行政のオープンデータを自動的に収集することで公開しているデータを豊富に取り扱えるようにしています。

# データの取得元

* [東京都オープンデータカタログサイト](https://portal.data.metro.tokyo.lg.jp/)