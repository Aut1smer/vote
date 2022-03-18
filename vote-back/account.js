// 账户系统的路由中间件

const express = require('express')
const db = require('./db') //都访问同一个db系统
const md5 = require('md5')
const { v4: uuidv4 } = require('uuid')

// const md5 = val => val
const svgCaptcha = require('svg-captcha') //注册验证码

// 微型路由
const app = express.Router()


//文件上传配置
const path = require('path')
const multer = require('multer')
let storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, __dirname + '/uploads') //存放位置
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + Math.random().toString(16).slice(2) + path.extname(file.originalname)) //获取后缀并乱序文件名存储
    }
})
const upload = multer({ storage: storage }) //以该存储配置的返回中间件的函数


//邮件发送配置
const nodemailer = require('nodemailer')
let transporter = nodemailer.createTransport({
    // host: "smtp.qq.email",
    service: 'qq',
    port: 465,
    secure: true, //true for 465 and use SSL! 
    // secure: false, 
    auth: {
        user: 'aut1smer@foxmail.com',
        pass: 'muajavxgjunlbchj' //授权码
    }
});



//保存文件 && 返回用于提交的文件地址 （头像）
app.post('/upload', upload.any(), (req, res, next) => { // upload.any会将存入所有文件并把文件存入req.files里
    if (!req.headers.referer.endsWith('/register')) {  //大概不是从我的网站发的
        res.status(400).json({
            code: -1,
            msg: 'please dont attack me, this is just demo project.'
        })
        return
    }
    let files = req.files //读取上传来的文件
    // console.log(files);
    let urls = files.map(file => `/uploads/${file.filename}`) //网站根目录的..文件
    res.json({
        code: 0,
        result: urls // 返回一串头像所在地址，即 ['/uploads/xxxx.jpeg']
    })
})


// 待注册的邮箱列表
const newRegisters = {
    // uuid: {res, limitedTime, successValid, emial, password, name, avatar, salt}
}

//  /register 注册界面
app.post('/register', (req, res, next) => {
    let regInfo = req.body
    // ★也许需要验证是否在合法页面下申请
    //效验了 名字格式-1  密码不为空-2 邮箱格式-3 邮箱已占用-4
    let USERNAME_RE = /^[0-9a-z_A-Z]+$/
    let USEREMAIL_RE = /^[\S]+@[\S]+\.com$/
    if (!USERNAME_RE.test(regInfo.name)) { //用户名不允许特殊字符，除了_
        res.status(449).json({ // 449 retry with
            code: -1,
            msg: 'invalid username, can only contain digit, letter and _, please post new username again.'
        })
    } else if (regInfo.password.trim() == '' || regInfo.password.length < 6) { //密码不为空且大于6位
        res.status(449).json({
            code: -2,
            msg: 'invalid password, your may post a spaces password or your password is not enough long.'
        })
    } else if (!USEREMAIL_RE.test(regInfo.email)) { //邮箱格式不对
        res.status(449).json({
            code: -3,
            msg: 'invalid email, please provide a valid email'
        })
    } else {
        //邮箱已被注册
        let existUser = db.prepare('SELECT * from users WHERE email = ? and deprecated != ?')
            .get(regInfo.email, 1)
        if (existUser && !existUser.deprecated) { //邮箱代表的用户存在，不允许注册
            res.status(403).end({
                code: -4,
                msg: 'email or name has existed, please use unused email to registe a new account.'
            })
            return
        }

        //发送等待激活的注册邮件
        let id = uuidv4() //待验证的注册编号
        const newAvatar = regInfo.avatar ? regInfo.avatar : '/uploads/default.jpg'; //头像
        const salt = Math.random().toString(36).slice(2) //盐
        newRegisters[id] = {
            email: regInfo.email,
            name: regInfo.name,
            salt: salt,
            password: md5(md5(regInfo.password) + md5(salt)),
            avatar: newAvatar,
            limitedTime: Date.now() + 1800000, //30分钟验证时间
            res,
            successValid: false, //验证成功与否的状态，即发给用户的连接被点击
        }
        let link = `http://localhost:8081/account/active-register/` + id //下放给用户注册的链接


        let info = transporter.sendMail({
            from: '"cy" <aut1smer@foxmail.com>',
            to: regInfo.email,
            subject: 'valid your email for reset vote account',
            html: `<h2>激活您的账号</h2>
                <div>感谢您在nekoda投票的注册，点击链接以激活您的账号。祝你今天有个好心情！</div>
                <a href="${link}" target="_self">激活账号链接</a>
        `
        }, (err, info) => {
            if (err) {
                console.log('邮件发送出错，错误为', err);
            } else {
                console.log('邮件已发送', info.messageId);
            }
        })

        // 这里的result是 {changes:1, lastInsertRowid:19} 的对象，表示修改数据库
        res.status(200).json({
            code: 0,
            msg: '邮件发送成功', //随便给个空信息，注册成功，前端跳转登录页
        })
    }
})


