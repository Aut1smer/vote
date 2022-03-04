import { NavLink, Route, Routes, Outlet } from "react-router-dom"
// import CreateUI from "./CreateUI"
// import MyVotes from "./MyVotes"
export default function Main(props) {

    return (
        <div>
            {/* CreateUI  Myvotes here */}
            <Outlet />

            <nav>
                <NavLink to='create' style={({ isActive }) => {

                    return isActive ? {
                        backgroundColor: 'turquoise',
                        color: 'red',
                    } : {
                        backgroundColor: 'white',
                        color: 'blue'
                    }
                }}>新建</NavLink>
                {'      |     '}
                <NavLink to='myvotes' style={({ isActive }) => isActive ? {
                    backgroundColor: 'turquoise',
                    color: 'red',
                } : {
                    backgroundColor: 'white',
                    color: 'blue'
                }}>我的</NavLink>
            </nav>
        </div>
    )
}