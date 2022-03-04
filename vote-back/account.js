// 账户系统的路由中间件

const express = require('express')
const db = require('./db') //都访问同一个db系统
const md5 = val => val
const svgCaptcha = require('svg-captcha') //注册验证码

// 微型路由
const app = express.Router()

//  /register 注册界面
app.post('/register', (req, res, next) => {
    let regInfo = req.body

    //效验了 名字格式  密码不为空
    let USERNAME_RE = /^[0-9a-z_]+$/i
    if (!USERNAME_RE.test(regInfo.name)) {
        res.status(449).json({ // 449 retry with
            code: -1,
            msg: 'invalid username, can only contain digit, letter and _, please post new username again'
        })
    } else if (regInfo.password == 0) {
        res.status(449).json({
            code: -1,
            msg: 'invalid password, your may post a empty password'
        })
    } else {
        let addUser = db.prepare('INSERT INTO users (name, password, email, avatar) VALUES(?,?,?,?)')
        let result = addUser.run(regInfo.name, md5(regInfo.password), regInfo.email, regInfo.avatar)
        // 这里的result是 {changes:1, lastInsertRowid:19} 的对象，表示修改数据库
        res.status(200).json({
            code: 0,
            result: {}, //随便给个空信息，注册成功
        })
    }
})

//captcha-img 验证码
app.get('/captcha-img', (req, res, next) => {
    let captcha = svgCaptcha.create()
    req.session.captcha = captcha.text //挂一下req？？ 明明每次req都不一样
    res.type('svg')
    res.status(200).send(captcha.data)
})

//处理登录表单请求 校验验证码与登录用户存在与否
app.post('/login', (req, res, next) => {
    let loginInfo = req.body

    //校验验证码
    // if(loginInfo.captcha !== req.session.captcha) {
    //     res.json({
    //         code: -1,
    //         msg: 'captcha incorrect!',
    //     })
    //     return
    // }
    console.log(loginInfo);
    let user = db.prepare(`SELECT * FROM users WHERE name = ? AND password = ?`).get(loginInfo.name, md5(loginInfo.password))
    //下面的方式不太行，通用上面的get传参吧
    // let user = db.prepare(`select * from users where name = '${loginInfo.name}' and password = ${loginInfo.password}`).get()


    console.log(user);
    //user是一个对象{userId:xx, name:xx, pswd:xx...}
    if (user) {
        res.cookie('loginUser', user.userId, {
            signed: true, //加密
            // maxAge: 86400000, //相对过期时间点，毫秒计算，过期后浏览器自动删除并不在请求中附上
            // expires: new Date('2022 2 24 18:00:00'), // 绝对过期时间点
            httpOnly: true, //在请求时带在头里，不能通过document.cookie读到，防XSS
        })

        res.json({ //发给前端作展示
            code: 0,
            result: user,
        })
    } else {
        res.status(401).json({ //没找到该用户  401 Unauthorized未授权
            code: -1,
            msg: 'username or password incorrect',
        })
    }
})


//获取到当前可能已经登录的用户信息
app.get('/current-user', (req, res, next) => {
    if (req.isLogin) {
        const { userId, name, avatar } = req.loginUser
        res.json({
            code: 0,
            result: {
                userId,
                name,
                avatar
            }
        })
    } else {
        res.status(401).json({
            code: -1,
            msg: 'not login'
        })
    }
})



//登出时清除cookie， 也可以不过后台放到前端登出时就清除cookie
app.get('/logout', (req, res, next) => {
    res.clearCookie('loginUser')
    res.json({
        code: 0,
        result: {},
    })
})


module.exports = app