
import { useNavigate } from "react-router-dom"
import './CreateUI.css'
import { Card } from "antd"
import { useCallback, useContext, useEffect } from "react"
import { CurMenu } from "../App"

//将引导至创建投票的具体设置界面
export default function CreateUI(props) {
    const navigator = useNavigate()
    const curMenu = useContext(CurMenu)

    //切到该组件，选择 新建
    useEffect(() => {
        curMenu.updateCurMenuData(['1'])
    }, [])

    const goCreateSingle = useCallback(() => {
        navigator('/create-vote')
    }, [])
    const goCreateMultiple = useCallback(() => {
        navigator('/create-vote?multiple=1')
    }, [])
    return (
        <div className="createUI">
            <div className="card">
                <div className="card-img-1"></div>
                <Card.Grid className="card-link" onClick={goCreateSingle}>
                    单选投票
                </Card.Grid>
            </div>
            <div className="card">
                <div className="card-img-2"></div>
                <Card.Grid className="card-link" onClick={goCreateMultiple}>
                    多选投票
                </Card.Grid>

            </div>
        </div>
    )
}