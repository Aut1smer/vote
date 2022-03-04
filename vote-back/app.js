//初始化express应用
const express = require('express')
const app = express()

//允许跨域中间件
// https://www.npmjs.com/package/cors
const cors = require('cors')


//文件上传
const path = require('path')
const multer = require('multer')
let storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, __dirname + '/uploads')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + Math.random().toString(16).slice(2) + path.extname(file.originalname))
    }
})
const upload = multer({ storage: storage })


//账户系统
const accountRouter = require('./account')

//cookieParser 对cookie签名加密
const cookieParser = require('cookie-parser')

//数据库
const db = require('./db')

//集成ws,基于http服务器的upgrade事件升级为ws连接
const { WebSocketServer } = require('ws') //也可以直接读出来
const http = require('http')
// const { cookie } = require('express/lib/response')
const server = http.createServer() //创建http服务器，把应用传入请求事件；为ws服务器提供基本层
const wsServer = new WebSocketServer({ server }) //ws接管了server的upgrade事件

// 投票id -> 响应该投票的存活的ws们
const voteWsMap = {} // 2:[ws, ws, ws] 二号投票有三个连接需要更新

console.log('voteWsMap', voteWsMap);

wsServer.on('connection', (connectSocket, req) => { //连接建立
    // 请求ws://localhost:8081/realtime-voteinfo/7  应回复7号票版的新信息
    console.log('有人连入了websocket,请求地址为 ', req.url);
    // req.url === '/realtime-voteinfo/7'
    if (req.url.match(/^\/realtime-voteinfo\/\d+$/)) { //匹配该形式的地址，允许连接票版
        const voteId = req.url.match(/\d+$/)[0] // ['7', index, input...]
        //保存ws以便在vote更新时将最新信息发给这个ws
        if (voteId in voteWsMap) {
            voteWsMap[voteId].push(connectSocket)
        } else {
            voteWsMap[voteId] = [connectSocket]
            // console.log('存入voteWsMap里', voteWsMap); //可以显示当前的所有ws连接
        }
        //连接断开（说明用户离开了该投票页面），删除连接
        connectSocket.on('close', (code, reason) => {
            console.log('某ws连接即将断开，由于客户端主动断开');
            let idx = voteWsMap[voteId].indexOf(connectSocket)
            voteWsMap[voteId].splice(idx, 1)
        })
    } else {
        //关闭连接
        console.log('某ws连接由服务器断开，因为请求地址格式不对');
        connectSocket.close()
    }
})


//路由-------------------------------------------------


app.use(cors({
    origin: true, //自动映射ACAO为请求发来的地址
    credentials: true, //允许请求带来Cookie
    maxAge: 86400, //不发送预检请求过期时间
    // optionsSuccessStatus: 200,
})) //默认选项为允许跨域，还可以传一个配置项进去
app.use(cookieParser('cookie sign secret')) //cookie签名的密码
app.use(express.static(__dirname + '/static')) //静态文件中间件
app.use('/uploads', express.static(__dirname + '/uploads')) //用于响应用户上传的头像请求
app.use(express.json()) //解析json请求体的中间件， axios的json会序列化后被改中间件解掉
app.use(express.urlencoded({ extended: true })) //解析url编码请求体的中间件，中间的extended不加的话会报警告

app.use((req, res, next) => {
    console.log(req.method, req.url, req.ip);
    next()
})

//跟据cookie查询用户登录状态 req.loginUser上存储请求用户 req.isLogin存储是否登录
app.use((req, res, next) => {
    if (req.signedCookies.loginUser) { //cookie上带loginUser=2131 req.cookies读的是没加密的
        req.loginUser = db.prepare('select * from users where userId = ?').get(req.signedCookies.loginUser)
        if (req.loginUser) { //防CSRF，查不出来这个cookie用户，就不能算登录状态
            req.isLogin = true
        } else {
            req.isLogin = false
        }
    } else {
        req.isLogin = false
        req.loginUser = null
    }

    next()
})


//上传文件
app.post('/upload', upload.any(), (req, res, next) => {
    let files = req.files
    // console.log(files);
    let urls = files.map(file => `/uploads/${file.filename}`) //网站根目录的..文件
    res.json(urls) // 返回一串地址
})

//账户系统
app.use('/account', accountRouter) //请求以 /account/xxx 打头的地址，将会中转到account路由中



// RESTful 票版表路由
// POST / vote 创建投票，信息在请求体
// GET / vote / 8 获取投票题目的信息
// DELETE / vote / 8 删除8号投票
// PUT / vote / 8 修改投票，信息在请求体



//已登录用户创建投票票版 更新votes和options数据库 RESTful
app.post('/vote', (req, res, next) => {
    const vote = req.body
    console.log('前端来创建投票的信息:', vote);
    let userId = req.loginUser?.userId
    if (userId !== undefined) {
        let stmtVote = db.prepare(`INSERT INTO votes (title, description, deadline, anonymous, multiple, userId) VALUES(?,?,?,?,?,?)`)
        //记得转下，sqlite3不能存boolean值
        let voteRestore = stmtVote.run(vote.title, vote.description, vote.deadline, vote.anonymous ? 1 : 0, vote.multiple ? 1 : 0, req.loginUser.userId)
        // console.log('voteRestore(stmtVote.run): ', voteRestore);
        let voteId = voteRestore.lastInsertRowid //最后一个插入的id
        let stmtOption = db.prepare('insert into options (content, voteId) values(?,?)')
        for (let option of vote.options) { // string[]
            stmtOption.run(option, voteId)
        }
        //创建完毕
        res.json({
            code: 0,
            result: {
                voteId
            }
        })
    } else {
        res.status(401).json({
            code: -1,
            msg: 'you must have logined account successfully already, please login your account first.'
        })
    }
})

