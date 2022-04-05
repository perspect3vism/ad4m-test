import chalk from "chalk";
import findProcess from "find-process";
import glob from "glob";
import { kill } from "process";
import wget from 'wget-improved';
import fetch from 'node-fetch';
import path from "path";
import fs from 'fs-extra';
import getAppDataPath from "appdata-path";

export const logger = {
  info: (...args: any[]) => !global.hideLogs && console.log(chalk.blue('[INFO]'),...args),
  error: (...args: any[]) => !global.hideLogs && console.error(chalk.red('[ERROR]'), ...args)
}

export function cleanOutput(data: string) {
  const lines = data.split('\n')
  lines.splice(0, 1);
  const cleaned = lines.join('\n')

  if (cleaned) {    
    const parsed = JSON.parse(cleaned.replace(/'/gm, "\"").replace(/(\w+)[:]\s/gm, "\"$1\": ").replace(/"{/g, "{").replace(/}"/g, "}"));

    return parsed;
  }

  throw Error('cannot be parsed');
}

export async function findAndKillProcess(processName: string) {
  try {
    const list = await findProcess('name', processName)

    for (const p of list) {      
      kill(p.pid, 'SIGKILL')
    }
  } catch (err) {
    logger.error(`No process found by name: ${processName}`)
  } 
}

export function getTestFiles() {
  const testFiles = glob.sync('**/*.test.js').filter(e => !e.includes('node_modules'))
  logger.info(testFiles)

  return testFiles;
}

export async function getAd4mHostBinary(relativePath: string) {
  return new Promise(async (resolve, reject) => {
    const response = await fetch("https://api.github.com/repos/perspect3vism/ad4m-host/releases/63062186");
    const data: any = await response.json();

    const isWin = process.platform === "win32";
    const isMac = process.platform === 'darwin';
  
    const binaryPath = path.join(getAppDataPath(relativePath), 'binary');
  
    const isExist = fs.existsSync(path.join(binaryPath, 'ad4m-host'));

    logger.info(isExist ? 'ad4m-host binary found': 'ad4m-host binary not found, downloading now...')
  
    if (!isExist) {
      const dest = path.join(binaryPath, 'ad4m-host');
      let download: any;
      await fs.ensureDir(binaryPath);
      
      if (isMac) {
        const link = data.assets.find((e: any) =>
          e.name.includes("macos")
        ).browser_download_url;
        download = wget.download(link, dest)
      } else if(isWin) {
        const link = data.assets.find((e: any) =>
          e.name.includes("windows")
        ).browser_download_url;
        download = wget.download(link, dest)
      } else {
        const link = data.assets.find((e: any) =>
          e.name.includes("linux")
        ).browser_download_url;
        download = wget.download(link, dest)
      }

      download.on('end', async () => {
        await fs.chmodSync(dest, '777');
        logger.info('ad4m-host binary downloaded sucessfully')
        resolve(null);
      })

      download.on('error', async (err: any) => {
        logger.error(`Something went wrong while downloading ad4m-host binary: ${err}`)
        reject(err);
      })
    } else {
      resolve(null);
    }
  });
}