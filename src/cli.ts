import fs from 'fs-extra';
import glob from 'glob';
import { showTestsResults } from './index.js';
import wget from 'wget-improved';
import path from 'path';
import getAppDataPath from 'appdata-path';
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers';
import { spawn } from 'child_process';
import { execSync } from 'child_process';

const ad4mHost= {
  linux: "https://github.com/fluxsocial/ad4m-host/releases/download/v0.0.2/ad4m-linux-x64",
  mac: "https://github.com/fluxsocial/ad4m-host/releases/download/v0.0.2/ad4m-macos-x64",
  windows: "https://github.com/fluxsocial/ad4m-host/releases/download/v0.0.2/ad4m-windows-x64.exe"
}

async function getAd4mHostBinary(relativePath: string) {
  return new Promise(async (resolve, reject) => {
    const isWin = process.platform === "win32";
    const isMac = process.platform === 'darwin';
  
    const binaryPath = path.join(getAppDataPath(relativePath), 'binary');
  
    const isExist = fs.existsSync(path.join(binaryPath, 'ad4m-host'))
  
    console.log('isExist', isExist, isMac, isWin)
  
    if (!isExist) {
      const dest = path.join(binaryPath, 'ad4m-host');
      let download: any;
      await fs.ensureDir(binaryPath);

      if (isMac) {
        download = wget.download(ad4mHost.mac, dest)
      } else if(isWin) {
        download = wget.download(ad4mHost.windows, dest)
      } else {
        download = wget.download(ad4mHost.linux, dest)
      }

      download.on('end', async () => {
        await fs.chmodSync(dest, '777');
        resolve(null);
      })

      download.on('error', async (err: any) => {
        reject(err);
      })
    }

    resolve(null);
  });
}

function getTestFiles() {
  const testFiles = glob.sync('**/*.test.js').filter(e => !e.startsWith('node_modules'))

  return testFiles;
}

async function run() {
  const args = await yargs(hideBin(process.argv))
  .options({
    relativePath: { 
      type: 'string', 
      describe: 'Relative path to the appdata for ad4m-host to store binaries', 
      alias: 'rp'
    },
    fresh: {
      type: 'boolean',
      describe: 'Starts a fresh ad4m server',
      alias: 'f'
    },
    port: { 
      type: 'number', 
      describe: 'Use this port to run ad4m GraphQL service', 
      default: 4000, 
      alias: 'p'
    },
    test: {
      type: 'string',
      describe: 'Runs test on a single file',
      alias: 't'
    },
    bundle: {
      type: 'string',
      describe: 'Language bundle for the language to be tested',
      alias: 'b'
    },
    meta: {
      type: 'string',
      describe: 'Meta information for the language to be installed'
    },
    languageTye: {
      type: 'array',
      describe: '',
      choices: ['directMessage', 'linkLanguage', 'expression']
    }
  })
  .strict()
  .fail((msg, err) => {
    console.log('Error: ', msg, err);
    process.exit(1);
  })
  .argv;

  const relativePath = args.relativePath || 'ad4m-test';

  if (args.fresh) {
    fs.remove(getAppDataPath(relativePath))
  }

  await getAd4mHostBinary(relativePath);

  const binaryPath = path.join(getAppDataPath(relativePath), 'binary', 'ad4m-host');

  execSync(`${binaryPath} init`, { encoding: 'utf-8' })

  const child = spawn(`${binaryPath}`, ['serve'])

  child.stdout.on('data', async (data) => {
    console.log(data.toString())

    if (data.toString().includes('AD4M init complete')) {
      const files = getTestFiles();
    
      if (files) {
        for (const file of files) {
          await import(fs.realpathSync(file))
        }
      
        showTestsResults();
      } else {
        console.error('No test files found')
      }
    
      process.exit(0)
    }
  });
}

run()