
//查看投票面板 实时投票

import { useParams } from "react-router-dom"
import axios from "axios"
import { useEffect, useState, useMemo } from "react"
import { useAxios, forceLogin } from "../components/hooks"
import _ from 'lodash'
import './ViewVote.css'

/**
 * 投票页面的信息是实时更新的
 * 1. 客户端不断轮询
 * 2. comet：在客户端开个线程，请求没收到信息则保持长连接，收到消息则继续请求轮询。
 * 服务器没有数据返回则hold住该连接，直到有信息要发回去就结束该连接。
 * 
 * 3.websocket，保持一个长链接
 *
 */

function ViewVote({ userInfo: userData }) { //高阶传来的userInfo
    const { voteId } = useParams()
    const [userVotes, setUserVotes] = useState() //记录从ws上获取的最新信息
    // const { data: userData, loading: userLoading, error: userError } = useUser() //拿到登录用户个人信息
    const { data, loading, error } = useAxios({ //自封装useAxios，发送请求解得票版数据，会被ws来的新数据给冲下去
        url: '/vote/' + voteId,
        method: 'GET'
    }, voteId)

    //请求到页面建立ws长连接，服务器检测到投票信息改变则传回新的投票结果，更新组件
    useEffect(() => {
        // console.log('组件刷新了，useEffect ws');
        //需要在未加载的情况下读到截止时间
        if (loading || Date.now() > new Date(data.result.deadline).valueOf()) { //投票截至时间已过期或者未加载好数据
            return
        }
        // ws://localhost:8081/realtime-voteinfo/voteId
        const wsURL = `${window.location.protocol.replace('http', 'ws')}//${window.location.host}/realtime-voteinfo/${voteId}`
        console.log(wsURL);
        const ws = new WebSocket(wsURL)
        ws.addEventListener('message', e => {
            let data = JSON.parse(e.data) // 数据为 userVotes <json>，服务器返回当前投票的最新信息
            console.log('ws来的实时投票信息：', data);
            setUserVotes(v => data)
        })
        return () => {
            console.log('ws被关掉了');
            ws.close()
        }
    }, [voteId, loading])

    // 为 某个选项 投票/取消投票
    async function voteOption(option) {
        //压力交给后端
        const { voteId, optionId } = option
        axios.post(`/vote/${voteId}/option/${optionId}`) //单选扔掉之前的，设置新的；多选直接设置
    }

    let vote = data?.result ?? {}
    let thisPageUserVotes = (userVotes ?? vote.userVotes) || []
    let groupedVotes = useMemo(() => _.groupBy(thisPageUserVotes, 'optionId'), [userVotes, vote.userVotes])//按optionId分组
    let uniqueUsers = useMemo(() => _.uniqBy(thisPageUserVotes, 'userId'), [userVotes, vote.userVotes]) //得到去重后的所有投票人
    let totalUsers = uniqueUsers.length; //投票人数量
    console.log('groupedVotes分组后的投票数据', groupedVotes);
    console.log('totalUsers去重后的总投票人数:', totalUsers);

    //票版请求未完成
    if (loading) return 'Loading...'
    if (error instanceof Error) {
        console.log('viewvote组件发生axios请求错误：', error);
        throw error
    }
    // if (userError) { //需要登录
    //     return <RequireLogin />
    // }
    return (
        <div>
            <h1>查看投票</h1>
            <h2 title={vote.description}>title: {vote.title}</h2>
            <p style={{ color: '#3269da' }}>[{vote.multiple ? '多选' : '单选'}]</p>
            {/* <h3>description: {vote.description}</h3> */}
            <ul>
                {vote.options.map(option => {
                    // console.log(option); // {optionId, content, voteId}
                    let thisOptionVoted = groupedVotes[option.optionId] || [] //在选项optionId下投该选项的用户们 {optionId, avatar, userId, name}
                    // console.log('thisOptionVoted', thisOptionVoted);
                    return (
                        <li onClick={() => voteOption(option)} key={option.optionId} style={{ border: '1px solid red' }}>
                            [内容：{option.content}]
                            {`[${thisOptionVoted.length}票]`}
                            [{totalUsers == 0 ? 0 : (thisOptionVoted.length * 100 / totalUsers).toFixed(2)}%]
                            {/* 当前选项的任意一票是当前用户的话，表明当前用户已经选择了该选项 */}
                            {thisOptionVoted.some(user => user.userId === userData.result.userId) ? '[✔️]' : null}
                            <div>
                                {/* 展示用户头像 */}
                                {
                                    thisOptionVoted.map(oneVote => (
                                        <img key={oneVote.userId} className='user-avatar'
                                            src={oneVote.avatar ? oneVote.avatar : `http://localhost:8081/uploads/default.jpg`}
                                            title={oneVote.name}
                                        ></img>
                                    ))
                                }
                            </div>
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}

export default forceLogin(ViewVote)