import { forceLogin } from "../components/hooks"

import { Link } from "react-router-dom"
function MyVotes({ userInfo }) {
    // const { data, loading, error } = useUser()
    // // const { data, loading, error, update } = useAxios({ url: '/vote' })
    // if (loading) {
    //     return 'Loading..'
    // }
    // if (error) {
    //     return <RequireLogin />
    // }

    console.log('MyVotes发来的数据userInfo：', userInfo); // {}
    // const user = data.result
    // 
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

export default forceLogin(MyVotes)