//邮箱首次注册
app.get('/active-register/:id', (req, res, next) => {
    let id = req.params.id
    if (!newRegisters[id]) { // 非维护的会话id
        res.status(511)
            .end('these register is not found because of time limited or invalid resgited')
        return
    }
    if (Date.now() > newRegisters[id].limitedTime) {
        res.status(400).end(
            'this registration has been limitted, please retry.' + '\r\n' +
            '本次注册已过期，请重试'
        )
            ; delete newRegisters[id];
        return
    }

    let { salt, password, name, email, avatar } = newRegisters[id] // {salt, password, name, email, avatar}


    //注册成功
    let addUserStmt = db.prepare('INSERT INTO users (name, password, salt, email, avatar, deprecated) VALUES(?,?,?,?,?,?)')
    let result = addUserStmt.run(name, password, salt, email, avatar, 0)
        ; delete newRegisters[id];

    res.redirect('http://localhost:3000/')
    // res.status(200).json({
    //     code: 0,
    //     msg: 'resigte success!'
    // })
})

//captcha-img 发放验证码及验证码答案
app.get('/captcha-img', (req, res, next) => {
    let captcha = svgCaptcha.create({
        noise: 2, //2条干扰线
    })
    // req.captcha = captcha.text //挂一下req？？ 明明每次req都不一样
    res.type('svg')

    res.status(200).send({
        code: 0,
        result: {
            captcha: captcha.data, //svg
            text: captcha.text //验证码答案
        }
    })
})

//处理登录表单请求 校验验证码与登录用户存在与否
app.post('/login', (req, res, next) => {
    let loginInfo = req.body

    console.log('post->/login', loginInfo);
    let user = db.prepare(`SELECT * FROM users WHERE email = ? AND deprecated = ?`).get(loginInfo.email, 0)
    if (!user) { //用户不存在
        res.status(400).json({
            code: -1,
            msg: 'this user do not exist because of email or has been online.'
        })
        return
    }

    console.log('post->/login', user);
    //user是一个对象{userId:xx, name:xx, pswd:xx...}

    if (md5(md5(loginInfo.password) + md5(user.salt)) != user.password) { //密码不对
        res.status(401).json({
            code: -1,
            mgs: 'password incorrect!'
        })
        return
    }
    //登录成功，发放cookie
    res.cookie('loginUser', user.userId, {
        signed: true, //加密
        sameSite: 'strict', //防csrf默认lax允许部分三方网站带cookie，比如get和JSONP；strict只允许同站带cookie（非同域，ip一致即可）
        // maxAge: 86400000, //相对过期时间点1day，毫秒计算，过期后浏览器自动删除并不在请求中附上
        // expires: new Date('2022 2 24 18:00:00'), // 绝对过期时间点
        // httpOnly: true, //在请求时带在头里，不能通过document.cookie读到，防XSS
    })

    res.json({ //发给前端作展示
        code: 0,
        result: user, //★待修改：前端是否需要密码和salt等信息
    })
    // 不用session而把数据库中的deprecated字段看做sessionId，维持会话并设置该登录态
    db.prepare('update users set deprecated = ? where userId = ? and deprecated = ?').run(2, user.userId, 0)
})

// 待改密的邮箱列表
const changePassMap = {
    // uuid: {email,limitedTime, res, successValid}
}

//忘记密码  验证邮箱正确-2 并 发送邮件
app.post('/forget-password', async (req, res, next) => {
    const email = req.body.email
    if (!req.headers.referer.endsWith('/localhost:3000/')) { //★这里防盗链可能出错
        res.status(400).json({
            code: -1,
            msg: 'please dont attack me !! TAT'
        })
        return
    }
    let user = db.prepare('select * from users where email = ? and deprecated != ?').get(email, 1)
    if (!user) { //没这个人哦
        res.status(404).json({
            code: -2,
            msg: 'invalid email'
        })
        return
    }
    let id = uuidv4() //随机数
    changePassMap[id] = {
        email,
        res,
        limitedTime: Date.now() + 1800000, //30分钟验证时间
        successValid: false, //验证成功与否的状态，即发给用户的连接被点击
    }
    let link = `http://localhost:8081/account/forget-password/` + id
    console.log('email', email);
    console.log('req.body', req.body);
    // let testAccount = await nodemailer.createTestAccount(); //测试用户

    let info = await transporter.sendMail({
        from: '"cy" <aut1smer@foxmail.com>',
        to: email,
        subject: 'valid your email for reset vote account',
        html: `<h2>hey, do you forget your password for your vote account?</h2>
                <div>DONT worry! please click this link to reset your account!</div>
                <a href="${link}">reset account</a>
        `
    }, (err, info) => {
        if (err) {
            console.log('邮件发送出错，错误为', err);
        } else {
            console.log('邮件已发送', info.messageId);
        }
    })

    res.status(200).json({
        code: 0,
        result: {}
    })
})

