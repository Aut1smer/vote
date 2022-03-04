
//注册界面
export default function Register(props) {
    return (
        <div>
            <form action="POST">
                <div>用户名：</div>
                <input type="text" />
                <div>密码：</div>
                <input type="text" />
                <div>电子邮箱：</div>
                <input type="text" />
                <div><button>注册</button></div>
            </form>
        </div>
    )
}