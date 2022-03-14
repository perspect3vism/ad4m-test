const { createExpression, getExpression, getAll } = require('ad4m-test/helpers')

describe("Expression", () => {
  it("Create Expression", async () => {
    const all = await getAll();

    console.log('all', all);

    expect(all.length).toBe(0)

    const exp = await createExpression(`
v = 0 
o = Marry 2890844526 2890844526 IN IP4 172.22.1.110 
s = - 
c = IN IP4 200.201.202.203 
t = 0 0 
m = audio 60000 RTP/AVP 8 
a = rtpmap:97 AMR/16000 
m = video 0 RTP/AVP 32 
    `);

    console.log('exp', exp)

    const all1 = await getAll();

    console.log('all', all1);

    expect(all1.length).toBe(0)
  })
})