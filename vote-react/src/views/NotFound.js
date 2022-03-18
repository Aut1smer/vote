import { Result, Button } from "antd"
import { useCallback } from "react"
import { useNavigate } from "react-router-dom"


export default function NotFound() {
    const navigator = useNavigate()
    const backHome = useCallback(() => {
        navigator('/')
    }, [])
    return (
        <Result status={404} title="出了点问题.." subTitle="抱歉，本页面不存在.." extra={
            <Button type="primary" onClick={backHome}>回到首页</Button>
        } />
    )
}