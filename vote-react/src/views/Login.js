
// import axios from "../api" //跨域请求后端API方案1
import axios from "axios"
import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useInput, useUser } from '../components/hooks'





// 登录页面
export default function Login(props) {
    const userName = useInput()
    const password = useInput()
    const navigate = useNavigate()
    const userInfo = useUser() // /account/current-user -> useAxios {data, loading, error, update}

    //已在登录态，返回前页
    useEffect(() => {
        if (userInfo.data) {
            navigate(-1)
        }
    })

    // 发请求 axios
    async function userLogin() {
        const info = {
            name: userName.value,
            password: password.value
        }
        //axios返回的都是响应对象,响应体在响应对象的data上
        // let response = await axios.post('/account/login', info, {
        //     withCredentials: true //带上凭据Cookie 在fetch的配置里要写"credentials:'include'"
        // }) //跨域请求后端API
        let response, data
        try {
            response = await axios.post('/account/login', info) //反向代理请求后端API，登录成功拿到cookie
            // let data = response.data //响应体反序列化的内容
            console.log('登录页面响应头', response);
            //这里记录用户当前的登录信息（在cookie里），如头像等
            userInfo.update() //用cookie再登录一次，更新组件树，让全局组件共享登录信息，顺带更新那些使用了<RequireLogin>的组件页面
            navigate(-1)
        } catch (e) { //1.请求成功 响应码>=400 在axios中算失败； 2.请求本身因网络等因素失败
            // console.log(e.toJSON());
            // console.log(e.response.data); //响应对象挂有内容
            if (e.response) {
                alert(e.response.data.msg) //  {code : -1, msg: 'xxx'} 没输对密码账号
            } else {
                alert('you have net error, then axios failed request.')
            }
        }




    }

    return (
        <div>
            <div>用户名：</div>
            <input type="text" {...userName} />
            <div>密码：</div>
            <input type="password" {...password} />
            <div><button onClick={() => userLogin()}>登录</button></div>
        </div>
    )
}