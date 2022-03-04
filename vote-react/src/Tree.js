let node = [{
    id: '1', // 节点ID
    text: 'hello world1', // 节点展示文案
    children: [{ // 节点子元素
        id: '1-1',
        text: 'hello world1-1',
        children: [{
            id: '1-1-1',
            text: 'sss'
        }],
    }]
}, {
    id: '2',
    text: 'hello world1',
}];


//  <Tree nodes={node} />
const MyCtx = React.createContext()
function Tree(props) {
    const [val, setVal] = useState('')
    const [ctxVal, setCtxVal] = useState('')
    // let nodes = props.nodes

    const onChange = useCallback((e) => {
        setVal(v => e.target.value)
    }, [])
    const onKeyUp = useCallback((e) => {
        if (e.key == 'Enter') {
            setCtxVal(v => e.target.value)
        }
    }, [])



    return (
        <div>
            <input type="text" value={val} onChange={onChange} onKeyUp={onKeyUp} />
            <MyCtx.Provider value={ctxVal}>
                <InnerTree  {...props} />
            </MyCtx.Provider>
        </div>
    )

};

function InnerTree(props) {
    let nodes = props.nodes
    if (nodes.length == 0) {
        return
    }
    return (
        <ul>
            {nodes.map(node => {
                return <MyLi key={node.id} node={node} />
            })}
        </ul>
    )
};


function MyLi(props) {
    let node = props.node
    const str = useContext(MyCtx)
    const [allow, setAllow] = useState(true) //展开

    return (
        <li>
            <div style={{ display: 'flex', backgroundColor: str === node.text ? 'skyblue' : 'white', }}>
                {node.children !== undefined
                    ? <button onClick={() => setAllow(a => !a)}>▲</button>
                    : null}
                <span>{node.text}</span>
            </div>
            <main>
                {allow && Array.isArray(node.children)
                    ? <InnerTree nodes={Array.isArray(node.children) ? node.children : []} />
                    : null}
            </main>
        </li>
    )
}

