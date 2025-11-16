import RNFS from 'react-native-fs';

type Extra = Record<string, unknown>;

export class AppLogger {
  private static dir = `${RNFS.DocumentDirectoryPath}/logs`;
  private static file = `${AppLogger.dir}/sudoku.log`;
  private static initialized = false;

  static async init(): Promise<void> {
    try {
      const exists = await RNFS.exists(AppLogger.dir);
      if (!exists) {
        await RNFS.mkdir(AppLogger.dir);
      }
      // 첫 줄에 부팅/앱 시작 마커 남김
      await AppLogger.append('APP', 'Logger initialized');
      AppLogger.initialized = true;
    } catch (e) {
      // 파일 로그 실패 시 콘솔로라도 남김(개발 단계 가시성)
      // eslint-disable-next-line no-console
      console.warn('[Logger] init failed:', e);
    }
  }

  static async info(tag: string, msg: string, extra?: Extra): Promise<void> {
    await AppLogger.append(tag, msg, extra);
  }

  static async error(tag: string, msg: string, extra?: Extra): Promise<void> {
    await AppLogger.append(tag, `ERROR: ${msg}`, extra);
  }

  private static async append(tag: string, msg: string, extra?: Extra) {
    const ts = new Date().toISOString();
    const line = `${ts} [${tag}] ${msg}${extra ? ' ' + JSON.stringify(extra) : ''}\n`;
    try {
      if (!AppLogger.initialized) {
        const exists = await RNFS.exists(AppLogger.dir);
        if (!exists) await RNFS.mkdir(AppLogger.dir);
      }
      await RNFS.appendFile(AppLogger.file, line, 'utf8');
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[Logger] write failed:', e);
    }
  }

  /** 필요 시 테스트/지원용으로 마지막 N라인 조회 */
  static async tail(lines = 200): Promise<string> {
    try {
      const exists = await RNFS.exists(AppLogger.file);
      if (!exists) return '';
      const content = await RNFS.readFile(AppLogger.file, 'utf8');
      const arr = content.trimEnd().split(/\r?\n/);
      return arr.slice(-lines).join('\n');
    } catch {
      return '';
    }
  }
}

export default AppLogger;