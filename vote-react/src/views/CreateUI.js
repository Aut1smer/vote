
import { Link } from "react-router-dom"
import './CreateUI.css'


//将引导至创建投票的具体设置界面
export default function CreateUI(props) {
    return (
        <div>
            <div className="card">
                <img className="card-img" src="" alt="" />
                <Link to='/create-vote'>创建单选</Link>
            </div>
            <div className="card">
                <img className="card-img" src="" alt="" />
                <Link to='/create-vote?multiple=1'>创建多选</Link>
            </div>
        </div>
    )
}