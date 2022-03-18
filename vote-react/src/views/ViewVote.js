
//查看投票面板 实时投票

import { useParams, useNavigate } from "react-router-dom"
import axios from "axios"
import { useEffect, useState, useMemo, useCallback } from "react"
import { useAxios, forceLogin } from "../components/hooks"
import _ from 'lodash'
import './ViewVote.css'
import dayjs from "dayjs"
import { useImmer } from "use-immer"
import { message, Spin, Button, Modal, List, Tag } from "antd"
import { LoadingOutlined, ArrowLeftOutlined, SelectOutlined, SmileOutlined, ProfileOutlined } from '@ant-design/icons'

/**
 * 投票页面的信息是实时更新的
 * 1. 客户端不断轮询
 * 2. comet：在客户端开个线程，请求没收到信息则保持长连接，收到消息则继续请求轮询。
 * 服务器没有数据返回则hold住该连接，直到有信息要发回去就结束该连接。
 * 
 * 3.websocket，保持一个长链接，服务器有新消息主动发到客户端
 *
 */

function ViewVote({ userInfo: userData }) { //高阶传来的userInfo
    const navigator = useNavigate()
    // 数据部分
    const userId = userData.result.userId //登录态的用户ID
    const { voteId } = useParams()
    // const { data: userData, loading: userLoading, error: userError } = useUser() //拿到登录用户个人信息
    const { data, loading, error } = useAxios({ //自封装useAxios，发送请求解得票版数据，会被ws来的新数据给冲下去
        url: 'https://vote.nekoda.cn/vote/' + voteId,
        method: 'GET'
    }, voteId)
    const [userVotes, setUserVotes] = useState() //记录从ws上获取的最新信息

    const [selectedOptionIds, setSelectedOptionIds] = useImmer([]) //选中的项 匿名有效

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


    // {voteId,userId,title,..,options[{optionId,content,voteId}],userVotes[{optionId,avatar,userId,name}]}
    let vote = data?.result ?? {} // 首次请求的票版全部内容
    // console.log('vote', vote);
    let thisPageUserVotes = (userVotes ?? vote.userVotes) || [] //即vote.userVotes [{optionId, avatar, userId, name}]
    // console.log('thisPageUserVotes', thisPageUserVotes);
    let groupedVotes = useMemo(() => _.groupBy(thisPageUserVotes, 'optionId'), [thisPageUserVotes])//按optionId分组的投票人信息
    let uniqueUsers = useMemo(() => _.uniqBy(thisPageUserVotes, 'userId'), [thisPageUserVotes]) //得到去重后的所有投票人
    let totalUsers = uniqueUsers.length; //投票人数量
    console.log('<ViewVote>下groupedVotes分组后的投票人数据', groupedVotes);
    // console.log('totalUsers去重后的总投票人数:', totalUsers);

    //查验票版是否过期
    const hasExpired = useMemo(() => {
        return dayjs(vote.deadline).isBefore(Date.now())
    }, [voteId, loading])

    //跟据匿名 || 非匿名  ==> 选中操作 || 投票操作
    const handleOptionClick = (option) => {
        // debugger
        if (vote.anonymous) {
            //跟据服务器发来的已投信息包不包括登录态用户，来确定匿名的投票权
            if (thisPageUserVotes.some(opration => opration.userId === userId) || hasExpired) {
                //匿名已投或时效过了，禁用按钮状态下不允许再执行选择或投票
                return
            }
            selectOption(option, vote.multiple) //匿名选中
        } else {
            voteOption(option) //公开投票
        }
    }

    // 为 某个选项 投票/取消投票. 发送请求到后端，后端主动发送信息到ws上
    async function voteOption(option) {
        // debugger;
        if (hasExpired) { // 校验投票
            message.error('投票已过期')
            return
        }
        if (!vote.anonymous) { //公开：单选扔掉之前的，设置新的；多选直接设置。点击选项触发
            const { optionId } = option
            try {
                await axios.post(`/vote/${voteId}`, {
                    optionIds: [optionId]
                })
            } catch (e) { //网络错误 || 用户未登录 || 票版不存在 || 超时 || 
                message.error('操作非法')
                // console.log(e.toJSON()); //后端返回的各种错误
            }
        } else { //匿名：无论单选多选，发选中的项目给后端，按钮触发结束投票
            try {
                await axios.post(`https://vote.nekoda.cn/vote/${voteId}`, {
                    optionIds: selectedOptionIds
                })
            } catch (e) {
                message.error('操作非法')
            }
            setSelectedOptionIds(draft => [])
        }
    }

    // 选中某个选项 || 取消选中某个选项
    function selectOption(option, multiple) {
        // debugger;
        const optionId = option.optionId
        let idx = selectedOptionIds.indexOf(optionId)
        if (multiple) { //多选下可多选
            if (idx === -1) {
                setSelectedOptionIds(draft => {
                    draft.push(optionId)
                })
            } else {
                setSelectedOptionIds(draft => {
                    draft.splice(idx, 1)
                })
            }
        } else { //单选下只允许选中一项
            console.log('选了一项::', optionId);
            setSelectedOptionIds(draft => {
                return [optionId]
            })
            console.log('selectedOptionIds:::', selectedOptionIds);
        }
    }

    //帮助
    const [isModalVisible, setIsModalVisible] = useState(false)
    const showHelp = useCallback(() => {
        setIsModalVisible(true)
    }, [])
    const closeHelp = useCallback(() => {
        setIsModalVisible(false)
    }, [])
    const helpData = useMemo(() => ([{
        title: '单选/多选',
        description: '单选投票，点击投票框即可投票；多选投票，公开下可任意多选，匿名需点击确认。'
    }, {
        title: '公开/匿名',
        description: '公开投票将公开所有参与者的头像与名称，每人拥有多次投票机会；匿名投票下参与者信息将只对创建者可见，每人仅有一次投票机会。'
    }, {
        title: '分享链接',
        description: <>点击按钮{'     '}
            <Button type="primary" style={{ borderRadius: '50%' }} title="点击分享" icon={<SelectOutlined />} />
            {'     '}即可复制该页投票，祝您工作顺利！</>
    }]), [])

    //跳转我的 <-
    const goMyVotes = useCallback(() => {
        navigator('/myVotes')
    }, [])
    const goBack = useCallback(() => {
        navigator(-1)
    }, [])

    //投票状态颜色
    const getTagColor = (type) => {
        if (type === 'multiple') {
            if (vote.multiple) {
                return 'geekblue'
            } else {
                return 'blue'
            }
        } else if (type === 'anonymous') {
            if (vote.anonymous) {
                return 'red'
            } else {
                return 'orange'
            }
        } else if (type === 'deadline') { //已过期的
            return '#F7711C'
        }
        return 'black'
    }

    //复制链接到剪贴板里
    const shareLink = useCallback(() => {
        const el = document.createElement('textarea')
        el.value = 'http://vote.nekoda.cn/view-vote/' + voteId
        el.setAttribute('readonly', '')
        el.style.position = 'absolute'
        el.style.left = '-9999px'
        document.body.append(el)
        el.select()
        document.execCommand('copy')
        document.body.removeChild(el)
        message.success('成功复制链接')
    }, [voteId])

    // 显示头像/名字
    const [showAvatar, setShowAvatar] = useState(true)
    const toggleAvatar = useCallback(() => {
        setShowAvatar(s => !s)
    }, [])

    //首次票版请求未完成
    if (loading) {
        return (<div className="viewVoteSpin">
            <Spin indicator={<LoadingOutlined />} />
        </div>)
    }
    if (error instanceof Error) {
        console.log('<viewvote>组件发生axios请求错误：', error);
        message.error('加载出错,请检查您的网络')
        // throw error //★ 网络错误展示
    }


    return (
        <div className="viewVotes">
            <header>
                <h1>查看投票</h1>
                <div>
                    <Button onClick={showHelp}>帮助</Button>
                    <Button onClick={goMyVotes}>我的</Button>
                    <Button type="primary" onClick={goBack}><ArrowLeftOutlined /></Button>
                </div>
            </header>
            {/* 列表 */}
            <main>
                <List header={
                    <header className="listheader">
                        <section>
                            <h2 title={vote.description}>{vote.title}</h2>
                            <div>[描述]:  {vote.description}</div>
                            <div className="voteTag">
                                <Tag color={getTagColor("multiple")}>{vote.multiple ? '多选' : '单选'}</Tag>
                                <Tag color={getTagColor("anonymous")}>{vote.anonymous ? '匿名' : '公开'}</Tag>
                                {hasExpired ? <Tag color={getTagColor("deadline")}>{'已过期'}</Tag> : null}
                            </div>
                        </section>
                        <aside>
                            <Button type={showAvatar ? "primary" : ""} icon={showAvatar ? <SmileOutlined /> : <ProfileOutlined />} onClick={toggleAvatar} />
                            <Button type="primary" onClick={shareLink} title="点击分享" icon={<SelectOutlined />} />
                        </aside>
                    </header>}
                    dataSource={vote.options} bordered itemLayout="vertical"
                    renderItem={(option) => { //option: {voteId, optionId, content}
                        let thisOptionVoted = groupedVotes[option.optionId] || [] // {optionId,name,avatar,userId}选择了该选项的用户
                        return (<List.Item key={option.optionId} onClick={() => handleOptionClick(option)} className="listItem">
                            <div>
                                <article>[{option.content}]</article>
                                <aside>
                                    {/* 当前选项的任意一票是当前用户的话，表明当前用户已经选择了该选项 */}
                                    {(thisOptionVoted.some(user => user.userId === userId) ||
                                        selectedOptionIds.includes(option.optionId))
                                        ? '[✔️]'
                                        : null
                                    }
                                    <span>[{thisOptionVoted.length}票]</span>
                                    <span>[{totalUsers == 0 ? 0 : (thisOptionVoted.length * 100 / totalUsers).toFixed(2)}%]</span>
                                </aside>
                            </div>
                            {thisOptionVoted.length == 0 ? null : <div className="votedUsers">
                                {
                                    thisOptionVoted.map((oneVote, idx) => (
                                        showAvatar ? <img key={idx} style={{ width: 32, height: 32 }} className='user-avatar' title={oneVote.name || ''}
                                            src={oneVote.avatar ? `https://vote.nekoda.cn${oneVote.avatar}` : 'http://vote.nekoda.cn/uploads/default.jpg'} />
                                            : <span> {oneVote.name ?? '匿名'} </span>
                                    ))
                                }
                            </div>}
                        </List.Item>)
                    }}
                />
            </main>
            <footer>
                <p>投票截至：{dayjs(vote.deadline).format('YYYY-MM-DD HH:mm')}</p>
                {/* 匿名且当前用户没投过、且在有效时间内，才显示按钮确定投票 */}
                {!!vote.anonymous && !hasExpired &&
                    !thisPageUserVotes.some(opration => opration.userId == userId)
                    && <Button type="primary" disabled={!selectedOptionIds.length} onClick={voteOption}>确定投票</Button>
                }
            </footer>

            {/* 模态帮助框 */}
            <Modal title="投票帮助" visible={isModalVisible} onOk={closeHelp} onCancel={closeHelp} centered={true}>
                <List
                    itemLayout="vertical"
                    dataSource={helpData}
                    renderItem={(item, idx) => (
                        <List.Item key={idx}>
                            <List.Item.Meta title={item.title} description={item.description} />
                        </List.Item>
                    )}
                />
            </Modal>
        </div>
    )
}







export default forceLogin(ViewVote)