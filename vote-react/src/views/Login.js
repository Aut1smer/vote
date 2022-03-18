
// import axios from "../api" //跨域请求后端API方案1
import axios from "axios"
import { useEffect, useCallback, useRef, useContext } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useInput, useUser } from '../components/hooks'
import { Button, Input, message } from "antd"
import { EyeInvisibleOutlined, EyeTwoTone, UserOutlined, ArrowLeftOutlined } from "@ant-design/icons"
import './Login.css'
import { CurMenu } from "../App"

// 登录页面
export default function Login() {
    const userEmail = useInput()
    const password = useInput()
    const navigate = useNavigate()
    const userInfo = useUser() // /account/current-user -> useAxios ；userInfo=={data, loading, error, update}
    const loginData = useRef({})
    loginData.current = {
        email: userEmail.value,
        password: password.value
    }
    const menuInfo = useContext(CurMenu)
    //已在登录态，返回前页
    useEffect(() => {
        if (!userInfo.data || userInfo.error || userInfo.loading || userInfo.data.code === -1) {

        } else if (userInfo.data.code === 0) {
            navigate(-1)
        }
    }, [])

    // 发请求 axios
    const userLogin = useCallback(async function userLogin() {
        const info = loginData.current //当心Capture Value
        //axios返回的都是响应对象,响应体在响应对象的data上
        // let response = await axios.post('/account/login', info, {
        //     withCredentials: true //带上凭据Cookie 在fetch的配置里要写"credentials:'include'"
        // }) //跨域请求后端API

        try {
            let response = await axios.post('https://vote.nekoda.cn:443/account/login', info) //反向代理请求后端API，登录成功拿到cookie
            // let data = response.data //响应体反序列化的内容
            console.log('登录页面登录成功响应头', response);
            //这里记录用户当前的登录信息（在cookie里），如头像等
            userInfo.update() //用cookie再登录一次，更新组件树，让全局组件共享登录信息，顺带更新那些使用了<RequireLogin>的组件页面
            navigate(-1)
        } catch (e) { //1.请求成功 响应码>=400 在axios中算失败； 2.请求本身因网络等因素失败
            // console.log(e.toJSON());
            // console.log(e.response.data); //响应对象挂有内容
            if (e.response) {
                message.error('请输入正确的账号密码')
                console.log('Login组件登录出错', e.response.data) //  {code : -1, msg: 'xxx'} 没输对密码账号
            } else {
                // alert('you have net error, then axios failed request.')
                message.error('当前网络不太好..')
            }
        }
    }, [])

    const backHome = useCallback(() => {
        navigate('/')
        menuInfo.updateCurMenuData(['1'])
    }, [])

    return (
        <div className="login">
            <header>
                <h2>欢迎使用nekoda投票</h2>
                <Button type="primary" onClick={backHome}><ArrowLeftOutlined /></Button>
            </header>
            <main>
                <div>
                    <Input placeholder="请输入您的注册邮箱" {...userEmail} suffix={<UserOutlined />}
                        addonBefore="邮箱账号" />
                </div>
                <div>
                    <Input.Password placeholder="请输入6位以上的非空密码" {...password}
                        addonBefore="登录密码"
                        iconRender={visible => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)} />
                </div>
                <div>
                    <span><Button type="primary" onClick={userLogin}>登录</Button></span>
                    <span><Link to="/forget-password">忘记密码?</Link></span>
                </div>
            </main>
        </div>
    )
}