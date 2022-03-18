import { Link } from "react-router-dom"

export default function ExpiredChangePSWD() {
    return (
        <div style={{
            margin: '20px auto',
            textAlign: 'center',
            fontSize: '16px'
        }}>
            😔 您未在30分钟内完成修改指引，请
            <Link to="/forget-password">重试</Link>
        </div>
    )
}