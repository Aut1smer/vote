
import { useNavigate } from "react-router-dom"
import { Result, Button } from "antd"
import { useCallback, useContext } from "react"
import { CurMenu } from "../App"
//跳转需要登录
export default function RequireLogin() {
    const navigate = useNavigate()
    const curMenu = useContext(CurMenu)
    const goLogin = useCallback(() => {
        navigate('/login')
    }, [])
    const goRegister = useCallback(() => {
        navigate('/register')
    }, [])
    const goHome = useCallback(() => {
        curMenu.updateCurMenuData(['1'])
        navigate('/')
    }, [])
    return (
        <div>
            <Result title="需要登录" extra={
                <>
                    <Button onClick={goHome}>回到首页</Button>
                    <Button type="primary" onClick={goLogin}>登录</Button>
                    <Button onClick={goRegister}>注册</Button>
                </>
            } />

        </div>
    )
}