app.get('/vote/:voteId', (req, res, next) => {
    //返回数据库中的voteId对应的所有数据
    let { voteId } = req.params // {xx:xx}
    const voteSetting = db.prepare('SELECT * FROM votes WHERE voteId = ?').get(voteId)
    //判断票版是否合法（存在）
    if (voteSetting === undefined) {
        res.status(404).json({
            code: -1,
            msg: 'vote resource are not found, voteId is ' + voteId
        })
        return
    }
    //拿到voteId对应的所有option
    const options = db.prepare('SELECT * FROM options WHERE voteId = ?').all(voteId)
    voteSetting.options = options
    // console.log('voteSetting:', voteSetting);
    // console.log('optionsText:', options);

    //拿到该票版对应的投票选项、投票人、投票人的头像
    // const userVotes = db.prepare('select * from voteOptions where voteId = ?').all(voteId)
    const userVotes = db.prepare('SELECT optionId, avatar,voteOptions.userId, name FROM voteOptions JOIN users ON users.userId = voteOptions.userId WHERE voteId=?')
        .all(voteId)
    voteSetting.userVotes = userVotes

    res.status(200).json({
        code: 0,
        result: voteSetting
    })
})

app.delete('/vote/:voteId', (req, res, next) => {

})
// app.put('/vote/:voteId', (req, res, next) => {
//     //可以修改的投票会很奇怪
// })



//对 已登录用户 正在访问的 票版 的 选项 进行 选中/取消选中
app.post('/vote/:voteId/option/:optionId', (req, res, next) => {
    const { voteId, optionId } = req.params
    // console.log(req.params);
    const userId = req.loginUser?.userId
    // console.log(req.loginUser);
    if (!userId) { //用户未登录
        res.status(401).json({
            code: -1,
            msg: 'not login'
        })
        return
    }
    const vote = db.prepare('select * from votes where voteId = ?').get(voteId)
    if (!vote) { //票版不存在
        res.status(404).json({
            code: -1,
            msg: 'this vote was not found, please retry'
        })
        return
    }
    // console.log('查看票版:', vote);
    if (Date.now() > new Date(vote.deadline).valueOf()) { //票版过期
        res.status(403).json({ //forbidden
            code: -1,
            msg: 'vote deadline passed'
        })
        return
    }

    const multi = vote.multiple == 1 ? true : false
    if (multi) { //多选：用户没投过则投上，用户投过取消
        const voted = db.prepare('select * from voteOptions where userId = ? and voteId = ? and optionId = ?')
            .get(userId, voteId, optionId)
        if (voted) { //投过，删除该行
            db.prepare('delete from voteOptions where voteOptionId = ?').run(voted.voteOptionId)
        } else { //没投过，增加
            db.prepare('insert into voteOptions (userId, voteId, optionId) values(?,?,?)')
                .run(userId, voteId, optionId)
        }
    } else { //单选： 找出用户投过的票，不等则取消并投上，等则不干嘛
        const voted = db.prepare('select * from voteOptions where userId = ? and voteId = ?').get(userId, voteId)

        if (voted) { //投过就更新 用户 在 票版 的选项
            if (voted.optionId === optionId) { //单选两次相同选项
                // 方案一：投过就是投过，不允许取消
                res.status(200).json({
                    code: 0,
                    result: {
                        msg: 'you have voted this option'
                    }
                })
                return
                // 方案二：允许取消
                // db.prepare('delete from voteOptions where voteOptionId = ?').run(voted.voteOptionId)
            } else { //更改用户选项
                db.prepare('update voteOptions set optionId = ? where voteOptionId = ?').run(optionId, voted.voteOptionId)
            }
        } else { //没投过，新增
            db.prepare('insert into voteOptions (userId, voteId, optionId) values(?,?,?)')
                .run(userId, voteId, optionId)
        }
    }
    //把最新的当前投票数据拿到，发给等待接收新数据的ws们
    if (voteWsMap[voteId]) {
        //联表查询出 某票版下  的所有 选项ID、用户信息， 由前端自行过滤内容
        const userVotes = db.prepare(`SELECT optionId, avatar,voteOptions.userId, name 
                                    FROM voteOptions JOIN users 
                                    ON users.userId = voteOptions.userId 
                                    WHERE voteId=?`).all(voteId)

        voteWsMap[voteId].forEach(ws => {
            ws.send(JSON.stringify(userVotes)) //send只能send字符串或Buffer
        })
    }

    res.status(200).json({
        code: 0,
        msg: '选好了！'
    })

})





//防404
app.use(function (req, res, next) {
    res.end('ok')
})


//测试——-----------------------------------------------------



const port = 8081
// app.listen(port, () => { //这里是app内部创建了个http服务器，提供服务，但是它不返回http服务器所以没办法升级协议
//     console.log('vote back listening on port ', port);
// })

//将express创建的app绑定到http server的request事件上
server.on('request', app)
server.listen(port, () => {
    console.log('vote back listening on port ', port);
})


