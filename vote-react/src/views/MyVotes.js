import { forceLogin, useAxios } from "../components/hooks"

import { Link } from "react-router-dom"

// 登录态下可见
function MyVotes({ userInfo }) {
    // console.log('MyVotes发来的数据userInfo：', userInfo); // {code:0, result:.. }
    const loginUser = userInfo.result // {userId name avatar}
    //拿到该用户创建的所有票版
    const { data, error, loading } = useAxios({ url: '/vote' }) //不需要发送用户信息过去有cookie验证
    if (loading) return 'Loading..'
    //  if(error) //出错的话，登录态下只可能是用户的网络问题；即用户创建的票版的请求挂掉
    console.log('登录态下的用户请求私有票版数据', data);

    // 这里需要一个翻页器
    return (
        <div>
            我的投票
            <ul>
                {
                    data.result.map(vote => {
                        return (
                            <li key={vote.voteId}>
                                <Link to={`/view-vote/${vote.voteId}`}>{vote.title}</Link>
                                <span style={{ color: '#3269da' }}>[{vote.multiple ? '多选' : '单选'}]</span>
                                <span style={{ color: '#3269da' }}>[{vote.anonymous ? '匿名' : '公开'}]</span>
                            </li>
                        )
                    })
                }
            </ul>
        </div>
    )
}

export default forceLogin(MyVotes)