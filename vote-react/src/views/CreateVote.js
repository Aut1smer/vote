

//提供创建投票的具体设置

import axios from "axios";
import { useCallback, useMemo } from "react"
// import { produce } from "immer"
import { useImmer } from "use-immer"; //直接修改草稿
import { useInput, useBooleanInput, forceLogin } from "../components/hooks";
import { useNavigate, useSearchParams } from "react-router-dom";
import dayjs from "dayjs";


//限制传播  vx的分享功能，分享到一个群后，就不能分享到别的群了；走session
function CreateVote({ userInfo }) {
    const title = useInput('')
    const description = useInput('')
    // const date = new Date()
    // const dateTimeStr = date.toLocaleDateString().split('/').map(it => it.padStart(2, 0)).join('-') + 'T' + date.toLocaleTimeString().slice(0, -3)
    const dateTimeStr = useMemo(() => dayjs().format('YYYY-MM-DDTHH:mm'), [])
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

    // // 判断用户登录态
    // const { data: userData, loading: userLoading, error: userError } = useUser()
    // if (userLoading) {
    //     return 'Loading..'
    // }
    // if (userError) {
    //     return <RequireLogin />
    // }
    return (
        <div>
            <div>
                <h1>创建投票</h1>
                <div><input type="text" placeholder="投票标题" {...title} /></div>
                <div><input type="text" placeholder="补充描述(选填)" {...description} /></div>

                {options.map((it, idx) => {
                    return (
                        <div key={idx}>
                            <input type="text" placeholder="选项" value={it} onChange={e => setOptionVal(idx, e.target.value)} />
                            <button tabIndex={-1} onClick={() => removeOption(idx)}>-</button>
                        </div>
                    )
                })}
                {/* <div><input type="text" placeholder="选项" /><button>-</button></div> */}


                <div><button onClick={() => setOptions(draft => { draft.push('') })}>添加选项</button></div>
            </div>
            <div>
                <ul>
                    <li><span>截止日期</span><input type="datetime-local" {...deadline} /></li>
                    <li><span>匿名投票</span><input type="checkbox"  {...anonymous} /></li>
                </ul>
            </div>
            <div><button onClick={generateVote}>完成</button></div>
        </div>
    )
}




export default forceLogin(CreateVote)