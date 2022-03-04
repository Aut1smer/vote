const express = require('express')
const app = express()

const readline = require('readline')


//从标准输入流里读东西，有能力把数据输出到标准输出流. c语言的scanf
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '请输入广播 >' //调rl.prompt()时，控制台就会显示prompt的内容，类似bash里的$一样
})
// rl.prompt()
rl.on('line', input => {
    pendingRequests.forEach(res => {
        res.end(input)
    })
    rl.prompt()
})

app.listen(5000, () => {
    console.log('listening on port', 5000);
    rl.prompt()
})
console.log('请打开 http://localhost:5000/  并查看网页控制台');
console.log('在node控制台中输入内容，网页端会在输入完成后立即显示');


app.get('/', (req, res, next) => {
    res.sendFile(__dirname + '/comet-test.html')
})

let pendingRequests = []

app.get('/boardcast', (req, res, next) => {
    pendingRequests.push(res)
})





async function start() {
    console.log('rl的另一种使用方式');
    for await (let line of rl) { //每次触发rl的ondata事件时，返回数据data（即line）；调用的是rl[Symbol.asyncIterator()]
        pendingRequests.forEach(res => {
            res.end(line)
        })
    }
}





// let count = 0
// rl.on('line', (input) => {
//     if (count === 5) {
//         console.log('显示机会已用完');
//         rl.close()
//     } else {
//         count++
//         console.log(input, ';count:' + count);
//     }
// })

// rl.question('whats your f f?', ans => {
//     console.log('orright', ans);
// })
