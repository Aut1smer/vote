//初始化express应用
const express = require('express')
const app = express()

//允许跨域中间件
// https://www.npmjs.com/package/cors
const cors = require('cors')




//账户系统
const accountRouter = require('./account')

//cookieParser 对cookie签名加密
const cookieParser = require('cookie-parser')
const cookieSecret = 'cookie sign secret' //密钥
//数据库
const db = require('./db')

//集成ws,基于http服务器的upgrade事件升级为ws连接
const { WebSocketServer } = require('ws') //也可以直接读出来
const http = require('http')
// const { cookie } = require('express/lib/response')
const server = http.createServer() //创建http服务器，把应用传入请求事件；为ws服务器提供基本层
const wsServer = new WebSocketServer({ server }) //ws接管了server的upgrade事件
const querystring = require('querystring')
const _ = require('lodash')
// 投票id -> 响应该投票的存活的ws们
const voteWsMap = {} // 2:[ws, ws, ws] 二号投票有三个连接需要更新，（2号频道有3个客户端正在连接）

console.log('voteWsMap', voteWsMap);

wsServer.on('connection', (connectSocket, req) => { //连接建立
    // 请求ws://localhost:8081/realtime-voteinfo/7  应回复7号票版的新信息
    console.log('有人连入了websocket,请求地址为 ', req.url);
    // console.log('当前ws连接的登录用户为 ', req.headers.cookie); // ws服务器不是express的一部分，所以需要手动解析
    // https://www.npmjs.com/package/cookie-parser cookieParser主动解析加密cookie
    const parsedCookie = cookieParser.signedCookies(querystring.parse(req.headers.cookie, '; '), cookieSecret) //{loginUser: userId}
    const userId = Number(parsedCookie.loginUser)
    if (!userId) {
        console.log('非法cookie登录,某ws连接即将断开');
        connectSocket.close()
        return
    }
    // const user = db.prepare('SELECT * FROM users WHERE userId = ?').get(userId)
    connectSocket.userId = userId //此处挂载连入的用户信息
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
app.use((req, res, next) => {
    console.log(req.method, req.url, req.ip);
    next()
})

app.use(cors({
    origin: true, //自动映射ACAO为请求发来的地址
    credentials: true, //允许请求带来Cookie
    maxAge: 86400, //不发送预检请求过期时间
    // optionsSuccessStatus: 200,
})) //默认选项为允许跨域，还可以传一个配置项进去
app.use(cookieParser(cookieSecret)) //cookie签名的密码
// app.use(express.static(__dirname + '/build'))  //静态文件中间件，前端页面
app.use('/uploads', express.static(__dirname + '/uploads')) //用于响应用户希望拿到的头像请求
app.use(express.json()) //解析json请求体的中间件， axios的json会序列化后被改中间件解掉
// content-type: application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true })) //解析url编码请求体的中间件，中间的extended不加的话会报警告.解析的form到req.body上



//跟据cookie查询用户登录状态 req.loginUser上存储请求用户 req.isLogin存储是否登录
app.use((req, res, next) => {
    //★检测同源站，避免csrf攻击
    if (req.signedCookies.loginUser) { //cookie上带loginUser=2131 req.cookies读的是没加密的
        req.loginUser = db.prepare('select * from users where userId = ? and deprecated = ?')
            .get(Number(req.signedCookies.loginUser), 2) //登录态
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
});




//账户系统
app.use('/account', accountRouter) //请求以 /account/xxx 打头的地址，将会中转到account路由中



// RESTful 票版表路由
// GET / vote 拿到已登录用户票版
// POST / vote 创建投票，信息在请求体
// GET / vote / 8 获取投票题目的信息
// DELETE / vote / 8 删除8号投票
// PUT / vote / 8 修改投票，信息在请求体




//已登录用户访问MyVote 返回该用户创建的票版数据
app.get('/vote', (req, res, next) => {
    if (!req.isLogin) {
        res.status(403).json({
            code: -1,
            msg: 'not login'
        })
        return
    }
    const hisVotes = db.prepare('SELECT * FROM votes WHERE userId = ?').all(Number(req.loginUser.userId))
    res.status(200).json({
        code: 0,
        result: hisVotes || []
    })
})

//已登录用户创建投票票版 更新votes和options数据库 
app.post('/vote', (req, res, next) => {
    const vote = req.body
    console.log('前端来创建投票的信息:', vote);
    let userId = req.loginUser?.userId == undefined ? undefined : Number(req.loginUser.userId)
    if (userId !== undefined) {
        let stmtVote = db.prepare(`INSERT INTO votes (title, description, deadline, anonymous, multiple, userId) VALUES(?,?,?,?,?,?)`)
        //记得转下，sqlite3不能存boolean值
        let voteRestore = stmtVote.run(vote.title, vote.description, vote.deadline, vote.anonymous ? 1 : 0, vote.multiple ? 1 : 0, userId)
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


//拿到当前票版voteId的具体信息，如果是匿名投票则只发与登录态用户有关的信息
app.get('/vote/:voteId', (req, res, next) => {
    if (!req.isLogin) {
        res.status(401).json({
            code: -1,
            msg: 'not login'
        })
        return
    }
    //返回数据库中的voteId对应的所有数据
    let voteId = Number(req.params.voteId) // {xx:xx}
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

    //拿到该票版对应的投票选项、投票人的id、用户名、头像
    // const userVotes = db.prepare('select * from voteOptions where voteId = ?').all(voteId)
    const userVotes = db.prepare('SELECT optionId, avatar, voteOptions.userId, name FROM voteOptions JOIN users ON users.userId = voteOptions.userId WHERE voteId=?')
        .all(voteId)
    voteSetting.userVotes = userVotes

    //如果是匿名投票，应该把非用户本人的 userId avatar 删掉，除非他是创建者
    const userId = req?.loginUser?.userId === undefined ? undefined : Number(req.loginUser.userId)
    if (voteSetting.anonymous && userId != voteSetting.userId) {
        userVotes.forEach(it => {
            if (it.userId !== userId) {
                it.userId = null;
                it.avatar = null;
                it.name = null;
            }
        })
    }
    res.status(200).json({
        code: 0,
        result: voteSetting
    })
})

// 在有所有权的情况下，删除某投票
app.delete('/vote/:voteId', (req, res, next) => {
    if (!req.isLogin) {
        res.status(401).json({
            code: -1,
            msg: 'not login'
        })
        return
    }
    const voteId = Number(req.params.voteId)
    const userId = Number(req.loginUser.userId)
    console.log('执行删除的userId：', userId);
    const vote = db.prepare('SELECT * FROM votes WHERE voteId = ? AND userId = ?').get(voteId, userId)
    if (!vote) {
        res.status(404).json({
            code: -1,
            msg: ' vote resource belongs to you is not found, voteId: ' + voteId
        })
        return
    }
    console.log('执行删除的vote数据', vote);
    //只删除了票版，*正常*不删。其他的查不出来可以放着了
    db.prepare('delete from votes where voteId=? and userId=?').run(voteId, userId)
    // db.prepare('DELETE FROM votes WHERE voteId = ? AND userId = ?').run(voteId, userId)
    console.log('删除成功了');
    res.status(200).json({
        code: 0,
        msg: 'delete vote ' + voteId + ' succeeded'
    })
})
// app.put('/vote/:voteId', (req, res, next) => {
//     //可以修改的投票会很奇怪
// })




// POST /vote/8   {optionIds:[21,43,5]}
//对 已登录用户 正在访问的 票版 的 选项(们) 进行 (匿名)投票
//即切换当前登录用户对voteId的optionId的投票情况；如果匿名，不允许切换
app.post('/vote/:voteId', (req, res, next) => {
    const voteId = Number(req.params.voteId)
    const { optionIds } = req.body
    if (optionIds.length === 0) { //post请求体没有 已选择的数据
        res.status(400).json({
            code: -1,
            msg: 'bad request, you must vote a option!'
        })
    }
    const optionId = optionIds[0] //单选只有一个id，就算发来多个也只用一个
    // console.log(req.params);
    const userId = req.loginUser?.userId == undefined ? undefined : Number(req.loginUser.userId)
    // console.log(req.loginUser);
    if (!userId) { //用户未登录
        res.status(401).json({
            code: -1,
            msg: 'not login'
        })
        return
    }
    const vote = db.prepare('select * from votes where voteId = ?').get(voteId) //当前票版
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
        if (vote.anonymous) { //匿名多选如果用户投过，不允许再投了
            let userHasVoteOne = db.prepare('SELECT * FROM voteOptions WHERE userId=? AND voteId=?').get(userId, voteId)
            if (userHasVoteOne) {
                res.status(403).json({
                    code: -1,
                    msg: '匿名多选不允许重新投票'
                })
                return
            } else { //匿名多选用户没投过，一次性投完
                let insertVoteStmt = db.prepare('INSERT INTO voteOptions (userId, voteId, optionId) VALUES(?,?,?)')
                optionIds.forEach(optionId => {
                    insertVoteStmt.run(userId, voteId, optionId)
                })
                // res.status(200).json({
                //     code: 0,
                //     msg: '选好了！'
                // })
            }
        } else {
            //非匿名投票， 允许单点即改
            const voted = db.prepare('select * from voteOptions where userId = ? and voteId = ? and optionId = ?')
                .get(userId, voteId, optionId)
            if (voted) { //投过，删除该行
                db.prepare('delete from voteOptions where voteOptionId = ?').run(voted.voteOptionId)
            } else { //没投过，增加
                db.prepare('insert into voteOptions (userId, voteId, optionId) values(?,?,?)')
                    .run(userId, voteId, optionId)
            }
            // res.status(200).json({
            //     code: 0,
            //     msg: '选好了！'
            // })
        }

    } else { //单选： 找出用户投过的票，不等则取消并投上，等则不干嘛
        const voted = db.prepare('select * from voteOptions where userId = ? and voteId = ?').get(userId, voteId)

        if (voted) { //投过就更新 用户 在 票版 的选项
            if (vote.anonymous) {//匿名单选投过，不允许重投
                res.status(403).json({
                    code: -1,
                    msg: '匿名投票无法修改已投结果！'
                })
                return
            } else {
                //非匿名投过
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
            }
        } else { //匿名非匿名没投过，新增
            db.prepare('insert into voteOptions (userId, voteId, optionId) values(?,?,?)')
                .run(userId, voteId, optionId)
        }
    }
    //结束axios修改投票的请求
    res.status(200).json({
        code: 0,
        msg: '选好了！'
    })
    //把最新的当前投票数据拿到，发给等待接收新数据的ws们
    if (voteWsMap[voteId]) {
        //联表查询出 某票版下  的所有 选项ID、用户信息， 由前端自行过滤内容
        const userVotes = db.prepare(`SELECT optionId, avatar,voteOptions.userId, name 
                                    FROM voteOptions JOIN users 
                                    ON users.userId = voteOptions.userId 
                                    WHERE voteId=?`).all(voteId)


        voteWsMap[voteId].forEach(ws => {
            const userId = ws.userId
            if (vote.anonymous && userId !== vote.userId) { //匿名且非创建者，返回只能看到自己的数据
                let cloned = _.cloneDeep(userVotes)
                cloned.forEach(opration => {
                    if (opration.userId !== userId) {
                        opration.userId = null
                        opration.name = null
                        opration.avatar = null
                    }
                })
                ws.send(JSON.stringify(cloned))
            } else {
                ws.send(JSON.stringify(userVotes)) //原始send只能send字符串或Buffer.没集成到express上
            }

        })
    }



})




//防404
app.use(function (req, res, next) {
    // res.end('ok')
    res.status(400).end('unknown request') //400服务器不理解请求语法
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



