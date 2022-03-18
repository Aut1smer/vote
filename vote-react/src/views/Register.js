import axios from "axios"
import { useCallback, useContext, useEffect, useMemo, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useAxios } from "../components/hooks"
import { Input, Button, message, notification } from "antd"
import {
    EyeInvisibleOutlined, EyeTwoTone, UserOutlined, MailOutlined,
    ArrowLeftOutlined, UploadOutlined, PaperClipOutlined, FrownOutlined,
    SelectOutlined
} from '@ant-design/icons'
import './Register.css'
import { CurMenu } from "../App"
//注册界面

export default function Register(props) {
    //拿验证码
    const captchaResult = useAxios({
        url: '/account/captcha-img',
    })
    const captchaRef = useRef(captchaResult)
    captchaRef.current = captchaResult

    //返回导航
    const navigator = useNavigate()
    //菜单Menu 新建 我的
    const curMenu = useContext(CurMenu)
    useEffect(() => {
        const id = setInterval(() => {
            reloadCaptcha()
        }, 300000) //5min更新一次验证码
        return () => {
            clearInterval(id)
        }
    }, [])

    const getCaptcha = useMemo(() => { //设置验证码
        const { data, loading, error } = captchaRef.current
        // const  = captchaResult
        if (loading || error) return null
        document.querySelector('#capt').innerHTML = data.result.captcha
        // const domParser = new DOMParser()
        // const dom = domParser.parseFromString(data.result.captcha, 'image/svg+xml')
        // console.log(dom.firstChild);
        // return dom.firstChild //svg是嵌套元素，直接写展不开
    }, [captchaResult.loading])

    const reloadCaptcha = useCallback(() => { //更新验证码 5min || 点击
        captchaRef.current.update()
    }, [])

    //前端校验
    const sendAvatar = (e) => {  //验证头像文件格式大小，上传文件并拿到对应url
        let file = e.target.files[0] // {lastModified, name, size, type,}
        let types = ['image/png', 'image/jpeg', 'image/gif', 'image/bmp', 'image/webp']
        let fileFB = document.querySelector('#fileFB')
        if (file) { //允许file不存在，后端设为默认头像
            let fileName = document.querySelector('#fileName')
            let fileSpan = document.querySelector('#fileSpan')
            fileName.style.display = 'block';
            fileSpan.textContent = file.name
            if (!types.some(it => it === file.type)) {//头像文件类型错误
                message.error('头像类型错误，请选择png、jpeg、gif、bmp或者webp作为头像')
                fileFB.style.display = 'block'
                return
            }
            if (file.size > 5242880) { //头像大于5M
                message.error('头像过大，请上传小于5MB的文件')
                return
            }
        }
        fileFB.style.display = 'none'
        let formData = new FormData()
        formData.append('file', file)
        axios.post('/account/upload', formData).then((res) => {
            if (res.status == 200) {
                let avt = document.querySelector('#avatar')
                avt.value = res.data.result[0]
            }
        }).catch(e => {
            message.error('网络错误')
            console.log(e.toJSON());
        })
    }

    const validName = useCallback((e) => {
        let USERNAME_RE = /^[0-9a-z_A-Z]+$/
        const nameFB = document.querySelector('#nameFB')
        if (!USERNAME_RE.test(e.target.value)) {
            nameFB.textContent = ''
            message.error('用户名格式非法，请删除特殊字符')
        } else {
            nameFB.textContent = '✔️'
        }
    }, [])
    const validEmail = useCallback((e) => {
        let emailRe = /^[\S]+@[\S]+\.com$/
        let emailText = e.target.value
        const emailFB = document.querySelector('#emailFB')
        if (!emailRe.test(emailText)) {
            emailFB.textContent = ''
            message.error('邮箱格式非法')
        } else {
            emailFB.textContent = '✔️'
        }
    }, [])
    const validPassword = useCallback((e) => {
        let pswd = e.target.value
        const pswdFB = document.querySelector('#passwordFB')
        if (pswd.trim() == '' || pswd.length < 6) {
            pswdFB.textContent = ''
            message.error('密码长度不能小于6个字符且不能为空')
        } else {
            pswdFB.textContent = '✔️'
        }
    }, [])

    //发送注册信息
    const sendRegisterInfo = () => {
        const delivery = {
            name: null,
            email: null,
            password: null,
            avatar: null,
        }
        const inputs = Array.from(document.querySelectorAll('input'))
        //校验验证码
        let captText = inputs.at(-1).value
        if (captText !== captchaRef.current.data?.result?.text) {
            message.error('验证码错误')
            reloadCaptcha()
            return
        }
        delivery.name = inputs[0].value;
        delivery.email = inputs[1].value
        delivery.password = inputs[2].value;
        delivery.avatar = inputs[4].value

        axios.post('/account/register', delivery).then(res => {
            // 1.返回登录页  2.等待验证邮箱，返回验证界面，验证完毕则回到登录页
            //
            notification.info({
                message: '邮箱查验',
                description: '请查验您的邮箱，点击邮件里的注册链接，以完成注册 :) \r\n 五秒后自动回到首页',
                icon: <SelectOutlined />,
                placement: 'topRight', //弹出位置
            })
            setTimeout(() => {
                curMenu.updateCurMenuData(['1'])
                navigator('/')
            }, 5000)
        }).catch(e => {
            const response = e.response
            switch (response.data.code) {
                case -1:
                    message.error('用户名格式错误！请重新注册')
                    break;
                case -2:
                    message.error('密码格式错误！请重新注册')
                    break;
                case -3:
                    message.error('邮箱格式错误！请重新注册')
                    break;
                case -4:
                    message.error('邮箱已注册，请输入新的有效邮箱')
                    break;
                default:
                    message.error('网络错误')
                    console.log(e.toJSON());
                    break;
            }
            reloadCaptcha()
        });
    }

    // 返回上一级
    const goBack = useCallback(() => {
        navigator(-1)
    }, [])
    return (
        <div className="register">
            <header>
                <h2>欢迎注册nekoda投票</h2>
                <Button type="primary" onClick={goBack}><ArrowLeftOutlined /></Button>
            </header>
            <main>
                {/* <form method="POST" action="./account/register" encType="multipart/form-data"> */}
                {/* mdn form，encType为该值时才能把file文件传过去，否则只传文件名
                    请求体类型content-type: multipart/form-data
                */}
                <section>
                    <div><span>用户名（仅作展示）：</span><span id="nameFB"></span></div>
                    <Input type="text" name="name" suffix={<UserOutlined />} onBlur={validName} />
                </section>
                <section>
                    <div><span>电子邮箱（同登录账号）：</span><span id="emailFB"></span></div>
                    <Input type="text" name="email" suffix={<MailOutlined />} onBlur={validEmail} />
                </section>
                <section>
                    <div><span>密码（仅允许英文大小写、数字和_）：</span><span id="passwordFB"></span></div>
                    <Input.Password type="password" name="password" onBlur={validPassword} iconRender={(visible) => visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />} />
                </section>
                <section className="avatar">
                    <div>
                        <span>用户头像（上传新头像将顶替旧头像，传空则使用默认头像）：</span>
                        <span id="fileFB" style={{ color: 'red', display: 'none' }}>
                            <FrownOutlined />
                        </span>
                    </div>
                    <div>
                        <Button icon={<UploadOutlined />}><label htmlFor="upload">上传头像</label></Button>
                        <span id="fileName" style={{ display: 'none' }}>
                            <span><PaperClipOutlined /></span>
                            <span id="fileSpan"></span>
                        </span>
                    </div>
                    <input type="file" id="upload" onChange={sendAvatar} hidden />
                    {/* 返回的url将会用于填写头像地址 */}
                    <input type="text" hidden name="avatar" id="avatar" />
                </section>
                <section>
                    <div><span>验证码（区分大小写）：</span><span id="captchaFB"></span></div>
                    <div className="captcha">
                        <Input type="text" name="captcha" />
                        <span id="capt" onClick={reloadCaptcha} style={{ cursor: 'pointer', display: 'block', width: 100 }}></span>
                    </div>
                </section>
                <footer>
                    <Button type="primary" onClick={sendRegisterInfo}>注册</Button>
                    <Button onClick={goBack}>取消</Button>
                </footer>
                {/* </form> */}
            </main>
        </div>
    )
}