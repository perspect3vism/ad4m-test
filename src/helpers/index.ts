import { LinkExpression, LinkQuery } from "@perspect3vism/ad4m";
import getAppDataPath from "appdata-path";
import { execSync } from "child_process";
import path from "path";
import { cleanOutput } from "../utils.js";

// @ts-ignore
const relativePath = global.relativePath;
// @ts-ignore
const perspective = global.perspective;
// @ts-ignore
const languageAddress = global.languageAddress;

// * Link Language
export function addLink(link: LinkExpression) {
  const binaryPath = path.join(getAppDataPath(relativePath), 'binary', 'ad4m-host');

  const response = execSync(
    `${binaryPath} perspective addLink --uuid "${perspective}" --link "${JSON.stringify(link)}"`,
    { encoding: 'utf-8' }
  );

  return JSON.parse(response);
}

export function removeLink(link: LinkExpression) {
  const binaryPath = path.join(getAppDataPath(relativePath), 'binary', 'ad4m-host');

  const response = execSync(
    `${binaryPath} perspective removeLink --uuid "${perspective}" --link "${JSON.stringify(link)}"`,
    { encoding: 'utf-8' }
  );

  return JSON.parse(response);
}

export function updateLink(link: LinkExpression) {
  const binaryPath = path.join(getAppDataPath(relativePath), 'binary', 'ad4m-host');

  const response = execSync(
    `${binaryPath} perspective updateLink --uuid "${perspective}" --link "${JSON.stringify(link)}"`,
    { encoding: 'utf-8' }
  );

  return JSON.parse(response);
}

export function queryLinks(query: LinkQuery) {}

export function addCallback() {}

// * Expression Language
export function createExpression(content: string) {
  const binaryPath = path.join(getAppDataPath(relativePath), 'binary', 'ad4m-host');

  const response = execSync(
    `${binaryPath} expression create --address ${languageAddress} --content "${content}"`,
    { encoding: 'utf-8' }
  );

  return JSON.parse(response);
}

export function getExpression(url: string) {
  const binaryPath = path.join(getAppDataPath(relativePath), 'binary', 'ad4m-host');

  const response = execSync(
    `${binaryPath} expression get --url "${url}"`,
    { encoding: 'utf-8' }
  );

  return JSON.parse(response);
}

export function getByAuthor() {}

export function getAll() {
  const binaryPath = path.join(getAppDataPath(relativePath), 'binary', 'ad4m-host');

  console.log('binaryPath', binaryPath, perspective)

  const response = execSync(
    `${binaryPath} perspective queryLinks --uuid "${perspective}" --query "{}"`,
    { encoding: 'utf-8' }
  );

  console.log('response', response, cleanOutput(response))

  return cleanOutput(response);
}

// * Direct Message Language
export function sendPrivate() {}

export function inbox() {}