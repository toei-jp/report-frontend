// リストで表示データを準備しとく
var subjectGroupData = _.map(
    _.filter(_.uniqBy(accountData, 'subjectGroupCd'), function(data) { return data.typeCode !== 'assets' }),
    function(data) {
        return _.pick(data, ['subjectGroupCd', 'subjectGroupName']);
    }
);
var subjectData = _.map(
    _.filter(_.uniqBy(accountData, 'subjectCd'), function(data) { return data.typeCode !== 'assets' }),
    function(data) {
        return _.pick(data, ['subjectCd', 'subjectName', 'subjectGroupCd']);
    }
);
var opponentSubjectData = _.map(
    _.filter(_.uniqBy(accountData, 'subjectDetailCd'), ['typeCode', 'assets']),
    function(data) {
        return _.pick(data, ['subjectDetailCd', 'subjectDetailName']);
    }
);
var subjectDetailData = _.map(
    _.filter(_.uniqBy(accountData, 'subjectDetailCd'), function(data) { return data.typeCode !== 'assets' }),
    function(data) {
        return _.pick(data, ['subjectDetailCd', 'subjectDetailName', 'subjectCd']);
    }
);

// メインアップロジック
var app = new Vue({
    el: '#app',
    data: {
        // 検索部分のデータ
        theaterCd: query.theaterCd || '',
        date: {
            date: 0,
            month: query.month || 0,
            year: query.year || 0
        },
        // メインデータ
        incomes: incomeData,
        // リスト表示ためのデータ
        accounts: accountData,
        subjects: subjectData,
        opponentSubjects: opponentSubjectData,
        subjectGroups: subjectGroupData,
        subjectDetails: subjectDetailData,
        screeningWorks: []
    },
    methods:{
        // 「日」リストを作る
        calculateDate: function(year, month) {
            if (year === 0 || month === 0) {
                return [];
            }
            var date = new Date(year, month - 1, 1);
            var dateArr = ['01'];
            for (var i = 2; i <= 31; i++) {
                date.setDate(i);
                if (date.getMonth() === month - 1) {
                    dateArr.push(this.padZero(i));
                }
            }
            if (dateArr.indexOf(this.date.date) < 0) {
                this.date.date = 0;
            }
            return dateArr;
        },
        // 検索のバリデーション
        search: function(e) {
            e.preventDefault();
            if (
                this.theaterCd  === ''
             || this.date.date  === 0
             || this.date.month === 0
             || this.date.year  === 0
            ) {
                alert('条件が足りません！');
            } else {
                document.getElementById('search-form').submit();
            }
        },
        // 日、月の前、０を追加する (2 => 02, 12 => 12)
        padZero: function(number) {
            return `0${number}`.slice(-2);
        },
        // 新行を追加する
        addRow: function() {
            var theater = document.getElementsByName('theaterCd')[0];
            var theaterName = theater.options[theater.selectedIndex].text;
            var data = {
                date: `${this.date.year}-${this.date.month}-${this.date.date}`,
                subjectCd: 0,
                subjectName: '',
                subjectGroupCd: 0,
                subjectGroupName: '',
                subjectDetailCd: 0,
                subjectDetailName: '',
                opponentSubjectCd: 0,
                opponentSubjectName: '',
                movieCd: 0,
                movieName: '',
                note: '',
                amount: 0,
                quantity: 0,
                theaterCd: this.theaterCd,
                theaterName: theaterName,
                isValid: true,
                id: this.id()
            };
            // 全ての日付と劇場は一緒になるため
            if (this.incomes.length > 0) {
                data.date = this.incomes[0].date;
                data.theaterCd = this.incomes[0].theaterCd;
                data.theaterName = this.incomes[0].theaterName;
            }
            this.incomes.push(data);
        },
        // データ削除
        deleteRow: function(row) {
            this.incomes.splice(row, 1);
        },
        // 上映作品データ更新
        updateScreeningWorkData: function(data) {
            this.screeningWorks = data;
        },
        // AJAXで上映作品データ取得
        updateScreeningWork: function(forceUpdate) {
            if ((this.theaterCd !== '' && this.incomes.length === 0) || forceUpdate) {
                var data = { 
                    date: `${this.date.year}-${this.date.month}-${this.date.date}`,
                    theaterCd: this.theaterCd
                };
                $.getJSON(
                    '/api/getScreeningWork',
                    data,
                    this.updateScreeningWorkData
                ).error(function() {
                    alert(`
                        劇場コード：${data.theaterCd}
                        日付：${data.date}
                        で上映作品データを取得できません。
                        再度試してください。
                    `);
                });
            }
        },
        // 科目分類を変更時、科目リストを再度作る必要がある
        generateSubjects: function(subjectGroupCd) {
            return _.filter(subjectData, function(subject) {
                return subject.subjectGroupCd === subjectGroupCd;
            });
        },
        // 科目を変更時、細目リストを再度作る必要がある
        generateSubjectDetails: function(subjectCd) {
            return _.filter(subjectDetailData, function(subjectDetail) {
                return subjectDetail.subjectCd === subjectCd;
            });
        },
        // 選択した項目をリセット
        resetSubject: function(subject, subjectDetail, index) {
            if (subject) {
                this.incomes[index].subjectCd = 0;
            }
            if (subjectDetail) {
                this.incomes[index].subjectDetailCd = 0;
            }
        },
        // 細目コードを入力した後、相応のデータを自動選択する
        searchSubjectDetailByCode: function(subjectDetailCd, index) {
            var found = _.find(accountData, function(data) {
                return data.subjectDetailCd === subjectDetailCd;
            });
            if (found !== undefined) {
                this.incomes[index].subjectGroupCd = found.subjectGroupCd;
                this.incomes[index].subjectCd = found.subjectCd;
            } else {
                this.incomes[index].subjectGroupCd = 0;
                this.incomes[index].subjectCd = 0;
                this.incomes[index].subjectDetailCd = 0;
                alert('入力した細目コードがありません。\n再度確認してください。');
            }
        },
        // ユニックIDを作る
        id: function() {
            // Math.random should be unique because of its seeding algorithm.
            // Convert it to base 36 (numbers + letters), and grab the first 9 characters
            // after the decimal.
            return Math.random().toString(36).substr(2, 9);
        },
        // データバリデーション
        submit: function() {
            var isValid = true;
            var movies = this.screeningWorks;
            _(this.incomes).each(function(income) {
                if (
                    // 選択していない項目があるかチェックする
                    income.subjectCd         === 0
                 || income.subjectGroupCd    === 0
                 || income.subjectDetailCd   === 0
                 || income.opponentSubjectCd === 0
                 || income.movieCd           === 0
                ) {
                    isValid = false;
                    income.isValid = false;
                } else {
                    // 検索時、undefinedと返却場合があるから、エラーをハンドルする
                    try {
                        income.subjectName = _(subjectData)
                        .find(['subjectCd', income.subjectCd]).subjectName;
                        income.subjectGroupName = _(subjectGroupData)
                            .find(['subjectGroupCd', income.subjectGroupCd]).subjectGroupName;
                        income.subjectDetailName = _(subjectDetailData)
                            .find(['subjectDetailCd', income.subjectDetailCd]).subjectDetailName;
                        income.opponentSubjectName = _(opponentSubjectData)
                            .find(['subjectDetailCd', income.opponentSubjectCd]).subjectDetailName;
                        income.movieName = _(movies)
                            .find(['screeningWorkId', income.movieCd]).screeningWorkName;
                        income.isValid = true;
                    } catch (err) {
                        console.error(err);
                        isValid = false;
                        income.isValid = false;
                    }
                }
            });
            if (isValid) {
                // OK => AJAXでデータをサーバに流す
                console.log(this.incomes);
                $.ajax('/api/saveIncomes', {
                    method: 'POST',
                    data: { data: this.incomes }
                });
            } else {
                // NG
                alert('情報が足りません。再度確認してください。');
            }
        }
    },
    created: function() {
        // リストを初期化後で値をセットする
        this.date.date = query.date;
        if (
            this.date.date === 0 ||
            this.date.month === 0 ||
            this.date.year === 0
        ) {
            var d = new Date();
            this.date = {
                date: this.padZero(d.getDate()),
                month: this.padZero(d.getMonth() + 1),
                year: d.getFullYear()
            }
        }
        // 上映作品リストを取得
        this.updateScreeningWork(true);
        // データにステートを追加する
        _(this.incomes).each(function(i) { i.isValid = true });
    }
});
