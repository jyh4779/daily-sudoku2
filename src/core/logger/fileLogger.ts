import { Platform } from 'react-native';
import RNFS from 'react-native-fs';

const baseDir =
  (Platform.OS === 'android' && RNFS.ExternalDirectoryPath) ||
  RNFS.DocumentDirectoryPath ||
  RNFS.TemporaryDirectoryPath;

const LOG_DIR = `${baseDir}/Logs`;
const LOG_FILE = `${LOG_DIR}/puzzle-fetch.log`;
let hasAnnouncedPath = false;

async function ensureLogFile() {
  const dirExists = await RNFS.exists(LOG_DIR);
  if (!dirExists) {
    await RNFS.mkdir(LOG_DIR);
  }
  const fileExists = await RNFS.exists(LOG_FILE);
  if (!fileExists) {
    await RNFS.writeFile(LOG_FILE, '', 'utf8');
  }
  if (!hasAnnouncedPath) {
    hasAnnouncedPath = true;
    console.log(`[FileLogger] writing logs to ${LOG_FILE}`);
  }
}

export async function appendFileLog(message: string, extras?: Record<string, unknown>) {
  try {
    await ensureLogFile();
    const ts = new Date().toISOString();
    const payload = extras ? ` ${JSON.stringify(extras)}` : '';
    const line = `${ts} ${message}${payload}\n`;
    await RNFS.appendFile(LOG_FILE, line, 'utf8');
  } catch (e) {
    console.warn('[FileLogger] write failed', e);
  }
}

export const fileLogPaths = {
  directory: LOG_DIR,
  file: LOG_FILE,
};
