import { TextResources } from './texts_en';

export const TEXTS_KO: TextResources = {
    common: {
        confirm: '확인',
        cancel: '취소',
        updateTitle: '업데이트 알림',
        updateMessage: '새로운 버전이 출시되었습니다. 최신 버전으로 업데이트해주세요.',
        updateNow: '지금 업데이트',
        updateLater: '나중에',
        home: '홈',
        records: '기록',
    },
    appName: 'Daily Sudoku',
    daily: {
        title: '오늘의 스도쿠',
        subtitle: '매일 새로운 퍼즐에 도전하세요!',
        playButton: '오늘의 퍼즐 시작',
        startAlertTitle: '오늘의 스도쿠 시작',
        startAlertMessage: '진행 중인 오늘의 스도쿠 게임이 있습니다. 새로 시작하시겠습니까? (기존 진행 상황은 삭제됩니다)',
        startAlertCancel: '취소',
        startAlertStart: '시작',
        rankTabs: {
            today: '오늘의 순위',
            streak: '연승 순위',
        },
    },
    tabs: {
        daily: '오늘의 스도쿠',
        home: '홈',
        records: '기록',
    },
    home: {
        newGame: '새 게임',
        continue: '이어하기',
        stats: '통계',
        settings: '설정',
        newGameAlertTitle: '새 게임',
        newGameAlertMessage: '이어하기 데이터가 있습니다. 새 게임을 시작하면 데이터가 삭제됩니다. 계속하시겠습니까?',
    },
    game: {
        difficulty: {
            beginner: '입문자',
            easy: '초보자',
            medium: '중급자',
            hard: '고급자',
            expert: '전문가',
            daily: '매일',
        },
        lockMessage: {
            easy: '입문자 난이도 3회 성공 시 열립니다',
            medium: '초보자 난이도 5회 성공 시 열립니다',
            hard: '중급자 난이도 7회 성공 시 열립니다',
            expert: '고급자 난이도 10회 성공 시 열립니다',
            unlockCondition: (difficulty: string, remaining: number) => `${difficulty} 난이도 ${remaining}회 더 성공 시 해금`,
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
            aiHint: 'AI 힌트',
        },
        techniques: {
            nakedSingle: {
                name: '네이키드 싱글 (Naked Single)',
                desc: '한 칸에 들어갈 수 있는 후보 숫자가 오직 하나뿐입니다. 다른 숫자는 들어갈 수 없습니다.',
            },
            hiddenSingle: {
                name: '히든 싱글 (Hidden Single)',
                desc: '특정 행, 열, 또는 박스 내에서 해당 숫자가 들어갈 수 있는 칸이 단 하나만 남았습니다.',
            },
            nakedPair: {
                name: '네이키드 페어 (Naked Pair)',
                desc: '같은 구역(행/열/박스) 내 두 칸이 동일한 두 개의 후보 숫자만 가지고 있습니다. 이 두 숫자는 해당 구역의 다른 칸에서 제거할 수 있습니다.',
            },
            nakedTriple: {
                name: '네이키드 트리플 (Naked Triple)',
                desc: '같은 구역 내 세 칸이 세 개의 후보 숫자 조합으로만 이루어져 있습니다. 이 숫자들은 해당 구역의 다른 칸에서 제거할 수 있습니다.',
            },
            hiddenPair: {
                name: '히든 페어 (Hidden Pair)',
                desc: '두 개의 후보 숫자가 같은 구역 내에서 오직 두 칸에만 등장합니다. 해당 두 칸에서는 이 두 숫자 외의 다른 후보를 제거할 수 있습니다.',
            },
            hiddenTriple: {
                name: '히든 트리플 (Hidden Triple)',
                desc: '세 개의 후보 숫자가 같은 구역 내에서 오직 세 칸에만 등장합니다. 해당 세 칸에서는 이 세 숫자 외의 다른 후보를 제거할 수 있습니다.',
            },
            pointing: {
                name: '포인팅 (Pointing)',
                desc: '박스 내에서 특정 숫자가 한 행이나 열에만 존재합니다. 해당 행이나 열의 다른 박스 영역에서 그 숫자를 제거할 수 있습니다.',
            },
            claiming: {
                name: '클레임 (Claiming)',
                desc: '행이나 열에서 특정 숫자가 한 박스 내에만 존재합니다. 해당 박스 내의 다른 줄에서 그 숫자를 제거할 수 있습니다.',
            },
            xWing: {
                name: 'X-윙 (X-Wing)',
                desc: '두 행(또는 열)에서 특정 숫자가 들어갈 수 있는 칸이 정확히 두 곳이며, 이들이 직사각형을 이룹니다. 나머지 모서리 방향의 칸에서 해당 숫자를 제거할 수 있습니다.',
            },
            yWing: {
                name: 'Y-윙 (Y-Wing)',
                desc: '세 칸이 각각 두 개의 후보를 가지며 연결된 형태입니다. 양 끝(Pincers)이 공통으로 바라보는 칸에서 특정 후보 숫자를 제거할 수 있습니다.',
            },
        },
    },
    stats: {
        title: '통계 및 순위',
        tabs: {
            statistics: '통계',
            rankings: '순위',
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
            beginner: '입문자',
            easy: '초보자',
            medium: '중급자',
            hard: '고급자',
            expert: '전문가',
        },
        rankings: {
            title: '순위표',
            rank: '순위',
            user: '사용자',
            score: '기록',
            noData: '순위 데이터가 없습니다.',
            metric: {
                bestTime: '최고 기록',
                winRate: '승률',
                wins: '승리 수',
            },
        },
        reset: {
            title: '기록 초기화',
            selectAll: '전체 선택',
            warningTitle: '경고',
            warningMessage: '선택한 난이도의 기록을 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
            success: '기록이 초기화되었습니다.',
            button: '초기화',
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
        bgm: '배경 음악',
        sfx: '효과음',
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
            title: '기본 전략 (Basic Strategy)',
            text: '가장 중요한 전략입니다!\n가로, 세로, 박스에 이미 있는 숫자를 확인하여\n빈 칸에 들어갈 수 있는 유일한 숫자를 찾아보세요.',
        },
        step6: {
            title: '조작법 & 메모 (Controls & Notes)',
            text: '숫자 패드를 눌러 숫자를 입력합니다.\n노트 아이콘을 누르면 메모 모드가 되어\n후보 숫자를 작게 적어둘 수 있습니다.',
        },
        step7: {
            title: '실수 (Mistakes)',
            text: '잘못된 숫자를 입력하면 실수가 기록됩니다.\n3번 실수하면 게임이 종료되니 주의하세요!\n(튜토리얼에서는 괜찮습니다)',
        },
        step8: {
            title: '실전 풀이 1 (Practice 1)',
            text: '두 번째 줄을 보세요. 7이 빠져 있습니다.\n빈 칸을 선택하고 7을 입력해보세요.',
        },
        step9: {
            title: '실전 풀이 2 (Practice 2)',
            text: '첫 번째 줄의 마지막 빈 칸입니다.\n이 줄에는 1이 빠져 있습니다.\n1을 입력하여 줄을 완성해보세요.',
        },
        step10: {
            title: '게임 시작 (Start Game)',
            text: '튜토리얼이 끝났습니다!\n이제 남은 빈 칸을 모두 채워보세요.\n행운을 빕니다!',
        },
        buttons: {
            prev: '이전',
            next: '다음',
            complete: '완료',
        },
    },
};
