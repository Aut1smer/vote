import { Outlet, Link } from "react-router-dom"
import { Menu } from "antd"
import './Main.css'

// import CreateUI from "./CreateUI"
// import MyVotes from "./MyVotes"
import { CurMenu } from "../App"
import { useCallback, useContext, useState } from "react"
export default function Main() {
    //选中Menu的 新建 || 我的，保存状态
    const { selected, updateCurMenuData } = useContext(CurMenu)
    console.log(CurMenu, useContext(CurMenu));
    console.log('selected', '---', selected);
    const [c, setC] = useState(0)
    const cbSelect = useCallback(({ item, key }) => {
        updateCurMenuData(key)
        setC(c => c + 1)
    }, [])
    return (
        <div className="main">
            {/* CreateUI or Myvotes here */}
            <Outlet />
            <nav>
                <Menu theme="light" mode="horizontal" selectedKeys={selected}
                    onSelect={cbSelect}
                >
                    <Menu.Item key="1">
                        <Link to='create'>新建</Link>
                        {/* <NavLink to='create' style={({ isActive }) => {
                            return isActive ? {
                                backgroundColor: 'turquoise',
                                color: 'red',
                            } : {
                                backgroundColor: 'white',
                                color: 'blue'
                            }
                        }}>新建</NavLink> */}
                    </Menu.Item>
                    <Menu.Item key="2">
                        <Link to='myvotes'>我的</Link>
                        {/* <NavLink to='myvotes' style={({ isActive }) => isActive ? {
                            backgroundColor: 'turquoise',
                            color: 'red',
                        } : {
                            backgroundColor: 'white',
                            color: 'blue'
                        }}>我的</NavLink> */}
                    </Menu.Item>
                </Menu>
            </nav>
        </div>
    )
}