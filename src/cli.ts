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
import { buildAd4mClient } from './client.js';
import { WebSocket } from 'ws';
import express from 'express'

async function installLanguage(child: any, binaryPath: string, bundle: string, meta: string, languageType: string, resolve: any, callback?: any) { 
  const generateAgentResponse = execSync(`${binaryPath} agent generate --passphrase 123456789`, { encoding: 'utf-8' }).match(/did:key:\w+/)
  const currentAgentDid =  generateAgentResponse![0];
  logger.info(`Current Agent did: ${currentAgentDid}`);

  const { ui } = global.config;
 
  if (bundle && meta) {
    try {    
      const ad4mClient = await buildAd4mClient(WebSocket);
 
      const language = cleanOutput(execSync(`${binaryPath} languages publish --path ${resolvePath(bundle)} --meta '${meta}'`, { encoding: 'utf-8' }))
      logger.info(`Published language: `, language)
     
      execSync(`${binaryPath} runtime addTrustedAgent --did "${language.author}"`, { encoding: 'utf-8' })

      global.languageAddress = language.address;
      
      if (languageType === 'linkLanguage') {
        const templateLanguage = cleanOutput(execSync(`${binaryPath} languages applyTemplateAndPublish --address ${language.address} --templateData '{"uid":"123","name":"test-${language.name}"}'`, { encoding: 'utf-8' }))
        logger.info(`Published Template Language: `, templateLanguage)
  
        global.languageAddress = templateLanguage.address;

        const perspective = cleanOutput(execSync(`${binaryPath} perspective add --name "Test perspective"`, { encoding: 'utf-8' }))
        logger.info(`Perspective created: `, perspective)
      
        global.perspective = perspective.uuid;

        const neighnourhood = cleanOutput(execSync(`${binaryPath} neighbourhood publishFromPerspective --uuid "${perspective.uuid}" --address "${templateLanguage.address}" --meta '{"links":[]}'`, { encoding: 'utf-8' }))
        logger.info(`Neighbourhood created: `, neighnourhood)
        
        global.neighnourhood = neighnourhood;
      }

      if (ui) {
        const found = await ad4mClient.languages.byAddress(language.address)
        fs.writeFileSync(path.join(process.cwd(), '/public/icon.js'), found.icon?.code!)  
        fs.writeFileSync(path.join(process.cwd(), '/public/constructorIcon.js'), found.constructorIcon?.code!)  
      }

      await callback();

      if (!ui) {
        kill(child.pid!, async () => {
          await findAndKillProcess('holochain')
          await findAndKillProcess('lair-keystore')
          resolve(null);
        })
      }

    } catch (err) {
      logger.error(`Error: ${err}`)
    }
  }

}


export function startServer(relativePath: string, bundle: string, meta: string, languageType: string, port: number, defaultLangPath?: string, callback?: any): Promise<any> {
  return new Promise(async (resolve, reject) => {
    const dataPath = path.join(getAppDataPath(relativePath), 'ad4m')
    fs.removeSync(dataPath)
    
    await installSystemLanguages(relativePath)

    fs.removeSync(dataPath)

    const binaryPath = path.join(getAppDataPath(relativePath), 'binary', `ad4m-host-${global.ad4mHostVersion}`);

    await findAndKillProcess('holochain')
    await findAndKillProcess('lair-keystore')
    await findAndKillProcess('ad4m-host')

    const seedFile = path.join(__dirname, '../bootstrapSeed.json')

    execSync(`${binaryPath} init --dataPath ${relativePath} --networkBootstrapSeed ${seedFile} --overrideConfig`, { encoding: 'utf-8' });

    logger.info('ad4m-test initialized')

    let child: ChildProcessWithoutNullStreams;

    if (defaultLangPath) {
      child = spawn(`${binaryPath}`, ['serve', '--dataPath', relativePath, '--port', port.toString(), '--languageLanguageOnly', 'false'])
    } else {
      child = spawn(`${binaryPath}`, ['serve', '--dataPath', relativePath, '--port', port.toString(), '--languageLanguageOnly', 'false'])
    }

    const logFile = fs.createWriteStream(path.join(process.cwd(), 'ad4m-test.txt'))

    child.stdout.on('data', async (data) => {
      logFile.write(data)
    });
    child.stderr.on('data', async (data) => {
      logFile.write(data)
    })

    child.stdout.on('data', async (data) => {
      if (data.toString().includes('AD4M init complete')) {
        installLanguage(child, binaryPath, bundle, meta, languageType, resolve, callback);
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
      },
      ui: {
        type: 'boolean',
        default: false,
        describe: 'Starts a live-server with the UI'
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

  global.config = {
    relativePath,
    bundle: args.bundle,
    meta: args.meta,
    languageType: args.languageType,
    defaultLangPath: args.defaultLangPath,
    port: args.port,
    ui: args.ui
  }

  const files = args.test ? [args.test] : getTestFiles();

  if (args.ui) {
    await startServer(relativePath, args.bundle!, args.meta!, args.languageType!, args.port, args.defaultLangPath, () => {
      const app = express();

      console.log(process.env.IP)

      app.use('/', express.static(path.join(__dirname, '../public')))

      app.get('/', (req, res) => {
        res.send('Hello World!');
      });
      

      app.listen(8181, () => {
        logger.info(`Server started at \n 
          localhost:8181?address=${global.languageAddress} \n
          localhost:8181/expression.html?address=${global.languageAddress}`)
      })
    });
  } else {
    if (files) {
      for (const file of files) {        
        await import(fs.realpathSync(file));
        
        await runtest()
      }
      showTestsResults();
  
    } else {
      logger.error('No test files found')
    }
  }


  process.exit(0)
}

if (require.main === module) {
  run()
}

