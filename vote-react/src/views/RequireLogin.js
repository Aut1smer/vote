
import { Link } from "react-router-dom"

//跳转需要登录
export default function RequireLogin(props) {

    return (
        <div>
            <h2>需要登录</h2>
            <Link to="/login">登录</Link>
        </div>
    )
}