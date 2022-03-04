import { useCallback, useContext, useEffect, useMemo, useState } from "react"
import axios from "axios"
import { UserContext } from "../views/CurrentUserInfo"
import RequireLogin from "../views/RequireLogin"

export function useInput(initVal = '', predicate = null) {
    const [val, setVal] = useState(initVal)

    const onChange = useCallback(function onChange(e) {
        setVal(val => e.target.value)
    }, [predicate])

    return useMemo(() => ({
        value: val,
        onChange
    }), [val, predicate])
}


export function useBooleanInput(initVal = false, predicate = null) {
    const [checked, setChecked] = useState(initVal)

    const onChange = useCallback(function (e) {
        setChecked(checked => !checked)
    }, [predicate])

    return useMemo(() => ({
        checked,
        onChange
    }), [checked, predicate])
}


export function useAxios(config, listenChanger = '') {
    const [data, setData] = useState() //用来存放请求结果
    const [loading, setLoading] = useState(true) //是否还在加载中
    const [error, setError] = useState() //存放错误
    const [shouldUpdate, setUpdate] = useState(0) //计数满足更新要求

    // useEffect是浏览器渲染可视化完组件后执行，它是异步的不会阻塞渲染
    // useLayoutEffect是浏览器即将渲染时执行，它是同步的与componentDidMount时机一致，会阻塞渲染，但也防止了首屏闪烁
    useEffect(() => {
        const controller = new AbortController()
        const req = axios({
            ...config,
            signal: controller.signal
        }).then(res => {
            console.log('响应头', res);
            if (res.data.code === -1) {
                throw new Error('code -1, axios faild')
            }
            setData(d => res.data)
            setError(null)
            setLoading(l => false)
        }).catch(err => {
            setError(e => err)
            setLoading(l => false)
        })
        return () => {
            controller.abort()
        }
    }, [config.url, listenChanger, shouldUpdate])

    const update = useCallback(() => {
        //希望调用后触发重新请求数据
        setLoading(l => true)
        setUpdate(c => c + 1) //卸载旧Effect以重新发送请求（希望得到新的数据）
    }, [])

    return { data, loading, error, update }
}


// 拿到当前登录用户的业务hook,从context里拿即可，每个组件都不用再发送请求直接拿到数据即可
export function useUser() {
    const user = useContext(UserContext)
    return user //请求出错 || 响应4xx 都会使user.error有值
}




// 强制登录的高阶组件，用它包裹的组件必须登录才能显示
export function forceLogin(Comp) {
    function ForceLoginComp(props) {
        const userInfo = useUser()
        if (userInfo.loading) {
            return null
        }
        if (userInfo.error) {
            //仅考虑了请求出错
            return <RequireLogin />
        }
        return <Comp {...props} userInfo={userInfo.data} />
    }
    ForceLoginComp.displayName = 'ForceLogin ' + (Comp.displayName ?? Comp.name)
    return ForceLoginComp
}