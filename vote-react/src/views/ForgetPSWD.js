import axios from "axios"
import { useCallback, useContext, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button, Input, message, notification } from "antd"
import { SmileOutlined, UserOutlined } from '@ant-design/icons'
import { CurMenu } from "../App"
import './ForgetPSWD.css'
import { useInput } from "../components/hooks"
// 在Login、MyVotes下的 Link:忘记密码 将会导航到该组件
//
// :3000/forget-password
export default function ForgetPSWD() {
    const [seeMail, setSeeMail] = useState(false)
    const [secondCount, setSecondCount] = useState(5)
    const secondRef = useRef()
    secondRef.current = secondCount
    const navigator = useNavigate()
    const curMenu = useContext(CurMenu)
    const userEmail = useInput('')
    const emailRef = useRef('')
    emailRef.current = userEmail.value

    const submitEmail = useCallback((e) => {
        let emailRe = /^[\S]+@[\S]+\.com$/
        const email = emailRef.current
        if (!emailRe.test(email)) {
            message.error('邮箱格式错误，请重新输入')
            return
        }
        notification.open({
            message: '请检查邮箱',
            description: '查验您的邮箱，通过点击链接完成修改密码',
            icon: <SmileOutlined style={{ color: '#108ee9' }} />
        })

        axios.post('https://vote.nekoda.cn:443/account/forget-password', { email: email }).then(res => {
            setSeeMail(s => true)
            let id = setInterval(() => {
                setSecondCount(c => c - 1)
                if (secondRef.current == 0) {
                    curMenu.updateCurMenuData(['1'])
                    navigator('/')
                    clearInterval(id)
                }
            }, 1000)
        }).catch(e => {
            if (e.response?.data?.code == -2) {
                message.error('邮箱格式错误，请重新输入')
                // console.log(e.response.data.msg); //invalid email
            } else {
                console.dir('修改密码请求错误，非邮件格式', e.toJSON());
            }
        })
    }, [])

    const validEmail = useCallback((e) => {
        let emailRe = /^[\S]+@[\S]+\.com$/
        let emailSpan = document.querySelector('#validSuccess')
        const email = e.target.value
        if (!emailRe.test(email)) {
            message.error('邮箱格式错误，请重新输入')
            e.target.value = ''
            return
        }
        emailSpan.textContent = '✔️'
    }, [])
    const emailFocus = useCallback(() => {
        let emailSpan = document.querySelector('#validSuccess')
        emailSpan.textContent = ''
    }, [])
    const goHome = useCallback(() => {
        curMenu.updateCurMenuData(['1'])
        navigator('/')
    }, [])

    return (
        <div className="forgetPSWD">
            <header>
                <h2>忘记密码</h2>
            </header>
            <main>
                {seeMail
                    ? <section>
                        <h2>^^ 请检查您的邮箱，以激活修改密码页面 </h2>
                        <p>距离跳转到首页还有{secondCount}秒</p>
                    </section>
                    : <>
                        <div>
                            <div>请输入您的注册邮箱：<span id="validSuccess"></span></div>
                            <Input type="text" id="email" placeholder="请输入您的注册邮箱"
                                {...userEmail} onBlur={validEmail} onFocus={emailFocus}
                                suffix={<UserOutlined />} addonBefore="邮箱账号" />
                        </div>
                        <div>
                            <Button onClick={goHome}>回到首页</Button>
                            <Button type="primary" onClick={submitEmail}>提交</Button>
                        </div>
                    </>
                }
            </main>

        </div>
    )
}