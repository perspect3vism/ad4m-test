#! /usr/bin/env node

import fs from 'fs-extra';
import glob from 'glob';
import { showTestsResults } from './index.js';
import wget from 'wget-improved';
import path from 'path';
import getAppDataPath from 'appdata-path';
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { execSync } from 'child_process';
import kill from 'tree-kill'
import findProcess from 'find-process';
import { resolve as resolvePath} from 'path'
import { cleanOutput } from './utils.js';
import chalk from 'chalk';
const logger = {
  info: (...args: any[]) => console.log(chalk.blue('[INFO]'),...args),
  error: (...args: any[]) => console.error(chalk.red('[ERROR]'), ...args)
}

const ad4mHost= {
  linux: "https://github.com/fluxsocial/ad4m-host/releases/download/v0.0.5/ad4m-linux-x64",
  mac: "https://github.com/fluxsocial/ad4m-host/releases/download/v0.0.5/ad4m-macos-x64",
  windows: "https://github.com/fluxsocial/ad4m-host/releases/download/v0.0.5/ad4m-windows-x64.exe"
}

async function getAd4mHostBinary(relativePath: string) {
  return new Promise(async (resolve, reject) => {
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
        download = wget.download(ad4mHost.mac, dest)
      } else if(isWin) {
        download = wget.download(ad4mHost.windows, dest)
      } else {
        download = wget.download(ad4mHost.linux, dest)
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

function getTestFiles() {
  const testFiles = glob.sync('**/*.test.js').filter(e => !e.includes('node_modules'))
  logger.info(testFiles)

  return testFiles;
}

async function findAndKillProcess(processName: string) {
  try {
    const list = await findProcess('name', processName)

    for (const p of list) {      
      kill(p.pid, 'SIGKILL')
    }
  } catch (err) {
    logger.error(`No process found by name: ${processName}`)
  } 
}

async function installLanguage(child: any, binaryPath: string, bundle: string, meta: string, languageTye: string, file: any, resolve: any, defaultLangPath?: string) {  
  const generateAgentResponse = execSync(`${binaryPath} agent generate --passphrase 123456789`, { encoding: 'utf-8' }).match(/did:key:\w+/)
  const currentAgentDid =  generateAgentResponse![0];
  logger.info(`Current Agent did: ${currentAgentDid}`);

  if (bundle && meta) {
    try {    
      const language = cleanOutput(execSync(`${binaryPath} languages publish --path ${resolvePath(bundle)} --meta '${meta}'`, { encoding: 'utf-8' }))
      logger.info(`Published language: `, language)
     
      execSync(`${binaryPath} runtime addTrustedAgent --did "${language.author}"`, { encoding: 'utf-8' })
      
      const templateLanguage = cleanOutput(execSync(`${binaryPath} languages applyTemplateAndPublish --address ${language.address} --templateData '{"uid":"123","name":"test-sdp-expression"}'`, { encoding: 'utf-8' }))
      logger.info(`Published Template Language: `, templateLanguage)

      // @ts-ignore
      global.languageAddress = templateLanguage.address;

      const perspective = cleanOutput(execSync(`${binaryPath} perspective add --name "Test perspective"`, { encoding: 'utf-8' }))
      logger.info(`Perspective created: `, perspective)
    
      // @ts-ignore
      global.perspective = perspective.uuid;

      if (languageTye === 'link') {
        const neighnourhood = cleanOutput(execSync(`${binaryPath} neighbourhood publishFromPerspective --uuid "${perspective.uuid}" --address "${templateLanguage.address}" --meta '{"links":[]}'`, { encoding: 'utf-8' }))
        logger.info(`Neighbourhood created: `, neighnourhood)
        
        // @ts-ignore
        global.neighnourhood = neighnourhood;
      }

    } catch (err) {
      logger.error(`Error while installing language or creating neighbourhood: ${err}`)
    }
  }

  await import(fs.realpathSync(file));

  kill(child.pid!, async () => {
    await findAndKillProcess('holochain')
    await findAndKillProcess('lair-keystore')
    resolve(null);
  })
}


function startServer(relativePath: string, bundle: string, meta: string, languageTye: string, file: string, defaultLangPath?: string): Promise<any> {
  return new Promise(async (resolve, reject) => {
    const dataPath = path.join(getAppDataPath(relativePath), 'ad4m')
    fs.remove(dataPath)

    const binaryPath = path.join(getAppDataPath(relativePath), 'binary', 'ad4m-host');

    await findAndKillProcess('holochain')
    await findAndKillProcess('lair-keystore')

    execSync(`${binaryPath} init --dataPath ${relativePath}`, { encoding: 'utf-8' });

    logger.info('ad4m-test initialized')

    let child: ChildProcessWithoutNullStreams;

    if (defaultLangPath) {
      child = spawn(`${binaryPath}`, ['serve', '--dataPath', relativePath, '--defaultLangPath', resolvePath(defaultLangPath)])
    } else {
      child = spawn(`${binaryPath}`, ['serve', '--dataPath', relativePath])
    }

    const logFile = fs.createWriteStream(path.join(__dirname, 'ad4m-test.txt'))

    child.stdout.on('data', async (data) => {
      logFile.write(data)
    });
    child.stderr.on('data', async (data) => {
      logFile.write(data)
    })

    child.stdout.on('data', async (data) => {
      if (data.toString().includes('AD4M init complete')) {
        installLanguage(child, binaryPath, bundle, meta, languageTye, file, resolve, defaultLangPath)
      }
    });

    child.on('exit', (code) => {
      logger.info(`exit is called ${code}`);
    })

    child.on('error', () => {
      logger.error(`process error: ${child.pid}`)
      findAndKillProcess('holochain')
      findAndKillProcess('lair-keystore')
      findAndKillProcess('ad4m-host')
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
      },
      defaultLangPath: {
        type: 'string',
        describe: '',
      }
    })
    .strict()
    .fail((msg, err) => {
      logger.error(`Error: ${msg}, ${err}`);
      process.exit(1);
    })
    .argv;

  const relativePath = args.relativePath || 'ad4m-test';

  // @ts-ignore
  global.relativePath = relativePath;

  await getAd4mHostBinary(relativePath);

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

  if (files) {
    for (const file of files) {
      const child = await startServer(relativePath, args.bundle!, args.meta!, args.languageTye!, file, args.defaultLangPath);
    }
    showTestsResults();

  } else {
    logger.error('No test files found')
  }

  process.exit(0)
}

run()