// 邮箱点击链接验证通过 || 不通过  重定向一个页面用于改密码 || 告知超时
app.get('/forget-password/:id', (req, res, next) => {
    let id = req.params.id
    console.log('----------------邮箱页面');
    if (!(changePassMap[id]) || changePassMap[id].limitedTime < Date.now()) { //id过期
        // res.status(400).json({
        //     code: -1,
        //     msg: 'this link is not exist, maybe it has been expired.'
        // })
        delete changePassMap[id]; //超时删服务器缓存
        res.redirect('http://localhost:3000/expired-change-password')
        return
    }
    // const thisUserResponse = changePassMap[id]
    // res.status(200).json({
    //     code: 0,
    //     msg: 'valid email success'
    // })
    changePassMap[id].successValid = true //验证成功
    //sessionId发放到用户身上
    res.cookie('changePasswordId', id, {
        signed: true,
        sameSite: 'strict',
    })
    res.redirect(`http://localhost:3000/change-password?email=${changePassMap[id].email}`)
})

//修改密码 提至数据库
app.post('/change-password', (req, res, next) => {
    // 源站判断 简单防下csrf（实际要用cookie的samesite:strict）
    if (!req.headers.referer.startsWith('http://localhost:3000/')) {//★记得改
        res.status(404).json({
            code: -1,
            msg: '非正常来源！please dont attack me'
        })
        return
    }
    // console.log(req.);
    let sessionId = req.signedCookies.changePasswordId
    const { email, password } = req.body
    let validId = null
    for (let id in changePassMap) {
        if (changePassMap[id].email === email) {
            validId = id
        }
    }
    // console.log('sessionIdCookie === emailSearchId ?', sessionId == validId); //记得前端带凭据..
    // console.log('emailSearchId::', validId);
    // console.log('sessionIdCookie::', sessionId);
    if (!validId || !changePassMap[validId].successValid || sessionId != validId) { //连接不存在，没验证成功
        delete changePassMap[validId];
        res.status(400).json({
            code: -1,
            msg: 'validate fail'
        })
        return
    }

    if (password.trim() == '' || password.length < 6) { //密码不符合格式
        res.status(400).json({
            code: -3,
            msg: 'invalid password for change a new password'
        })
        return
    }

    if (Date.now() > changePassMap[validId].limitedTime) { //超时
        delete changePassMap[validId];
        // res.redirect('http://localhost:3000/expired-change-password')
        res.status(400).json({
            code: -2,
            msg: 'time limit out.'
        })
        return
    }
    res.clearCookie('changePasswordId', {
        signed: true
    })
        ; delete changePassMap[validId]; //删掉此连接，修改密码成功
    // console.log('有效期的uuid被删除');
    let user = db.prepare('SELECT * FROM users WHERE email = ? and deprecated != ?').get(email, 1)
    let stmt = db.prepare('UPDATE users SET password = ? WHERE email = ? and deprecated != ?')
    stmt.run(md5(md5(password) + md5(user.salt)), email, 1)
    res.status(200).json({
        code: 0,
        msg: '修改成功'
    })
})




//登出时清除cookie， 也可以不过后台放到前端登出时就清除cookie
app.get('/logout', (req, res, next) => {

    console.log('get->/account/logout下的req.loginUser', req.loginUser);
    if (!req.isLogin) {
        res.status(400).json({
            code: -1,
            msg: 'please dont attack me TAT, i am just a student from a poor family.'
        })
        return
    }
    const userId = Number(req.loginUser.userId)

    // res.redirect('https://www.baidu.com')
    //登出deprecated置为0
    let stmt = db.prepare('UPDATE users SET deprecated = ? where userId = ? and deprecated = ?')
    stmt.run(0, userId, 2)

    res.status(200).clearCookie('loginUser', {
        signed: true,
        // httpOnly: true
    }).json({
        code: 0,
        msg: '清除cookie成功',
    })
    //
})

//登录态下销毁当前账号
app.post('/deprecateLoginUser', (req, res, next) => {
    if (!req.loginUser) { //未登录
        res.status(401).end({
            code: -1,
            msg: 'not login'
        })
        return
    }
    let userId = Number(req.loginUser.userId)
    res.clearCookie('loginUser')
    let stmt = db.prepare('UPDATE users SET deprecated = ? where userId = ?').run(1, userId)
    res.status(200).end({
        code: 0,
        msg: 'deprecate current user success!'
    })
})


//获取到当前可能已经登录的用户信息，给全局登录态用
app.get('/current-user', (req, res, next) => {
    console.log('get->/account/current-user下的req.loginUser', req.loginUser); //应该是null
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

module.exports = app