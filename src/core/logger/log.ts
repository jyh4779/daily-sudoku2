// 공용 로거 래퍼: AppLogger + (옵션) 콘솔 미러링
import AppLogger from './AppLogger';

type Extra = Record<string, unknown> | undefined;

// 개발 중 콘솔도 보고 싶으면 true, 파일로만 남기려면 false
const ECHO_TO_CONSOLE = false;

function echo(level: 'log' | 'warn' | 'error', tag: string, msg: string, extra?: Extra) {
  if (!ECHO_TO_CONSOLE) return;
  // eslint-disable-next-line no-console
  console[level](`[${tag}] ${msg}${extra ? ' ' + JSON.stringify(extra) : ''}`);
}

export async function log(tag: string, msg: string, extra?: Extra) {
  echo('log', tag, msg, extra);
  await AppLogger.info(tag, msg, extra);
}

export async function warn(tag: string, msg: string, extra?: Extra) {
  echo('warn', tag, msg, extra);
  await AppLogger.info(tag, `WARN: ${msg}`, extra);
}

export async function error(tag: string, msg: string, extra?: Extra) {
  echo('error', tag, msg, extra);
  await AppLogger.info(tag, `ERROR: ${msg}`, extra);
}
