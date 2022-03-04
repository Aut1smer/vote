import React, { useCallback, useContext, useEffect, useState } from "react";

// hooks
function Toast(val) {
    if (typeof val !== 'object' && typeof val !== 'string') {
        throw new TypeError('type error')
    }
    let img = typeof val == 'object' ? val.img : null
    let text = typeof val == 'object' ? val.text : val
    const [info, setInfo] = useState({ img, text })
    const [count, setCount] = useState(0)
    useEffect(() => {
        setCount(c => c + 1)
    })
    useEffect(() => {
        setInfo(o => { img, text })
    }, [info.img, info.text])
    return (
        (count & 1) === 1
            ? <div style={{ position: 'fixed', top: 0, bottom: 0, left: 0, right: 0, margin: 'auto' }}>
                <img src={info.img} alt="" />
                <div>{info.text}</div>
            </div>
            : null
    )
}




let node = [{
    id: '1', // 节点ID
    text: 'hello world', // 节点展示文案
    children: [{ // 节点子元素
        id: '1-1',
        text: 'hello world',
        children: [{
            // ...
        }],
    }]
}, {
    id: '2',
    text: 'hello world',
}];



//  <Tree nodes={node} />
function Tree(props) {
    const [val, setVal] = useState('')
    const [ctxVal, setCtxVal] = useState('')
    const ctx = React.createContext()
    function innerTree(props) {
        let nodes = props.nodes
        let str = useContext(ctx)
        return (
            <div>
                <ul>
                    {nodes.map(node => {
                        return (
                            <li key={node.id} style={{
                                backgroundColor: str === node.text ? 'skyblue' : 'white',
                                marginLeft: 20,
                            }}>
                                <header>{node.children ? <button>▲</button> : null}
                                    <h3>{node.text}</h3>
                                </header>
                                <main>
                                    {node.children ? <innerTree nodes={React.Children.toArray(node.children)} /> : null}
                                </main>
                            </li>
                        )
                    })}
                </ul>
            </div>
        )
    }
    const onChange = useCallback((e) => {
        setVal(v => e.target.value)
    }, [])
    const onKeyUp = useCallback((e) => {
        if (e.key == 'Enter') {
            setCtxVal(v => e.target.value)
        }
    }, [])

    return React.forwardRef((props, ref) => {
        return (
            <div>
                <input type="search" value={val} onChange={onChange} onKeyUp={onKeyUp} />
                <ctx.Provider value={ctxVal}>
                    <innerTree  {...props} ref={ref} />
                </ctx.Provider>
            </div>
        )

    })
}