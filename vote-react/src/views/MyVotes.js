import { forceLogin } from "../components/hooks"

import { Link, useNavigate } from "react-router-dom"
import { useCallback, useMemo, useState, useRef, useContext, useEffect } from "react"
import axios from "axios"
import useSWR from "swr"
import { Pagination, Table, Tag, Space, Popconfirm, message, Popover, Modal } from 'antd'
import { ExclamationCircleOutlined } from '@ant-design/icons'
import 'antd/dist/antd.css'
import './MyVotes.css'
import { useImmer } from "use-immer"
import dayjs from 'dayjs'
import { CurMenu } from '../App'

async function fetcher(path, ...args) {
    try {
        const response = await axios.get(path) //反向代理，不用配置跨域凭证
        return response.data
    } catch (e) {
        console.log('MyVotes用户数据请求出错,', e.toJSON());
        throw e
    }
}

// 登录态下可见
function MyVotes({ userInfo, update }) {
    console.log('MyVotes发来的数据userInfo：', userInfo); // {code:0, result:{avatar,userId,name} }
    const loginUser = userInfo.result // {userId name avatar}
    //拿到该用户创建的所有票版
    // const { data, error, loading } = useAxios({ url: '/vote' }) //不需要发送用户信息过去有cookie验证
    const { data, error, mutate } = useSWR('/vote', fetcher, {
        revalidateOnReconnect: true,
        revalidateOnFocus: true,
        errorRetryCount: 3,
    })

    const navigator = useNavigate()
    const curMenuSelect = useContext(CurMenu) //Menu选择 {selected: curMenuData,  updateCurMenuData}

    //组件渲染 新建 | 我的√
    useEffect(() => {
        curMenuSelect.updateCurMenuData(['2'])
    }, [])

    // 登出 回到首页
    const logout = useCallback(() => {
        axios.get('http://localhost:8081/account/logout', {
            withCredentials: true
        }).then((res) => {
            console.log(res.data);
            update() //更新登录态 /account/cuurent-user
            // window.location.replace('http://localhost:3000')
            // window.location.reload(true)
            curMenuSelect.updateCurMenuData(['1']) // ['1']新建 ['2']我的
            navigator('/')
        }).catch(e => {
            console.log(e.toJSON());
        })

    }, [])

    //注销
    const prepareDeprecateUserAccount = useCallback(() => {
        //确定注销？
        //确认对话框
        Modal.confirm({
            title: '确认注销',
            icon: <ExclamationCircleOutlined />,
            content: '注销账户代表着您的账户将不再能够用于登录投票，您的信息将被销毁删除，确定要注销吗？',
            okType: 'danger',
            okText: '是',
            cancelText: '否',
            onOk() {
                deprecateUserAccount()
            },
            onCancel() {
                console.log('Cancel ');
            }
        });
    }, [])
    const deprecateUserAccount = useCallback(() => {
        axios.post('http://localhost:8081/account/deprecateLoginUser', {
            withCredentials: true
        })
        update() //更新登录态
        navigator('/')
    }, [])

    // 忘记密码
    const forgetPSWD = useCallback(() => {
        navigator('/forget-password')
    }, [])

    // 表格展示 分页
    //分页展示数据
    const votes = data?.result || []
    const votesRef = useRef(votes)
    votesRef.current = votes;
    const [showingVotes, setShowingVotes] = useImmer([]) //展示当前内容
    const [pageSize, setPageSize] = useState(5) //每页几条数据
    const [currentPage, setCurrentPage] = useState(1) //当前页

    //跟据swr的总数据得到用于表单展示的数据格式
    const tableData = useMemo(() => {
        console.log('tableData刷新了');
        if (!votes.length) {
            return []
        }
        let formattedVotes = votes.reverse().map(vote => {
            let canVote = Date.now() < new Date(vote.deadline).valueOf()
            let showVote = {
                key: vote.voteId,
                voteId: vote.voteId,
                name: vote.title,
                description: vote.description,
                deadline: vote.deadline,
                tags: [vote.multiple ? '多选' : '单选', vote.anonymous ? '匿名' : '公开',],
            }
            if (!canVote) {
                showVote.tags.push('已过期')
            }
            return showVote
        });
        setShowingVotes(draft => {  //格式化后的表格数据，更新到表上
            return formattedVotes.slice(0, pageSize)
        })
        return formattedVotes
    }, [votesRef.current])

    //表格列设定
    const columns = useMemo(() => {
        return [
            {
                title: '投票标题',
                dataIndex: 'name',
                key: 'name',
                render: (text, vote) => {
                    // 这里的vote指的是tableData的单项对象，text是vote[dataIndex]
                    return <Link to={`/view-vote/${vote.voteId}`}>{text}</Link>
                }
            },
            {
                title: '描述',
                dataIndex: 'description',
                key: 'description',
            },
            {
                title: '截止日期',
                dataIndex: 'deadline',
                key: 'deadline',
                render: (text, vote) => (
                    <>
                        {dayjs(vote.deadline).format('YYYY年MM月DD日 HH:mm')}
                    </>
                )
            },
            {
                title: '状态',
                dataIndex: 'tags',
                key: 'tags',
                render: tags => (
                    <>
                        {tags.map(tag => {
                            let color
                            switch (tag) {
                                case '已过期':
                                    color = '#F7711C'; break;
                                case '多选':
                                    color = 'geekblue'; break;
                                case '单选':
                                    color = 'blue'; break;
                                case '匿名':
                                    color = 'red'; break;
                                case '公开':
                                    color = 'orange'; break;
                                default:
                                    color = 'black'; break;
                            }
                            return (
                                <Tag color={color} key={tag}>{tag}</Tag>
                            )
                        })}
                    </>
                )
            },
            {
                title: '操作',
                key: 'action',
                render: (text, vote) => (
                    <Space size="middle">
                        <Link to={`/view-vote/${vote.voteId}`}>查看</Link>
                        <Popconfirm title="删除此投票？"
                            onConfirm={() => { confirmDeleteVote(vote.voteId) }}
                            okText="是"
                            cancelText="否"
                        >
                            <a>删除</a>
                        </Popconfirm>
                    </Space>
                )
            }
        ]
    }, [])



    //删除投票
    const confirmDeleteVote = useCallback(async (deletedId) => {
        mutate({ code: 0, result: votesRef.current.filter(vote => vote.voteId != deletedId) }, false); //立即更新本地局部突变，禁用重新验证
        setShowingVotes(draft => {
            return draft.filter(it => it.voteId != deletedId)
        })
        message.success('删除成功') //全局提示
        //★跨域请求，这里需要改动
        await axios.delete(`http://localhost:8081/vote/${deletedId}`, {
            withCredentials: true
        })
        mutate() //重新验证，以保证本地数据与数据库一致
        console.log('确定删除投票，执行删除,删除的VoteId为 ', deletedId);
    }, [])



    //分页器事件触发，改动显示内容
    const setCurrentContent = (page, newpageSize) => { //onChange触发改变当前页内容
        setShowingVotes(draft => {
            //(page - 1) * pageSize ~ page * pageSize
            let start = (page - 1) * newpageSize
            return tableData.slice(start, start + newpageSize)
        })
        setCurrentPage(page)
        if (pageSize != newpageSize) { //单页展示数量改变
            setPageSize(newpageSize)
        }
    }

    // 用户头像部分
    const getTime = useCallback(() => {
        let cur = new Date().getHours()
        if (cur >= 19) {
            return '晚上好'
        } else if (cur <= 6) {
            return '夜深了，早点休息'
        } else if (cur > 6 && cur < 12) {
            return '上午好'
        } else if (cur >= 12 && cur <= 14) {
            return '中午好'
        } else {
            return '下午好'
        }
    }, [])

    if (error || !data) return 'Loading..'
    //  if(error) //出错的话，登录态下只可能是用户的网络问题；即用户创建的票版的请求挂掉
    console.log('登录态下的用户请求私有票版数据', data);

    //渲染视图
    return (
        <div className="myVotes">
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'stretch' }}>
                {/* flex布局 左右栏 */}
                <div>{getTime()}^^, {loginUser.name}</div>
                <div>
                    <Popover placement="leftTop" content={
                        <div className="popover">
                            <div onClick={logout}>登出</div>
                            <div onClick={prepareDeprecateUserAccount}>注销用户</div>
                            <div onClick={forgetPSWD}>忘记密码?</div>
                            {/* <Button size="default" shape="round" type="primary" onClick={logout}>登出</Button>
                            <Button onClick={prepareDeprecateUserAccount}>注销</Button> */}
                        </div>
                    }>
                        <img style={{ width: 32, height: 32, borderRadius: '50%', cursor: 'pointer' }} src={loginUser.avatar} />
                    </Popover>
                </div>
            </header>

            <main>
                <div>
                    <Table loading={!data || data.code != 0} columns={columns} dataSource={showingVotes} pagination={false} />
                </div>
                <hr />
                <div>
                    <Pagination size="small" total={votes.length} showSizeChanger showQuickJumper
                        defaultCurrent={1} pageSizeOptions={[5, 10, 20, 50]}
                        current={currentPage} pageSize={pageSize} onChange={setCurrentContent}
                    />
                </div>
            </main>
        </div>
    )
}



export default forceLogin(MyVotes)