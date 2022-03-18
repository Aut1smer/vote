import { message } from "antd"
import axios from "axios"
import { useCallback, useContext } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { CurMenu } from "../App"
import { Button, Input } from "antd"
import { EyeTwoTone, EyeInvisibleOutlined } from '@ant-design/icons'
import { useInput } from "../components/hooks"
import './ChangePSWD.css'

//邮件通过验证，激活修改密码区块
export default function ChangePSWD() {
    const [searchParams, setSearchParams] = useSearchParams()
    const navigator = useNavigate()
    const curMenu = useContext(CurMenu)

    const password1 = useInput('')
    const password2 = useInput('')

    //发送修改密码
    const sendChange = useCallback(() => {
        const delivery = {
            email: null,
            password: null,
        }
        const ps1 = document.querySelector('#ps1')
        const ps2 = document.querySelector('#ps2')

        if (ps1.value !== ps2.value) {
            message.error('两次密码输入不一致，请重试')
            ps1.value = ''
            ps2.value = ''
            return
        }

        if (ps1.value.trim() == '' || ps1.value.length < 6) {
            message.error('密码格式错误')
            ps1.value = ''
            ps2.value = ''
            return
        }
        delivery.email = searchParams.get('email')
        delivery.password = ps1.value
        //★请稍后，修改完密码后将跳至首页
        axios.post('http://localhost:8081/account/change-password', delivery, {
            withCredentials: true
        }).then((res) => {
            //修改成功，返回首页
            message.success('修改密码成功，祝你有个好心情')
            curMenu.updateCurMenuData(['1'])
            setTimeout(() => {
                navigator('/')
            }, 2000)
        }).catch(e => {
            //修改失败，可能是因为绕过前端直接发请求
            if (!e.response.data) {
                message.error('修改密码失败，请检查您的网络并重试')
                return
            }
            const code = e.response.data.code
            if (code == -2) {
                message.error('修改密码失败，邮箱验证超时，请重试.\r\n 5秒后自动跳转')
                navigator('/forget-password')
            } else if (code == -3) {
                message.error('修改密码失败，请输入合法新密码')
            }
            message.error('修改密码失败' + e.response.data?.code ?? '' + e.response.data?.msg ?? '',)
            // alert(e.response.data?.code, e.response.data?.msg)
            // console.log('修改密码失败', e.toJSON());
        })
    }, [])

    const goBack = useCallback(() => {
        navigator(-1)
    }, [])

    // 前端验证密码格式
    const focusInput1 = useCallback(() => {
        let firstValidateSpan = document.querySelector('#firstValidate')
        firstValidateSpan.textContent = ''
    }, [])
    const focusInput2 = useCallback(() => {
        let secondValidateSpan = document.querySelector('#secondValidate')
        secondValidateSpan.textContent = ''
    }, [])
    const blurInput1 = useCallback((e) => {
        let firstValidateSpan = document.querySelector('#firstValidate')
        let password = e.target.value.trim()
        if (password.length < 6) {
            message.error('密码格式错误')
            return
        }
        let ps2 = document.querySelector('#ps2')
        if (ps2.value && ps2.value !== password) { //ps2里有重复密码，后输入并blur ps1，验证一致
            message.error('两次密码输入不一致，请重试')
            return
        }
        firstValidateSpan.textContent = '✔️'
    }, [])
    const blurInput2 = useCallback((e) => {
        let password = e.target.value.trim()
        let ps1 = document.querySelector('#ps1')
        if (password.length < 6 || ps1.value !== password) {
            message.error('两次密码输入不一致，请重试')
            return
        }
        let firstValidateSpan = document.querySelector('#firstValidate')
        let secondValidateSpan = document.querySelector('#secondValidate')
        firstValidateSpan.textContent = '✔️'
        secondValidateSpan.textContent = '✔️'
    })

    return (
        <div className="changePSWD">
            <header><h2>设置新密码</h2></header>
            <main>
                <section>
                    <div><span>请输入您的新密码：</span> <span id="firstValidate"></span></div>
                    <Input.Password type="password" name="password" id="ps1"
                        placeholder="请输入6位以上的非空密码" {...password1} addonBefore="新密码"
                        onFocus={focusInput1} onBlur={blurInput1}
                        iconRender={visible => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)} />
                </section>
                <section>
                    <div><span>请再次输入密码以确认：</span> <span id="secondValidate"></span></div>
                    <Input.Password type="password" name="password2" id="ps2"
                        placeholder="请输入6位以上的非空密码" {...password2} addonBefore="重复密码"
                        onFocus={focusInput2} onBlur={blurInput2}
                        iconRender={visible => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)} />
                </section>

                <footer>
                    <Button onClick={goBack}>取消</Button>
                    <Button type="primary" onClick={sendChange}>确认修改</Button>
                </footer>
            </main>
        </div>
    )
}