#! /usr/bin/env node

import fs from 'fs-extra';
import { runtest, showTestsResults } from './index.js';
import path from 'path';
import getAppDataPath from 'appdata-path';
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { execSync } from 'child_process';
import kill from 'tree-kill'
import { resolve as resolvePath} from 'path'
import { cleanOutput, findAndKillProcess, getAd4mHostBinary, getTestFiles, logger } from './utils.js';
import process from 'process';
import { installSystemLanguages } from './installSystemLanguages.js';


async function installLanguage(child: any, binaryPath: string, bundle: string, meta: string, languageType: string, resolve: any, test?: any) { 
  const generateAgentResponse = execSync(`${binaryPath} agent generate --passphrase 123456789`, { encoding: 'utf-8' }).match(/did:key:\w+/)
  const currentAgentDid =  generateAgentResponse![0];
  logger.info(`Current Agent did: ${currentAgentDid}`);

  if (bundle && meta) {
    try {    
      const language = cleanOutput(execSync(`${binaryPath} languages publish --path ${resolvePath(bundle)} --meta '${meta}'`, { encoding: 'utf-8' }))
      logger.info(`Published language: `, language)
     
      execSync(`${binaryPath} runtime addTrustedAgent --did "${language.author}"`, { encoding: 'utf-8' })
      
      const templateLanguage = cleanOutput(execSync(`${binaryPath} languages applyTemplateAndPublish --address ${language.address} --templateData '{"uid":"123","name":"test-link-language"}'`, { encoding: 'utf-8' }))
      logger.info(`Published Template Language: `, templateLanguage)

      global.languageAddress = templateLanguage.address;

      const perspective = cleanOutput(execSync(`${binaryPath} perspective add --name "Test perspective"`, { encoding: 'utf-8' }))
      logger.info(`Perspective created: `, perspective)
    
      global.perspective = perspective.uuid;

      if (languageType === 'linkLanguage') {
        const neighnourhood = cleanOutput(execSync(`${binaryPath} neighbourhood publishFromPerspective --uuid "${perspective.uuid}" --address "${templateLanguage.address}" --meta '{"links":[]}'`, { encoding: 'utf-8' }))
        logger.info(`Neighbourhood created: `, neighnourhood)
        
        global.neighnourhood = neighnourhood;
      }

      for (const before of test.beforeEachs) {
        await before()
      }    

      await test.func();

      for (const after of test.afterEachs) {
        await after()
      } 
    
      kill(child.pid!, async () => {
        await findAndKillProcess('holochain')
        await findAndKillProcess('lair-keystore')
        resolve(null);
      })
    } catch (err) {
      logger.error(`Error: ${err}`)
    }
  }

}


export function startServer(relativePath: string, bundle: string, meta: string, languageType: string, port: number, defaultLangPath?: string, test?: any): Promise<any> {
  return new Promise(async (resolve, reject) => {
    const dataPath = path.join(getAppDataPath(relativePath), 'ad4m')
    fs.removeSync(dataPath)
    
    await installSystemLanguages(relativePath)

    fs.removeSync(dataPath)

    const binaryPath = path.join(getAppDataPath(relativePath), 'binary', 'ad4m-host');

    await findAndKillProcess('holochain')
    await findAndKillProcess('lair-keystore')
    await findAndKillProcess('ad4m-host')

    execSync(`${binaryPath} init --dataPath ${relativePath}`, { encoding: 'utf-8' });

    logger.info('ad4m-test initialized')

    let child: ChildProcessWithoutNullStreams;

    const seedFile = path.join(__dirname, '../bootstrapSeed.json')

    if (defaultLangPath) {
      child = spawn(`${binaryPath}`, ['serve', '--dataPath', relativePath, '--port', port.toString(), '--defaultLangPath', defaultLangPath, '--networkBootstrapSeed', seedFile, '--languageLanguageOnly', 'false'])
    } else {
      child = spawn(`${binaryPath}`, ['serve', '--dataPath', relativePath, '--port', port.toString(), '--networkBootstrapSeed', seedFile, '--languageLanguageOnly', 'false'])
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
        installLanguage(child, binaryPath, bundle, meta, languageType, resolve, test);
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
        describe: 'Meta information for the language to be installed',
        alias: 'm'
      },
      languageType: {
        type: 'string',
        describe: 'Is the language a link or expression language',
        alias: 'lt',
        choices: ['directMessage', 'linkLanguage', 'expression']
      },
      defaultLangPath: {
        type: 'string',
        describe: 'Local bulid-in language to be used instead of the packaged ones',
        default: path.join(__dirname, './languages'),
        alias: 'dlp'
      },
      hideLogs: {
        type: 'boolean',
        describe: 'Hide the ad4m-test logs',
        default: false,
        alias: 'hl'
      }
    })
    .strict()
    .fail((msg, err) => {
      logger.error(`Error: ${msg}, ${err}`);
      process.exit(1);
    })
    .argv;

  global.hideLogs = args.hideLogs;

  const relativePath = args.relativePath || 'ad4m-test';

  global.relativePath = relativePath;

  await getAd4mHostBinary(relativePath);

  if (!args.bundle) {
    console.error('bundle param is required')
    process.exit(1);
  }

  if (!args.meta) {
    console.error('meta param is required')
    process.exit(1);
  }

  const files = args.test ? [args.test] : getTestFiles();

  if (files) {
    for (const file of files) {
      global.config = {
        relativePath,
        bundle: args.bundle,
        meta: args.meta,
        languageType: args.languageType,
        defaultLangPath: args.defaultLangPath,
        port: args.port
      }
      
      await import(fs.realpathSync(file));
      
      await runtest()
    }
    showTestsResults();

  } else {
    logger.error('No test files found')
  }

  process.exit(0)
}

if (require.main === module) {
  run()
}

