import { TextResources } from './texts_en';

export const TEXTS_KO: TextResources = {
    common: {
        confirm: '확인',
        cancel: '취소',
    },
    appName: 'Daily Sudoku',
    home: {
        newGame: '새 게임',
        continue: '이어하기',
        stats: '통계',
        settings: '설정',
        newGameWarning: '이어하기 데이터가 있습니다. 새 게임을 시작하면 데이터가 삭제됩니다. 계속하시겠습니까?',
    },
    game: {
        difficulty: {
            easy: '쉬움',
            medium: '보통',
            hard: '어려움',
            expert: '전문가',
        },
        overlayTitle: {
            pause: '일시정지',
            loss: '패배',
            success: '성공',
        },
        overlayButtons: {
            continue: '계속하기',
            restart: '다시하기',
            newGame: '새 게임',
            home: '홈으로',
        },
        mistakeCounter: (mistakes: number, limit: number) => `실수 ${mistakes}/${limit}`,
        actions: {
            undo: '되돌리기',
            erase: '지우개',
            hint: '힌트',
            note: '노트',
            padMode: '탭 입력',
        },
    },
    stats: {
        title: '나의 통계',
        tabs: {
            week: '이번 주',
            month: '이번 달',
            allTime: '전체',
        },
        summary: {
            gamesPlayed: '게임 수',
            winRate: '승률',
            winStreak: '연승',
            avgTime: '평균 시간',
        },
        ratio: {
            title: '승/패 비율',
            winsLabel: '승리',
            lossesLabel: '패배',
        },
        completed: {
            title: '완료된 게임',
            subtitle: '전체 기간',
        },
        bestTimes: {
            title: '최고 기록',
            easy: '쉬움',
            medium: '보통',
            hard: '어려움',
            expert: '전문가',
        },
    },
    settings: {
        title: '설정',
        language: '언어',
        account: '계정 정보',
        userId: '유저 ID',
        type: '유형',
        guest: '게스트 (익명)',
        google: '구글 계정',
        linkGoogle: '구글 계정을 연동하여 데이터를 안전하게 보관하세요.',
        signOut: '로그아웃',
        success: '성공',
        linked: '계정이 성공적으로 연동되었습니다!',
        loginFailed: '로그인 실패',
        loginFailedMsg: '구글 로그인에 실패했습니다.',
        loggedOut: '로그아웃됨',
        loggedOutMsg: '성공적으로 로그아웃되었습니다. 앱이 종료됩니다.',
        error: '오류',
        signOutFailed: '로그아웃에 실패했습니다.',
    },
    tutorial: {
        step1: {
            title: '목표 (Goal)',
            text: '스도쿠는 9x9 격자를 숫자로 채우는 게임입니다.\n각 칸에는 1부터 9까지의 숫자가 들어갑니다.',
        },
        step2: {
            title: '가로 규칙 (Row Rule)',
            text: '각 가로줄에는 1부터 9까지의 숫자가\n중복 없이 하나씩만 들어가야 합니다.\n\n빈 칸을 눌러 숫자를 채워보세요.',
        },
        step3: {
            title: '세로 규칙 (Column Rule)',
            text: '각 세로줄에도 1부터 9까지의 숫자가\n중복 없이 하나씩만 들어가야 합니다.',
        },
        step4: {
            title: '박스 규칙 (Box Rule)',
            text: '굵은 선으로 둘러싸인 3x3 박스 안에도\n1부터 9까지의 숫자가 중복 없이 들어갑니다.',
        },
        step5: {
            title: '기본 전략 (Cross-Hatching)',
            text: '가장 중요한 전략입니다!\n우측 상단 박스를 보세요.\n다른 박스의 5번 숫자가 가로/세로를 채우고 있어,\n5가 들어갈 수 있는 칸은 단 하나뿐입니다.',
        },
        step6: {
            title: '조작법 & 메모 (Controls & Notes)',
            text: '숫자 패드를 눌러 숫자를 입력합니다.\n연필 아이콘을 누르면 메모 모드가 되어\n후보 숫자를 작게 적어둘 수 있습니다.',
        },
        step7: {
            title: '실수 (Mistakes)',
            text: '잘못된 숫자를 입력하면 실수가 기록됩니다.\n3번 실수하면 게임이 종료되니 주의하세요!\n(튜토리얼에서는 괜찮습니다)',
        },
        buttons: {
            prev: '이전',
            next: '다음',
            complete: '완료',
        },
    },
};
