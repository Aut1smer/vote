import { useAxios, useUser } from "../components/hooks"
import RequireLogin from "./RequireLogin"
import { Link } from "react-router-dom"
export default function MyVotes(props) {
    const { data, loading, error } = useUser()
    // const { data, loading, error, update } = useAxios({ url: '/vote' })
    if (loading) {
        return 'Loading..'
    }
    if (error) {
        return <RequireLogin />
    }

    console.log('MyVotes发来的数据userdata：', data);
    console.log('MyVotes发来的错误err：', error);
    const user = data.result
    return (
        <div>
            我的投票
            <ul>
                <Link to='/view-vote/1'>1</Link>
                {'\r\n'}
                <Link to='/view-vote/8'>8</Link>
            </ul>
        </div>
    )
}