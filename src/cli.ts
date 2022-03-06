#! /usr/bin/env node

import fs from 'fs-extra';
import glob from 'glob';
import { showTestsResults } from './index.js';
import wget from 'wget-improved';
import path from 'path';
import getAppDataPath from 'appdata-path';
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers';
import { exec, spawn } from 'child_process';
import { execSync } from 'child_process';
import kill from 'tree-kill'
import findProcess from 'find-process';
import { resolve as resolvePath} from 'path'
import { cleanOutput } from './utils.js';

const ad4mHost= {
  linux: "https://github.com/fluxsocial/ad4m-host/releases/download/v0.0.3/ad4m-linux-x64",
  mac: "https://github.com/fluxsocial/ad4m-host/releases/download/v0.0.3/ad4m-macos-x64",
  windows: "https://github.com/fluxsocial/ad4m-host/releases/download/v0.0.3/ad4m-windows-x64.exe"
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
        console.log('gg')
        resolve(null);
      })

      download.on('error', async (err: any) => {
        reject(err);
      })
    } else {
      resolve(null);
    }
  });
}

function getTestFiles() {
  const testFiles = glob.sync('**/*.test.js').filter(e => !e.includes('node_modules'))
  console.log(testFiles)

  return testFiles;
}

async function findAndKillProcess(processName: string) {
  try {
    const list = await findProcess('name', processName)

    for (const p of list) {      
      kill(p.pid, 'SIGKILL')
    }
  } catch (err) {
    console.log('No process found')
  } 
}

const execRun = (cmd: string) => {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        if (error.code === 1) {
          // leaks present
          resolve(stdout);
        } else {
          // gitleaks error
          reject(error);
        }
      } else {
        // no leaks
        resolve(stdout);
      }
    })
  })
}


function startServer(relativePath: string, bundle: string, meta: string, languageTye: string, file: string): Promise<any> {
  console.log('arr -1')
  return new Promise(async (resolve, reject) => {
    const dataPath = path.join(getAppDataPath(relativePath), 'ad4m')
    fs.remove(dataPath)

    console.log('arr 0')
  
    const binaryPath = path.join(getAppDataPath(relativePath), 'binary', 'ad4m-host');

    await findAndKillProcess('holochain')
    await findAndKillProcess('lair-keystore')

    execSync(`${binaryPath} init --dataPath ${relativePath}`, { encoding: 'utf-8' });

    console.log('arr 1')
  
    const child = spawn(`${binaryPath}`, ['serve', '--dataPath', relativePath])

    console.log('arr 2')

    child.stdout.on('data', async (data) => {
      // console.log(data.toString())
    })

    child.stdout.on('data', async (data) => {
      if (data.toString().includes('AD4M init complete')) {
        console.log('arr 3')
        const a = execSync(`${binaryPath} agent generate --passphrase 123456789`, { encoding: 'utf-8' }).match(/did:key:\w+/)
        console.log('arr 4', a![0])
        const did =  a![0];

        const hello = execSync(`${binaryPath} runtime addTrustedAgent --did "${did}"`, { encoding: 'utf-8' })
        // const b = execSync(`${binaryPath} agent unlock --passphrase 123456789`, { encoding: 'utf-8' })
        console.log('arr 5', hello)
        const command = `${binaryPath} languages publish --path ${resolvePath(bundle)} --meta '${meta}'`;
        console.log('arr 6', command)
        try {

          const languageAddress = cleanOutput(execSync(command, { encoding: 'utf-8' }))
          console.log('languageAddress', languageAddress)
          // @ts-ignore
          global.languageAddress = languageAddress.address;
  
          console.log('arr language', languageAddress)
        } catch (err) {
          console.log('error', err)
        }
        
        const perspective = cleanOutput(execSync(`${binaryPath} perspective add --name "Test perspective"`, { encoding: 'utf-8' }))
        console.log('ttt', perspective.uuid, typeof perspective)

        // @ts-ignore
        global.perspective = perspective.uuid;

        if (languageTye === 'linkLanguage') {       
          // const neighnourhood = execSync(`${binaryPath} neighbourhood publishFromPerspective --uuid "${perspective} --address "${languageAddress}" --meta '{"links":[]}`)
          // @ts-ignore
          global.neighnourhood = neighnourhood;
        }

        console.log('arr 7', fs.realpathSync(file))
  
        await import(fs.realpathSync(file));

        console.log('arr 8')

        console.log('pid', child.pid!)

        kill(child.pid!, 'SIGKILL')
        await findAndKillProcess('holochain')
        await findAndKillProcess('lair-keystore')

        resolve(null);
      }

    });

    child.on('error', () => {
      console.log('process error', child.pid)
      findAndKillProcess('holochain')
      findAndKillProcess('lair-keystore')
      reject()
    });
  });
}

async function run() {
  const args = await yargs(hideBin(process.argv))
    .options({
      relativePath: { 
        type: 'string', 
        describe: 'Relative path to the appdata for ad4m-host to store binaries', 
        alias: 'rp'
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
        type: 'string',
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

  // @ts-ignore
  global.relativePath = relativePath;

  await getAd4mHostBinary(relativePath);

  console.log(args)

  // if (!args.bundle) {
  //   console.error('bundle param is required')
  //   process.exit(1);
  // }

  // if (!args.meta) {
  //   console.error('meta param is required')
  //   process.exit(1);
  // }

  // if (!args.languageTye) {
  //   console.error('languageTye param is required')
  //   process.exit(1);
  // }

  const files = getTestFiles();
  console.log('haha')  

  if (files) {
    for (const file of files) {
      const child = await startServer(relativePath, args.bundle!, args.meta!, args.languageTye!, file);
    }
    console.log('arr 8')
  
    showTestsResults();

    console.log('arr 9')
  } else {
    console.error('No test files found')
  }

  console.log('arr 8')
  process.exit(0)
}

run()