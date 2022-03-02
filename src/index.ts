import chalk from "chalk";

const beforeEachs: Array<() => void> = [];
const afterEachs: Array<() => void> = [];
const afterAlls: Array<() => void> = [];
const beforeAlls: Array<() => void> = [];
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const stats: any[] = [];
let currDesc: {
  it: {}[],
  name?: string
} = {
  it: []
};

let currIt: {
  name?: string,
  expects?: {
    name: string,
    status: boolean,
  }[]
} = {};

function beforeEach(fn: () => void) {
  beforeEachs.push(fn)
}

function afterEach(fn: () => void) {
  afterEachs.push(fn)
}

function afterAll(fn: () => void) {
  afterAlls.push(fn)
}

function beforeAll(fn: () => void) {
  beforeAlls.push(fn)
}

function describe(desc: string, fn: () => void) {
  currDesc = {
    it: []
  }

  for (const before of beforeAlls) {
    before()
  }

  currDesc.name = desc;

  fn()

  for (const after of afterAlls) {
    after()
  }

  stats.push(currDesc)
}

function it(desc: string, fn: () => void) {
  totalTests++;

  for (const before of beforeEachs) {
    before()
  }

  currIt = {
    name: desc,
    expects: []
  }

  fn()
  
  for (const after of afterEachs) {
    after()
  }

  currDesc.it.push(currIt)
}

function expect(value: any) {
  return {
    toBe: function(expected: any) {
      if (value === expected) {
        currIt.expects?.push({
          name: `expected ${value} toBe ${expected}`,
          status: true
        });
        passedTests++;
      } else {
        currIt.expects?.push({
          name: `expected ${value} toBe ${expected}`,
          status: false
        });
        failedTests++;
      }
    },
    toEqual: function(expected: any) {
      if (value === expected) {
        currIt.expects?.push({
          name: `expected ${value} toBe ${expected}`,
          status: true
        });
        passedTests++;
      } else {
        currIt.expects?.push({
          name: `expected ${value} toBe ${expected}`,
          status: false
        });
        failedTests++;
      }
    }
  }
}

export function showTestsResults() {
  console.log(`Total Test: ${totalTests}
  Test Suites: passed, total
  Tests: ${passedTests} passed, ${totalTests} total\n\n`);

  const logTitle = failedTests > 0 ? chalk.bgRed : chalk.bgGreen;
  console.log(logTitle('Test Suites'), stats)
  for(let stat of stats) {
    console.log(stat.name);

    for (const it of stat.it) {
      console.log(it.name)

      for (const expect of it.expects) {
        console.log(expect.status === true ? chalk.green('√') : chalk.red('X'), expect.name)
      }
    }

    console.log();
  }
}

// @ts-ignore
global.describe = describe;
// @ts-ignore
global.it = it;
// @ts-ignore
global.expect = expect;
// @ts-ignore
global.beforeAll = beforeAll;
// @ts-ignore
global.afterAll = afterAll;
// @ts-ignore
global.beforeEach = beforeEach;
// @ts-ignore
global.afterEach = afterEach;