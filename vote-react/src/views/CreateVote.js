

//提供创建投票的具体设置

import axios from "axios";
import { useCallback, useMemo } from "react"
// import { produce } from "immer"
import { useImmer } from "use-immer"; //相当于useState直接修改草稿
import { useInput, useBooleanInput, forceLogin } from "../components/hooks";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Input, Button, Switch, DatePicker, BackTop } from "antd";
import { CloseOutlined, CheckOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import dayjs from "dayjs";
import './CreateVote.css'

//限制传播  vx的分享功能，分享到一个群后，就不能分享到别的群了；走session
function CreateVote({ userInfo }) {
    const title = useInput('')
    const description = useInput('')
    // const date = new Date()
    // const dateTimeStr = date.toLocaleDateString().split('/').map(it => it.padStart(2, 0)).join('-') + 'T' + date.toLocaleTimeString().slice(0, -3)
    const dateTimeStr = useMemo(() => dayjs().add(30, 'minute').format('YYYY-MM-DDTHH:mm'), [])
    const deadline = useInput(dateTimeStr)
    // const deadline = useInput();
    const anonymous = useBooleanInput(false)
    const [options, setOptions] = useImmer(['', '']);
    const removeOption = useCallback(function removeOption(key) {
        setOptions(draft => {
            draft.splice(key, 1)
        })
    }, [])

    const setOptionVal = useCallback(function setOptionVal(idx, val) {
        setOptions(draft => {
            draft[idx] = val
        })
    }, [])

    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams();
    //生成投票并跳转到该页面
    const generateVote = async function (e) {
        const vote = {
            title: title.value,
            description: description.value,
            deadline: deadline.value,
            anonymous: anonymous.checked,
            multiple: searchParams.get('multiple') ? true : false, //单多选
            options: options,
        }
        console.log('vote setting: ', vote);
        if (vote.deadline <= dateTimeStr) {
            alert('Please input valid deadline!')
            return
        }
        try {
            const response = await axios.post('/vote', vote)
            const result = response.data.result  //创建好的投票信息 {...创建者, 投票ID}
            console.log('返回的响应信息', result);
            navigate(`/view-vote/${result.voteId}`) //跳转投票页面
        } catch (e) {
            if (e.response) {
                throw e.response.data
            }
            throw e
        }
    }
    const backHome = useCallback(() => {
        navigate('/')
    }, [])


    // // 判断用户登录态
    // const { data: userData, loading: userLoading, error: userError } = useUser()
    // if (userLoading) {
    //     return 'Loading..'
    // }
    // if (userError) {
    //     return <RequireLogin />
    // }
    return (
        <div className="createVote">
            <header>
                <h1>创建{searchParams.get('multiple') == 1 ? '多选' : '单选'}投票</h1>
                <Button type="primary" onClick={backHome}><ArrowLeftOutlined /></Button>
            </header>
            <main>
                <section>
                    <div><Input type="text" placeholder="投票标题" {...title} className="voteTitle" /></div>
                    <div><Input type="text" placeholder="补充描述(选填)" {...description} className="voteDescription" /></div>
                    <div className="options">
                        {options.map((it, idx) => {
                            return (
                                <div key={idx}>
                                    <Input type="text" addonAfter={<div className="deleteOpt" tabIndex={-1} onClick={() => removeOption(idx)}>
                                        <CloseOutlined />
                                    </div>}
                                        placeholder="选项" value={it} onChange={e => setOptionVal(idx, e.target.value)} />

                                </div>
                            )
                        })}
                    </div>
                    {/* <div><input type="text" placeholder="选项" /><button>-</button></div> */}


                    <div><Button onClick={() => setOptions(draft => { draft.push('') })}>添加选项</Button></div>
                </section>
                <section>
                    <div>
                        <span>截止日期</span>
                        <input type="datetime-local" {...deadline} className="timeInput" />
                    </div>
                    <div>
                        <span>匿名投票</span>
                        <Switch size="big" checkedChildren={<CheckOutlined />} unCheckedChildren={<CloseOutlined />} {...anonymous} />
                    </div>
                </section>
            </main>
            <footer>
                <Button onClick={() => { navigate('/') }}>取消</Button>
                <Button type="primary" onClick={generateVote}>完成</Button>
            </footer>
            <BackTop />
        </div>
    )
}




export default forceLogin(CreateVote)